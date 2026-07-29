# Search Console MCP — security-hardened fork

[![CI](https://github.com/elmissouri16/search-console-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/elmissouri16/search-console-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

This is a security-hardened fork of
[`saurabhsharma2u/search-console-mcp`](https://github.com/saurabhsharma2u/search-console-mcp).
It connects MCP clients to Google Search Console, Bing Webmaster Tools, Google
Analytics 4, PageSpeed Insights, and related SEO analysis tools.

This fork is intentionally installed from source. It is not published to npm
and does not silently replace an npm package or auto-update itself.

## Security changes in this fork

- Google OAuth refresh tokens and Bing API keys are stored only in the operating
  system keychain. There is no encrypted-file fallback for secrets.
- Google OAuth requires credentials from your own Google Desktop OAuth
  application. No developer-owned client secret is bundled.
- The local OAuth callback binds to `127.0.0.1`, validates a cryptographically
  random `state`, and times out after five minutes.
- Tools that change accounts, sites, sitemaps, or indexing state are disabled
  unless `SEARCH_CONSOLE_MCP_ENABLE_WRITE_TOOLS=true` is explicitly configured.
- Schema URL fetching permits public HTTPS destinations only, re-checks
  redirects, blocks private/reserved networks, limits response size, and times
  out.
- Automatic update checks, automatic package installation, injected system-like
  notices, and GitHub starring prompts were removed.
- The vulnerable transitive dependency ranges found during review are
  overridden with patched releases.

These controls reduce risk; they are not a guarantee that the software or its
dependencies will never contain a vulnerability. Review changes before pulling
new commits and keep your local clone updated.

## Prerequisites

- Git
- Node.js 20 or newer
- Corepack/pnpm
- Access to at least one supported Google or Bing property

## Install from this repository

```bash
git clone https://github.com/elmissouri16/search-console-mcp.git
cd search-console-mcp
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm run build
```

Run the setup wizard from the checked-out build:

```bash
node dist/index.js setup
```

The wizard prints an MCP configuration that runs this exact local checkout.
If authentication variables are present, the snippet includes them because a
GUI-launched MCP server may not inherit your terminal environment. Treat that
client configuration as a secret.
When configuring a client manually, use absolute paths:

```json
{
  "mcpServers": {
    "search-console": {
      "command": "/absolute/path/to/node",
      "args": [
        "/absolute/path/to/search-console-mcp/dist/index.js"
      ],
      "env": {
        "GOOGLE_CLIENT_ID": "your-own-desktop-oauth-client-id",
        "GOOGLE_CLIENT_SECRET": "your-own-desktop-oauth-client-secret",
        "SEARCH_CONSOLE_MCP_ENABLE_WRITE_TOOLS": "false"
      }
    }
  }
}
```

Find the Node executable with `command -v node`. Do not point your client at
`npx search-console-mcp`; that runs the npm release rather than this reviewed
fork.

## Authentication

### Google OAuth

Create your own Google Cloud OAuth client of type **Desktop app**, enable the
required APIs, then set:

```bash
export GOOGLE_CLIENT_ID="your-client-id"
export GOOGLE_CLIENT_SECRET="your-client-secret"
node dist/index.js setup
```

OAuth secrets are saved to macOS Keychain, Windows Credential Manager, or Linux
Secret Service. If the keychain is unavailable, setup fails without writing a
secret to the configuration file.

### Google service account

For headless or dedicated environments, grant the service-account email access
to the relevant property and set:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/service-account.json"
node dist/index.js setup
```

Protect the JSON key as a secret and restrict its filesystem permissions.

### Bing Webmaster Tools

Run `node dist/index.js setup`, choose Bing, and enter the API key when
prompted. The key is saved only in the OS keychain. `BING_API_KEY` remains
available as an explicit environment-only option.

## Write-tool opt-in

Read and analysis tools are available by default. Tools that mutate remote or
local state return an error until the server is started with:

```text
SEARCH_CONSOLE_MCP_ENABLE_WRITE_TOOLS=true
```

Enabling the flag exposes write capability; your MCP client should still ask
you to approve each specific operation. Leave it unset or set it to `false`
when you only need analysis.

## Common local commands

```bash
# List configured accounts
node dist/index.js accounts list

# Show CLI tool help
node dist/index.js run --help

# Run a read-only tool
node dist/index.js run sites_list --engine=google --format=table

# Pull reviewed upstream changes and rebuild
git pull --ff-only
corepack pnpm install --frozen-lockfile
corepack pnpm run build
corepack pnpm test
```

The `update` command prints these manual instructions; it does not download or
install anything.

## Verification

Before connecting valuable accounts:

```bash
corepack pnpm test
corepack pnpm run build
corepack pnpm audit
```

See [installation](docs/getting-started/installation.md),
[authentication](docs/getting-started/authentication.md), and the
[security policy](SECURITY.md) for more detail.

## Upstream attribution

The original project and its contributors are credited through Git history and
the upstream repository. This fork keeps the original MIT license. Security
changes in this fork have not been endorsed by the upstream maintainer.
