# Security policy

## Supported version

Only the latest commit on this fork's `main` branch is maintained. The fork is
installed from source and is not published to npm.

## Reporting a vulnerability

Do not disclose an unpatched vulnerability in a public issue. Use the fork's
[private GitHub security advisory form](https://github.com/elmissouri16/search-console-mcp/security/advisories/new).

Include the affected commit, reproduction steps, impact, and any suggested
mitigation. Vulnerabilities that exist in the upstream project should also be
reported privately to the upstream maintainer.

## Security model

### Credentials

- Google OAuth uses a user-owned Desktop OAuth client.
- The OAuth callback binds to loopback, validates `state`, and expires.
- Google refresh tokens and Bing keys are stored only in the OS keychain.
- No secret file fallback is used when keychain storage fails.
- Service-account JSON files remain user-managed secrets.

### Capabilities

Read and analysis tools are enabled by default. Tools that mutate account,
property, sitemap, or indexing state require the explicit
`SEARCH_CONSOLE_MCP_ENABLE_WRITE_TOOLS=true` server setting. This gate reduces
accidental exposure; it does not replace reviewing each requested operation.

### Network access

Normal tools contact Google, Bing, PageSpeed, and GA4 endpoints as required.
The schema validator can retrieve a user-supplied web page, but restricts it to
public HTTPS addresses, validates redirects, blocks local/private/reserved
networks, limits response size, and applies a timeout.

### Local-first operation

The project has no developer-operated data collection backend and no telemetry
code identified in this fork. Automatic update checks, automatic installation,
and GitHub starring behavior are removed. Updates are pulled and rebuilt
manually from the repository.

## Limitations

If an attacker controls your operating-system account, MCP configuration, Node
runtime, or local checkout, they may bypass these controls. A compromised MCP
client or model provider can also expose tool inputs and outputs. Dependency
audits are point-in-time checks, not proof of future safety.

## Revocation

Revoke Google access from your Google Account security settings and remove the
local account with:

```bash
node dist/index.js logout ACCOUNT_ID
```

Rotate Bing keys and service-account keys at their providers when compromise is
suspected.
