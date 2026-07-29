const WRITE_TOOL_NAMES = new Set([
    'sites_add',
    'sites_delete',
    'sitemaps_submit',
    'sitemaps_delete',
    'accounts_add_site',
    'accounts_remove',
    'bing_sites_add',
    'bing_sites_delete',
    'bing_sitemaps_submit',
    'bing_sitemaps_delete',
    'bing_url_submit',
    'bing_url_submit_batch',
    'bing_index_now',
    'indexing_submit_url',
    'indexing_remove_url',
    'indexing_batch_submit',
]);

export function isWriteTool(name: string): boolean {
    return WRITE_TOOL_NAMES.has(name);
}

export function isWriteAccessEnabled(): boolean {
    return process.env.SEARCH_CONSOLE_MCP_ENABLE_WRITE_TOOLS === 'true';
}

export function writeAccessError(toolName: string) {
    return {
        isError: true,
        content: [{
            type: 'text',
            text:
                `Write tool '${toolName}' is disabled by default. ` +
                `Set SEARCH_CONSOLE_MCP_ENABLE_WRITE_TOOLS=true in the MCP server environment, ` +
                `restart the server, and approve the specific operation in your MCP client.`,
        }],
    };
}
