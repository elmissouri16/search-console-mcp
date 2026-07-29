---
title: "Run from the reviewed repository"
description: "Use npx with a pinned GitHub source tag, without a global install."
---

This fork is not published as an npm package. `npx` can still retrieve and run
the package directly from its tagged GitHub source.

## Prerequisites

- Node.js 22.13 or newer
- Git
- A verified Google Search Console, Bing Webmaster Tools, or GA4 property

## One-command setup

```bash
npx --yes --package=github:elmissouri16/search-console-mcp#v1.14.2-security.2 search-console-mcp setup
```

On first use, npm retrieves the tagged repository into its cache, installs the
dependencies, and runs the repository's `prepare` script to build TypeScript.
It does not install a global package.

Do not shorten this to `npx search-console-mcp`: the bare package name resolves
the separately published upstream npm package. The GitHub package spec and
version tag identify this fork and reviewed release.

## MCP client configuration

The setup wizard prints this configuration and includes any authentication
variables available in its environment:

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
        "PAGESPEED_API_KEY": "optional",
        "SEARCH_CONSOLE_MCP_ENABLE_WRITE_TOOLS": "false"
      }
    }
  }
}
```

Treat MCP configuration containing credentials as a secret.

## Verify

```bash
npx --yes --package=github:elmissouri16/search-console-mcp#v1.14.2-security.2 search-console-mcp accounts list
```

## Reproducible source checkout

`npx` is the convenient path, but npm resolves the Git package's dependency
installation itself. For a lockfile-enforced local review, clone the tag and use
pnpm:

```bash
git clone --branch v1.14.2-security.2 https://github.com/elmissouri16/search-console-mcp.git
cd search-console-mcp
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm run build
corepack pnpm test
```

## Updating

Review the comparison between your pinned tag and a newer release tag, then
replace the tag in the command and MCP configuration. The application performs
no background version checks or automatic updates.

## Next steps

- [Authentication](/getting-started/authentication)
- [Managing accounts](/getting-started/accounts)
- [Trust and security](/concepts/trust-and-security)
