import { describe, expect, it, vi } from 'vitest';
import { runUpdateCommand } from '../src/utils/update.js';

describe('Update Utility', () => {
  it('prints reviewable repository update instructions without network access', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const fetchSpy = vi.spyOn(global, 'fetch');

    await runUpdateCommand();

    const output = log.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain('git pull --ff-only');
    expect(output).toContain('pnpm install --frozen-lockfile');
    expect(output).toContain('Review the incoming changes');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
