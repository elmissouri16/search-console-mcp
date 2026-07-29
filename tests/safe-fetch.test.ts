import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPublicHtml, validatePublicHttpsUrl } from '../src/common/utils/safe-fetch.js';

const { lookupMock } = vi.hoisted(() => ({ lookupMock: vi.fn() }));

vi.mock('dns/promises', () => ({
    lookup: lookupMock,
}));

describe('safe public URL fetching', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        lookupMock.mockReset().mockResolvedValue([
            { address: '93.184.216.34', family: 4 },
        ]);
    });

    it('rejects non-HTTPS URLs before fetching', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch');
        await expect(fetchPublicHtml('http://example.com')).rejects.toThrow('Only HTTPS');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('rejects literal private addresses', async () => {
        await expect(validatePublicHttpsUrl('https://127.0.0.1/admin')).rejects.toThrow(
            'private, local, reserved'
        );
    });

    it('rejects hostnames that resolve to private addresses', async () => {
        lookupMock.mockResolvedValue([{ address: '10.0.0.7', family: 4 }]);
        await expect(validatePublicHttpsUrl('https://example.com')).rejects.toThrow(
            'private, local, reserved'
        );
    });

    it('validates redirect targets before following them', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
            ok: false,
            status: 302,
            headers: new Headers({ location: 'https://127.0.0.1/secret' }),
        } as Response);

        await expect(fetchPublicHtml('https://example.com')).rejects.toThrow(
            'private, local, reserved'
        );
        expect(fetchSpy).toHaveBeenCalledOnce();
    });

    it('rejects responses larger than the configured limit', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-length': String(2 * 1024 * 1024 + 1) }),
            body: null,
            text: async () => '',
        } as unknown as Response);

        await expect(fetchPublicHtml('https://example.com')).rejects.toThrow('Response exceeds');
    });
});
