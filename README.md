# Search Console MCP — security-hardened fork

[![CI](https://github.com/elmissouri16/search-console-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/elmissouri16/search-console-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

This is a security-hardened fork of
[`saurabhsharma2u/search-console-mcp`](https://github.com/saurabhsharma2u/search-console-mcp).
It connects MCP clients to Google Search Console, Bing Webmaster Tools, Google
Analytics 4, PageSpeed Insights, and related SEO analysis tools.

This fork runs directly from its GitHub source. It is not published to npm and
does not silently replace an npm package or auto-update itself.

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

- Node.js 22.13 or newer
- Git, which npm uses to retrieve the tagged repository
- Access to at least one supported Google or Bing property

## Run directly from this repository

```bash
npx --yes --package=github:elmissouri16/search-console-mcp#v1.14.2-security.2 search-console-mcp setup
```

This retrieves the tagged source into npm's cache, installs its dependencies,
builds TypeScript through the repository's `prepare` hook, and runs the setup
wizard. Nothing is installed globally.

The wizard prints an MCP configuration that invokes this same pinned GitHub tag.
If authentication variables are present, the snippet includes them because a
GUI-launched MCP server may not inherit your terminal environment. Treat that
client configuration as a secret.
The equivalent manual configuration is:

```json
{
  "mcpServers": {
    "search-console": {
      "command": "npx",
      "args": [
        "--yes",
        "--package=github:elmissouri16/search-console-mcp#v1.14.2-security.2",
        "search-console-mcp"
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

Do not use bare `npx search-console-mcp`; that resolves the unrelated npm
release. Keep the `--package=github:...#v1.14.2-security.2` argument. Pinning the
tag avoids silently following new commits on `main`.

For the most reproducible review path, you can still clone the repository and
use the committed pnpm lockfile:

```bash
git clone --branch v1.14.2-security.2 https://github.com/elmissouri16/search-console-mcp.git
cd search-console-mcp
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm run build
```

## Authentication

### Google OAuth

Create your own Google Cloud OAuth client of type **Desktop app**, enable the
required APIs, then set:

```bash
export GOOGLE_CLIENT_ID="your-client-id"
export GOOGLE_CLIENT_SECRET="your-client-secret"
npx --yes --package=github:elmissouri16/search-console-mcp#v1.14.2-security.2 search-console-mcp setup
```

OAuth secrets are saved to macOS Keychain, Windows Credential Manager, or Linux
Secret Service. If the keychain is unavailable, setup fails without writing a
secret to the configuration file.

### Google service account

For headless or dedicated environments, grant the service-account email access
to the relevant property and set:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/service-account.json"
npx --yes --package=github:elmissouri16/search-console-mcp#v1.14.2-security.2 search-console-mcp setup
```

Protect the JSON key as a secret and restrict its filesystem permissions.

### Bing Webmaster Tools

Run the tagged `npx` setup command above, choose Bing, and enter the API key
when prompted. The key is saved only in the OS keychain. `BING_API_KEY` remains
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

## Common commands

```bash
# List configured accounts
npx --yes --package=github:elmissouri16/search-console-mcp#v1.14.2-security.2 search-console-mcp accounts list

# Show CLI tool help
npx --yes --package=github:elmissouri16/search-console-mcp#v1.14.2-security.2 search-console-mcp run --help

# Run a read-only tool
npx --yes --package=github:elmissouri16/search-console-mcp#v1.14.2-security.2 search-console-mcp run sites_list --engine=google --format=table
```

To update, review a newer fork tag and replace the pinned tag in the command and
MCP configuration. The application itself performs no background update.

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
