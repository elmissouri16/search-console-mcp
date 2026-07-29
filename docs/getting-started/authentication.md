---
title: "Authentication"
description: "Configure Google, Bing, and GA4 credentials in the hardened fork."
---

## Credential-storage rules

- Google OAuth refresh tokens and Bing API keys are stored only in the OS
  keychain.
- Access tokens are kept in memory and are not deliberately persisted.
- There is no file fallback for OAuth or Bing secrets. Setup fails closed when
  the keychain is unavailable.
- Account routing metadata remains in the local configuration file, which is
  created with user-only permissions.
- Legacy secrets from upstream versions are migrated to the keychain when
  possible and stripped from the active configuration. Obsolete legacy token
  files are removed only after all credentials in them have migrated.

## Google Search Console OAuth

This fork does not include somebody else's OAuth client credentials. Create a
Google Cloud OAuth client of type **Desktop app**, enable the Search Console
API, and supply your own client values:

```bash
export GOOGLE_CLIENT_ID="your-desktop-client-id"
export GOOGLE_CLIENT_SECRET="your-desktop-client-secret"
npx --yes --package=github:elmissouri16/search-console-mcp#v1.14.2-security.2 search-console-mcp setup
```

The browser authorization callback:

- uses `http://127.0.0.1:3000/oauth2callback`;
- listens only on `127.0.0.1`;
- verifies a random OAuth `state`; and
- stops after five minutes.

The requested Search Console scope is read-only. Google Indexing API tools use
their separate indexing scope and are write-gated by this fork.

Remove a configured account and its keychain credentials with:

```bash
npx --yes --package=github:elmissouri16/search-console-mcp#v1.14.2-security.2 search-console-mcp logout ACCOUNT_ID
```

Use the tagged repository command with `accounts list` to find the account ID.

## Google service account

Service accounts are suitable for servers or dedicated automation:

1. Create a service account in Google Cloud.
2. Enable the required API.
3. Add the service-account email as a user of the Search Console or GA4
   property.
4. Store the JSON key outside the repository with restrictive permissions.
5. Set the absolute path before starting setup or the MCP server.

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/service-account.json"
npx --yes --package=github:elmissouri16/search-console-mcp#v1.14.2-security.2 search-console-mcp setup
```

Environment-based `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY` credentials
are also supported for managed deployment environments.

## Bing Webmaster Tools

Run the local setup wizard and choose Bing:

```bash
npx --yes --package=github:elmissouri16/search-console-mcp#v1.14.2-security.2 search-console-mcp setup
```

The entered API key is saved to the OS keychain. Alternatively, pass
`BING_API_KEY` directly in the MCP server environment; environment credentials
are not copied into the keychain automatically.

## Google Analytics 4

Run:

```bash
npx --yes --package=github:elmissouri16/search-console-mcp#v1.14.2-security.2 search-console-mcp setup --engine=ga4
```

GA4 supports a service-account JSON file or your own Google OAuth Desktop
client. Grant the chosen identity access to the GA4 property.

## PageSpeed Insights

`PAGESPEED_API_KEY` is optional. If setup writes it to a local `.env` file, the
file is created with mode `0600`. Keep `.env` out of version control.

## Write capability

Authentication alone does not enable mutating tools. To expose tools that add
or delete sites, submit or delete sitemaps, change account routing, or submit
indexing operations, set:

```text
SEARCH_CONSOLE_MCP_ENABLE_WRITE_TOOLS=true
```

Restart the MCP server after changing the flag, and review each tool call in
your MCP client.
