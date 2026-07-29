import { describe, expect, it, vi } from 'vitest';
import { showMcpConfigSnippet } from '../src/setup.js';

describe('Setup Wizard - pinned repository configuration', () => {
    it('prints a config that runs the tagged GitHub source through npx', () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});

        showMcpConfigSnippet();

        const output = log.mock.calls.map((call) => call.join(' ')).join('\n');
        expect(output).toContain('"command": "npx"');
        expect(output).toContain('github:elmissouri16/search-console-mcp#v1.14.2-security.2');
        expect(output).toContain('search-console-mcp');
        expect(output).toContain('SEARCH_CONSOLE_MCP_ENABLE_WRITE_TOOLS');
        expect(output).toContain('false');
        expect(output).not.toContain('starred/');
    });
});
