import { google, searchconsole_v1 } from 'googleapis';
import {
  AccountConfig,
  cleanupMigratedLegacyTokenFiles,
  loadConfig,
  updateAccount,
  removeAccount
} from '../common/auth/config.js';
import { resolveAccount } from '../common/auth/resolver.js';
import { readCredential, writeCredential } from '../common/auth/credential-store.js';
import { logger } from '../utils/logger.js';
import { randomBytes, timingSafeEqual } from 'crypto';

const SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/userinfo.email'
];
const DEFAULT_ACCOUNT = 'default';

// Fork builds require a user-controlled Google OAuth desktop application.
export const DEFAULT_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
export const DEFAULT_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

// Encryption logic moved to src/common/auth/config.ts

function oauthClientCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || DEFAULT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      'OAuth requires your own Google Desktop client. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, ' +
      'or use a service account.'
    );
  }
  return { clientId, clientSecret };
}

let cachedClientMap: Record<string, searchconsole_v1.Searchconsole> = {};

export async function getSearchConsoleClient(siteUrl?: string, accountId?: string): Promise<searchconsole_v1.Searchconsole> {
  // 1. Resolve Account
  let account: AccountConfig;
  if (accountId) {
    const config = await loadConfig();
    account = config.accounts[accountId];
    if (!account) throw new Error(`Account ${accountId} not found.`);
  } else if (siteUrl) {
    account = await resolveAccount(siteUrl, 'google');
  } else {
    // Try to find any Google account if no specific site requested
    account = await resolveAccount('', 'google');
  }

  const cacheKey = account.id;
  if (cachedClientMap[cacheKey]) {
    logger.debug(`Using cached client for account: ${account.alias} (${account.id})`);
    return cachedClientMap[cacheKey];
  }

  logger.debug(`Initializing Search Console client for ${account.alias} (ID: ${account.id}, Engine: ${account.engine})`);

  // 2. Load Tokens
  const tokens = await loadTokensForAccount(account);

  if (tokens) {
    try {
      const { clientId, clientSecret } = oauthClientCredentials();
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret
      );
      oauth2Client.setCredentials(tokens);

      // Check for expiry (refresh if needed)
      if (tokens.expiry_date && tokens.expiry_date <= Date.now()) {
        logger.debug(`Tokens expired for ${account.alias}, refreshing...`);
        const { credentials } = await oauth2Client.refreshAccessToken();
        await saveTokensForAccount(account, credentials);
        oauth2Client.setCredentials(credentials);
      }

      const client = google.searchconsole({ version: 'v1', auth: oauth2Client });
      logger.debug(`Client successfully initialized with OAuth2 for ${account.alias}`);
      cachedClientMap[cacheKey] = client;
      return client;
    } catch (error) {
      logger.error(`Failed to use tokens for account ${account.alias}:`, (error as Error).message);
    }
  }

  // 3. Support Service Account Path (Multi-Account)
  if (account.serviceAccountPath) {
    const auth = new google.auth.GoogleAuth({
      keyFilename: account.serviceAccountPath,
      scopes: SCOPES
    });
    const client = google.searchconsole({ version: 'v1', auth });
    cachedClientMap[cacheKey] = client;
    logger.debug(`Client initialized with Service Account Path for ${account.alias}`);
    return client;
  }

  // 4. Fallback to Service Account (Environment Variables) - Only if no specific account was resolved or it was a legacy fallback
  if (!accountId) {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const auth = new google.auth.GoogleAuth({
        scopes: SCOPES
      });
      return google.searchconsole({ version: 'v1', auth });
    }

    if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      const jwtClient = new google.auth.JWT({
        email: process.env.GOOGLE_CLIENT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: SCOPES
      });
      await jwtClient.authorize();
      return google.searchconsole({ version: 'v1', auth: jwtClient as any });
    }
  }

  throw new Error(`Authentication required for ${siteUrl || 'Google Search Console'}. Run setup to add an account.`);
}

const INDEXING_SCOPES = [
  'https://www.googleapis.com/auth/indexing',
  'https://www.googleapis.com/auth/userinfo.email'
];

