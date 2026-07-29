export async function runUpdateCommand(): Promise<void> {
  console.log(`
Automatic updates are disabled in this security-hardened fork.

Update manually:
  cd /path/to/search-console-mcp
  git pull --ff-only origin main
  corepack pnpm install --frozen-lockfile
  corepack pnpm run build

Review the incoming changes before restarting your MCP client.`);
}
