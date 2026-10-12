import { describe, expect, it } from 'vitest';
import { isNewVersion, scriptIn } from '../../src/state/update';

const page = (src: string) =>
  `<!doctype html><html><head><title>Net Profit</title><link rel="icon" href="./favicon-32.png">
<script type="module" crossorigin src="${src}"></script></head><body></body></html>`;

describe('a new version of the game', () => {
  it("finds the game's own script in its page, and nothing in a page without one", () => {
    expect(scriptIn(page('./assets/index-AbC123.js'))).toBe('./assets/index-AbC123.js');
    expect(scriptIn('<html><body>offline</body></html>')).toBeNull();
    expect(scriptIn('<script src="https://example.com/x.js"></script>')).toBeNull();
  });

  it('is new when the page names a different build, and not when it names the same one', () => {
    const base = 'https://net-profit.paperhurts.dev/';
    expect(isNewVersion(page('./assets/index-NEW.js'), './assets/index-OLD.js', base)).toBe(true);
    expect(isNewVersion(page('./assets/index-OLD.js'), './assets/index-OLD.js', base)).toBe(false);
    // The same file written two ways is the same file.
    expect(isNewVersion(page('/assets/index-OLD.js'), './assets/index-OLD.js', base)).toBe(false);
    // A page with no script (an error page, say) is no reason to reload.
    expect(isNewVersion('<html>502</html>', './assets/index-OLD.js', base)).toBe(false);
    expect(isNewVersion(page('./assets/index-NEW.js'), '', base)).toBe(false);
  });
});