let cachedIndexingClientMap: Record<string, any> = {};

/**
 * Get an authenticated client for the Google Indexing API.
 * Uses the `indexing` scope which is separate from the read-only `webmasters.readonly` scope.
 *
 * @param siteUrl - The site URL to resolve the account for.
 * @param accountId - Optional specific account ID to use.
 * @returns An authenticated OAuth2 client with the indexing scope.
 */
export async function getIndexingClient(siteUrl?: string, accountId?: string): Promise<any> {
  // 1. Resolve Account
  let account: AccountConfig;
  if (accountId) {
    const config = await loadConfig();
    account = config.accounts[accountId];
    if (!account) throw new Error(`Account ${accountId} not found.`);
  } else if (siteUrl) {
    account = await resolveAccount(siteUrl, 'google');
  } else {
    account = await resolveAccount('', 'google');
  }

  const cacheKey = `indexing_${account.id}`;
  if (cachedIndexingClientMap[cacheKey]) {
    logger.debug(`Using cached indexing client for account: ${account.alias} (${account.id})`);
    return cachedIndexingClientMap[cacheKey];
  }

  logger.debug(`Initializing Indexing API client for ${account.alias} (ID: ${account.id})`);

  // 2. Load Tokens
  const tokens = await loadTokensForAccount(account);

  if (tokens) {
    try {
      const { clientId, clientSecret } = oauthClientCredentials();
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret
      );
      oauth2Client.setCredentials(tokens);

      // Check for expiry
      if (tokens.expiry_date && tokens.expiry_date <= Date.now()) {
        logger.debug(`Tokens expired for ${account.alias}, refreshing...`);
        const { credentials } = await oauth2Client.refreshAccessToken();
        await saveTokensForAccount(account, credentials);
        oauth2Client.setCredentials(credentials);
      }

      logger.debug(`Indexing client initialized with OAuth2 for ${account.alias}`);
      cachedIndexingClientMap[cacheKey] = oauth2Client;
      return oauth2Client;
    } catch (error) {
      logger.error(`Failed to use tokens for indexing client ${account.alias}:`, (error as Error).message);
    }
  }

  // 3. Support Service Account Path
  if (account.serviceAccountPath) {
    const auth = new google.auth.GoogleAuth({
      keyFilename: account.serviceAccountPath,
      scopes: INDEXING_SCOPES
    });
    const client = await auth.getClient();
    cachedIndexingClientMap[cacheKey] = client;
    logger.debug(`Indexing client initialized with Service Account for ${account.alias}`);
    return client;
  }

  // 4. Fallback to env-based Service Account
  if (!accountId) {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const auth = new google.auth.GoogleAuth({
        scopes: INDEXING_SCOPES
      });
      return auth.getClient();
    }

    if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      const jwtClient = new google.auth.JWT({
        email: process.env.GOOGLE_CLIENT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: INDEXING_SCOPES
      });
      await jwtClient.authorize();
      cachedIndexingClientMap[cacheKey] = jwtClient;
      return jwtClient;
    }
  }

  throw new Error(`Authentication required for Google Indexing API. Ensure your account has the 'indexing' scope.`);
}

export async function getUserEmail(tokens: any): Promise<string> {
  const { clientId, clientSecret } = oauthClientCredentials();
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret
  );
  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  return userInfo.data.email || DEFAULT_ACCOUNT;
}

export async function loadTokensForAccount(account: AccountConfig): Promise<any> {
  try {
    const secret = await readCredential(account, 'google-oauth');
    if (secret) {
      return JSON.parse(secret);
    }
  } catch (error) {
    if (!account.tokens) {
      logger.debug(`OS keychain unavailable for ${account.alias}: ${(error as Error).message}`);
      return null;
    }
  }

  // One-time, fail-closed migration from upstream encrypted config storage.
  if (account.tokens?.refresh_token) {
    const migratedTokens = {
      refresh_token: account.tokens.refresh_token,
      expiry_date: account.tokens.expiry_date,
    };
    try {
      await writeCredential(account, 'google-oauth', JSON.stringify(migratedTokens));
      delete account.tokens;
      await updateAccount(account);
      await cleanupMigratedLegacyTokenFiles();
      return migratedTokens;
    } catch (error) {
      throw new Error(
        `OAuth credentials for ${account.alias} could not be migrated to the OS keychain. ` +
        `Configure a working keychain or use a service account. Cause: ${(error as Error).message}`
      );
    }
  }

  return null;
}

