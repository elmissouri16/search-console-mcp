import { describe, expect, it, vi } from 'vitest';
import { showMcpConfigSnippet } from '../src/setup.js';

describe('Setup Wizard - local repository configuration', () => {
    it('prints a config that runs the built local entry point', () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});

        showMcpConfigSnippet();

        const output = log.mock.calls.map((call) => call.join(' ')).join('\n');
        expect(output).toContain(process.execPath);
        expect(output).toContain('index.js');
        expect(output).toContain('SEARCH_CONSOLE_MCP_ENABLE_WRITE_TOOLS');
        expect(output).toContain('false');
        expect(output).not.toContain('npx');
        expect(output).not.toContain('starred/');
    });
});
