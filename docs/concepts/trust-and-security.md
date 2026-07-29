---
title: "Trust and Security"
description: "The security boundaries and explicit opt-ins in this fork."
---

Search Console and analytics data can reveal commercially sensitive queries,
pages, and traffic patterns. Treat this MCP server as code running with the
permissions of the connected accounts.

## Default boundaries

- OAuth refresh tokens and Bing API keys are keychain-only.
- The bundled Google OAuth client was removed; you provide your own.
- Remote write tools are disabled unless
  `SEARCH_CONSOLE_MCP_ENABLE_WRITE_TOOLS=true`.
- The server does not edit site HTML, a CMS, or DNS.
- There is no telemetry backend, automatic package installation, automatic
  GitHub starring, or system-like notice injected into tool output.
- URL-based schema validation accepts public HTTPS destinations only and
  applies redirect, network, response-size, and timeout restrictions.

## What the controls do not guarantee

The server sends query and property data directly to the APIs and URLs required
by the tool you invoke. Your MCP client and language-model provider may receive
tool inputs and outputs. Review their retention and privacy settings.

An attacker controlling your operating-system account may be able to use the
keychain, read process memory, replace the local build, or alter MCP
configuration. Keychain storage does not protect a fully compromised machine.

Dependencies can acquire new vulnerabilities. Review lockfile changes, run the
test suite and dependency audit, and pull updates manually.

## Safe operating practices

1. Use a dedicated service account where practical and grant only the
   properties it needs.
2. Keep write tools disabled for analysis-only use.
3. Inspect tool arguments before approving a write.
4. Use absolute executable and repository paths in MCP configuration.
5. Protect service-account files and `.env` with user-only permissions.
6. Revoke OAuth access and remove local credentials when they are no longer
   needed.