export async function saveTokensForAccount(account: AccountConfig, tokens: any) {
  let existingTokens: any = null;
  try {
    const existing = await readCredential(account, 'google-oauth');
    existingTokens = existing ? JSON.parse(existing) : null;
  } catch {
    // The write below produces the actionable keychain error.
  }

  const minimalTokens = {
    refresh_token: tokens.refresh_token || existingTokens?.refresh_token || account.tokens?.refresh_token,
    expiry_date: tokens.expiry_date
  };

  if (!minimalTokens.refresh_token) {
    throw new Error('Google did not return a refresh token. Re-authorize with consent or use a service account.');
  }

  try {
    await writeCredential(account, 'google-oauth', JSON.stringify(minimalTokens));
  } catch (error) {
    throw new Error(
      `Could not store OAuth credentials in the OS keychain. ` +
      `No file fallback was written. Cause: ${(error as Error).message}`
    );
  }

  delete account.tokens;
  await updateAccount(account);
}

export async function logout(accountId: string) {
  await removeAccount(accountId);
}

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
}

export async function initiateDeviceFlow(clientId: string, scopes: string[] = SCOPES): Promise<DeviceCodeResponse> {
  const response = await fetch('https://oauth2.googleapis.com/device/code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      scope: scopes.join(' ')
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to initiate device flow: ${error}`);
  }

  return await response.json() as DeviceCodeResponse;
}

export async function pollForTokens(clientId: string, clientSecret: string, deviceCode: string, interval: number): Promise<any> {
  // This is now deprecated as Device Flow doesn't support Search Console scopes
  throw new Error("Device Flow is not supported for Search Console API.");
}

export async function startLocalFlow(clientId: string, clientSecret: string, scopes: string[] = SCOPES): Promise<any> {
  if (!clientId || !clientSecret) {
    throw new Error(
      'OAuth requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from your own Google Desktop application.'
    );
  }
  const { createServer } = await import('http');
  const { google } = await import('googleapis');
  const open = (await import('open')).default;

  const REDIRECT_URI = 'http://127.0.0.1:3000/oauth2callback';
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
  const state = randomBytes(32).toString('hex');

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state
  });

  return new Promise((resolve, reject) => {
    let timeout: ReturnType<typeof setTimeout>;

    const server = createServer(async (req, res) => {
      try {
        if (req.url?.startsWith('/oauth2callback')) {
          const url = new URL(req.url, REDIRECT_URI);
          const returnedState = url.searchParams.get('state');
          const code = url.searchParams.get('code');
          const oauthError = url.searchParams.get('error');

          const expected = Buffer.from(state);
          const received = Buffer.from(returnedState || '');
          if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<h1>Authentication Failed</h1><p>Invalid OAuth state.</p>');
            return;
          }

          if (oauthError) {
            throw new Error(`Google authorization failed: ${oauthError}`);
          }

          if (code) {
            const { tokens } = await oauth2Client.getToken(code);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<h1>Authentication Successful!</h1><p>You can close this tab now and return to your terminal.</p>');
            clearTimeout(timeout);
            server.close();
            resolve(tokens);
            return;
          }

          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Authentication Failed</h1><p>Authorization code is missing.</p>');
        }
      } catch (e) {
        res.writeHead(500);
        res.end('<h1>Authentication Failed</h1>');
        clearTimeout(timeout);
        server.close();
        reject(e);
      }
    }).listen(3000, '127.0.0.1');

    timeout = setTimeout(() => {
      server.close();
      reject(new Error('OAuth authorization timed out after 5 minutes.'));
    }, 5 * 60 * 1000);

    console.log('\nOpening your browser to authorize Search Console access...');
    open(authUrl);
  });
}
