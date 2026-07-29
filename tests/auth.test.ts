import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadTokensForAccount, saveTokensForAccount, logout, getUserEmail } from '../src/google/client.js';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { AccountConfig } from '../src/common/auth/config.js';

// Mock fs
vi.mock('fs', () => ({
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
}));

// Mock node-machine-id
vi.mock('node-machine-id', () => ({
    default: {
        machineIdSync: vi.fn(() => 'test-machine-id'),
    }
}));

// Mock common/auth/config.js to avoid encryption issues in these tests
vi.mock('../src/common/auth/config.js', async () => {
    const actual = await vi.importActual('../src/common/auth/config.js');
    return {
        ...actual as any,
        loadConfig: vi.fn().mockResolvedValue({ accounts: {} }),
        updateAccount: vi.fn().mockResolvedValue(undefined),
        removeAccount: vi.fn().mockResolvedValue(undefined),
        cleanupMigratedLegacyTokenFiles: vi.fn().mockResolvedValue(undefined),
    };
});

// Mock @napi-rs/keyring
const mockDeletePassword = vi.fn();
const mockGetPassword = vi.fn();
const mockSetPassword = vi.fn();

vi.mock('@napi-rs/keyring', () => ({
    Entry: function () {
        return {
            deletePassword: mockDeletePassword,
            getPassword: mockGetPassword,
            setPassword: mockSetPassword,
        };
    },
}));

// Mock googleapis
const mockSetCredentials = vi.fn();
const mockUserInfoGet = vi.fn().mockResolvedValue({ data: { email: 'test@example.com' } });

vi.mock('googleapis', () => {
    return {
        google: {
            auth: {
                OAuth2: function () {
                    return {
                        setCredentials: mockSetCredentials,
                    };
                },
            },
            oauth2: vi.fn().mockImplementation(() => ({
                userinfo: {
                    get: mockUserInfoGet,
                },
            })),
            searchconsole: vi.fn(),
        },
    };
});

describe('Authentication & Security (Multi-Account)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetPassword.mockReset().mockResolvedValue(null);
        mockSetPassword.mockReset().mockResolvedValue(undefined);
        process.env.GOOGLE_CLIENT_ID = 'test-client-id';
        process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    });

    const mockAccount: AccountConfig = {
        id: 'google_test',
        engine: 'google',
        alias: 'test@example.com'
    };

    it('should save tokens to keychain and update config', async () => {
        const tokens = { refresh_token: 'test-refresh', expiry_date: 12345 };

        await saveTokensForAccount(mockAccount, tokens);

        // Check Keychain
        expect(mockSetPassword).toHaveBeenCalled();
        const callValue = mockSetPassword.mock.calls[0][0];
        expect(JSON.parse(callValue)).toMatchObject({ refresh_token: 'test-refresh' });

        // Check that config update was called
        const { updateAccount } = await import('../src/common/auth/config.js');
        expect(updateAccount).toHaveBeenCalledWith(expect.objectContaining({ id: 'google_test' }));
        expect(vi.mocked(updateAccount).mock.calls[0][0].tokens).toBeUndefined();
    });

    it('should load tokens from keychain if available', async () => {
        const tokens = { refresh_token: 'keychain-refresh', access_token: 'do-not-persist' };
        mockGetPassword.mockResolvedValue(JSON.stringify(tokens));

        const result = await loadTokensForAccount(mockAccount);

        expect(result).toMatchObject({ refresh_token: 'keychain-refresh' });
        expect(result.access_token).toBeUndefined();
        expect(mockSetPassword).toHaveBeenCalledWith(
            expect.not.stringContaining('do-not-persist')
        );
        expect(mockGetPassword).toHaveBeenCalled();
    });

    it('should migrate legacy config tokens into the keychain', async () => {
        mockGetPassword.mockRejectedValue(new Error('Keychain error'));

        const accountWithTokens: AccountConfig = {
            ...mockAccount,
            tokens: { refresh_token: 'config-refresh' }
        };

        const result = await loadTokensForAccount(accountWithTokens);
        expect(result).toMatchObject({ refresh_token: 'config-refresh' });
        expect(mockSetPassword).toHaveBeenCalledWith(expect.stringContaining('config-refresh'));
        expect(accountWithTokens.tokens).toBeUndefined();
    });

    it('should delete tokens on logout', async () => {
        const { removeAccount } = await import('../src/common/auth/config.js');

        await logout('google_test');

        expect(removeAccount).toHaveBeenCalledWith('google_test');
    });

    it('should fetch user email', async () => {
        const email = await getUserEmail({ access_token: 'abc' });
        expect(email).toBe('test@example.com');
    });
});
