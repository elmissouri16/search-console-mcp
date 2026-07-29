---
title: "Installation from the reviewed repository"
description: "Clone, build, and configure the security-hardened fork."
---

This fork is installed from its Git repository. It is deliberately not
published as an npm package.

## Prerequisites

- Git
- Node.js 22.13 or newer
- Corepack/pnpm
- A verified Google Search Console, Bing Webmaster Tools, or GA4 property

## Clone and build

```bash
git clone https://github.com/elmissouri16/search-console-mcp.git
cd search-console-mcp
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm run build
```

Run setup from the local build:

```bash
node dist/index.js setup
```

Running `npx search-console-mcp` uses the separately published upstream npm
package, not this fork.

## MCP client configuration

The setup wizard prints a configuration for the current checkout. For manual
configuration, use absolute paths for both Node and the built entry point:

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
        "PAGESPEED_API_KEY": "optional",
        "SEARCH_CONSOLE_MCP_ENABLE_WRITE_TOOLS": "false"
      }
    }
  }
}
```

Use `command -v node` to locate Node. Replace the repository path with the
actual clone location.

## Verify

```bash
corepack pnpm test
corepack pnpm run build
node dist/index.js accounts list
```

## Updating

Updates are manual so you can inspect them first:

```bash
cd /absolute/path/to/search-console-mcp
git fetch origin
git log --oneline HEAD..origin/main
git pull --ff-only
corepack pnpm install --frozen-lockfile
corepack pnpm run build
corepack pnpm test
```

The application does not perform background version checks or automatic
installation.

## Next steps

- [Authentication](/getting-started/authentication)
- [Managing accounts](/getting-started/accounts)
- [Trust and security](/concepts/trust-and-security)
