import type { AccountConfig } from './config.js';

const SERVICE_NAME = 'io.github.elmissouri16.search-console-mcp';
const LEGACY_SERVICE_NAME = 'io.github.saurabhsharma2u.search-console-mcp';

export type CredentialKind = 'google-oauth' | 'bing-api';

function accountKey(account: AccountConfig, kind: CredentialKind): string {
    return `${kind}:${account.id}`;
}

async function keyringEntry(service: string, account: string) {
    const { Entry } = await import('@napi-rs/keyring');
    return new Entry(service, account);
}

function minimalGoogleCredential(secret: string): string {
    let parsed: { refresh_token?: string; expiry_date?: number };
    try {
        parsed = JSON.parse(secret);
    } catch {
        throw new Error('Stored Google OAuth credential is not valid JSON.');
    }
    if (!parsed.refresh_token) {
        throw new Error('Stored Google OAuth credential has no refresh token; re-authorize the account.');
    }
    return JSON.stringify({
        refresh_token: parsed.refresh_token,
        expiry_date: parsed.expiry_date,
    });
}

/**
 * Read a credential from the OS keychain. Google OAuth credentials created by
 * upstream releases are migrated from the former service/alias key on access.
 */
export async function readCredential(
    account: AccountConfig,
    kind: CredentialKind
): Promise<string | null> {
    const current = await keyringEntry(SERVICE_NAME, accountKey(account, kind));
    const secret = await current.getPassword();
    if (secret) {
        if (kind !== 'google-oauth') return secret;
        const minimal = minimalGoogleCredential(secret);
        if (minimal !== secret) await current.setPassword(minimal);
        return minimal;
    }

    if (kind !== 'google-oauth') return null;

    const legacy = await keyringEntry(LEGACY_SERVICE_NAME, account.alias);
    const legacySecret = await legacy.getPassword();
    if (!legacySecret) return null;

    const minimal = minimalGoogleCredential(legacySecret);
    await current.setPassword(minimal);
    await legacy.deletePassword();
    return minimal;
}

export async function writeCredential(
    account: AccountConfig,
    kind: CredentialKind,
    secret: string
): Promise<void> {
    const entry = await keyringEntry(SERVICE_NAME, accountKey(account, kind));
    await entry.setPassword(secret);
}

export async function deleteStoredCredentials(account: AccountConfig): Promise<void> {
    const descriptors = [
        [SERVICE_NAME, accountKey(account, 'google-oauth')],
        [SERVICE_NAME, accountKey(account, 'bing-api')],
        [LEGACY_SERVICE_NAME, account.alias],
    ];

    await Promise.all(descriptors.map(async ([service, key]) => {
        try {
            const entry = await keyringEntry(service, key);
            await entry.deletePassword();
        } catch {
            // Deletion is idempotent; a keychain or entry may not be available.
        }
    }));
}
