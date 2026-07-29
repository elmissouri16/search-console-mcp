import { lookup } from 'dns/promises';
import { BlockList, isIP } from 'net';

const MAX_REDIRECTS = 3;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;

const blockedNetworks = new BlockList();

for (const [network, prefix] of [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.0.2.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['198.51.100.0', 24],
    ['203.0.113.0', 24],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4],
] as const) {
    blockedNetworks.addSubnet(network, prefix, 'ipv4');
}

for (const [network, prefix] of [
    ['::', 128],
    ['::1', 128],
    ['fc00::', 7],
    ['fe80::', 10],
    ['ff00::', 8],
    ['2001:db8::', 32],
] as const) {
    blockedNetworks.addSubnet(network, prefix, 'ipv6');
}

function isBlockedAddress(address: string): boolean {
    const mappedIpv4 = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
    if (mappedIpv4) return blockedNetworks.check(mappedIpv4, 'ipv4');

    const family = isIP(address);
    if (family === 4) return blockedNetworks.check(address, 'ipv4');
    if (family === 6) return blockedNetworks.check(address, 'ipv6');
    return true;
}

export async function validatePublicHttpsUrl(input: string): Promise<URL> {
    let url: URL;
    try {
        url = new URL(input);
    } catch {
        throw new Error('URL must be a valid absolute HTTPS URL.');
    }

    if (url.protocol !== 'https:') {
        throw new Error('Only HTTPS URLs are allowed.');
    }
    if (url.username || url.password) {
        throw new Error('URLs containing embedded credentials are not allowed.');
    }

    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    if (
        hostname === 'localhost' ||
        hostname.endsWith('.localhost') ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal') ||
        hostname.endsWith('.home.arpa')
    ) {
        throw new Error('Local and internal hostnames are not allowed.');
    }

    const literalFamily = isIP(hostname);
    const addresses = literalFamily
        ? [{ address: hostname }]
        : await lookup(hostname, { all: true, verbatim: true });

    if (addresses.length === 0 || addresses.some(({ address }) => isBlockedAddress(address))) {
        throw new Error('The URL resolves to a private, local, reserved, or non-routable address.');
    }

    return url;
}

async function readLimitedText(response: Response): Promise<string> {
    const contentLength = Number(response.headers?.get?.('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
        throw new Error(`Response exceeds the ${MAX_RESPONSE_BYTES}-byte limit.`);
    }

    if (!response.body?.getReader) {
        const text = await response.text();
        if (Buffer.byteLength(text, 'utf8') > MAX_RESPONSE_BYTES) {
            throw new Error(`Response exceeds the ${MAX_RESPONSE_BYTES}-byte limit.`);
        }
        return text;
    }

    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let total = 0;

    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_RESPONSE_BYTES) {
            await reader.cancel();
            throw new Error(`Response exceeds the ${MAX_RESPONSE_BYTES}-byte limit.`);
        }
        chunks.push(Buffer.from(value));
    }

    return Buffer.concat(chunks).toString('utf8');
}

export async function fetchPublicHtml(input: string): Promise<string> {
    let current = await validatePublicHttpsUrl(input);

    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        let response: Response;
        try {
            response = await fetch(current, {
                redirect: 'manual',
                signal: controller.signal,
                headers: {
                    'Accept': 'text/html,application/xhtml+xml;q=0.9',
                    'User-Agent': 'search-console-mcp-security-fork/1.0',
                },
            });
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms.`);
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }

        if ([301, 302, 303, 307, 308].includes(response.status)) {
            if (redirects === MAX_REDIRECTS) throw new Error('Too many redirects.');
            const location = response.headers.get('location');
            if (!location) throw new Error('Redirect response is missing a Location header.');
            current = await validatePublicHttpsUrl(new URL(location, current).toString());
            continue;
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }

        return readLimitedText(response);
    }

    throw new Error('Too many redirects.');
}
