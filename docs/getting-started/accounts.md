---
title: "Managing Accounts"
description: "View, remove, and update your connected accounts."
---

## View Your Accounts

See all connected accounts at a glance:

```bash
node dist/index.js accounts list
```

This shows each account's name, engine (Google or Bing), and which sites it has access to.

---

## Remove an Account

No longer need an account? Remove it by name:

```bash
node dist/index.js accounts remove --account=marketing@company.com
```

---

## Add a Site to an Account

By default, a connected account can access **all sites** on that credential. If you want to limit it to specific sites, add a site boundary:

```bash
SEARCH_CONSOLE_MCP_ENABLE_WRITE_TOOLS=true node dist/index.js accounts add-site --account=marketing@company.com --site=example.com
```

You can also restrict sites during setup — the wizard will show you a list of available sites and let you pick which ones to include.

---

## Remove a Site from an Account

To remove a specific site from an account's access list:

```bash
SEARCH_CONSOLE_MCP_ENABLE_WRITE_TOOLS=true node dist/index.js accounts remove --site=example.com
```
