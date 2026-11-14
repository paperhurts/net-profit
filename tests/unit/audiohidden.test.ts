import { afterEach, describe, expect, it, vi } from 'vitest';

/** An audio engine that only keeps whether it is asleep. */
class Ctx {
  state: 'running' | 'suspended' | 'interrupted' | 'closed' = 'running';
  suspended = 0;
  resumed = 0;
  async suspend(): Promise<void> {
    this.suspended++;
    this.state = 'suspended';
  }
  async resume(): Promise<void> {
    this.resumed++;
    this.state = 'running';
  }
}

/** A fresh copy of the sound module, its engine made on the first unlock, and that engine. */
async function fresh() {
  let made: Ctx | null = null;
  const Made = class extends Ctx {
    constructor() {
      super();
      made = this;
    }
  };
  vi.stubGlobal('window', { AudioContext: Made });
  vi.stubGlobal('AudioContext', Made);
  const sfx = await import('../../src/audio/sfx');
  return { sfx, ctx: () => made as unknown as Ctx };
}

describe('the sound while the page is hidden', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('sleeps when the page is hidden and wakes when it shows again (the owner: it played on in the background)', async () => {
    const { sfx, ctx } = await fresh();
    // Before the first tap there is no sound to quiet, and nothing breaks.
    sfx.quietWhileHidden(true);
    sfx.quietWhileHidden(false);
    sfx.unlock();
    const ac = ctx();
    expect(ac.state).toBe('running');
    sfx.quietWhileHidden(true);
    expect(ac.state).toBe('suspended');
    // Hidden twice over, it is put to sleep once.
    sfx.quietWhileHidden(true);
    expect(ac.suspended).toBe(1);
    sfx.quietWhileHidden(false);
    expect(ac.state).toBe('running');
    expect(ac.resumed).toBe(1);
  });

  it('stays asleep while hidden whatever else asks it to wake (it came back for a friend of hers)', async () => {
    const { sfx, ctx } = await fresh();
    sfx.unlock();
    const ac = ctx();
    sfx.quietWhileHidden(true);
    sfx.unlock();
    sfx.quietWhileUnfocused(false);
    expect(ac.state).toBe('suspended');
    expect(ac.resumed).toBe(0);
    sfx.quietWhileHidden(false);
    expect(ac.state).toBe('running');
  });

  it("on a phone, sleeps when the browser loses focus, and a tap or focus wakes it (an app's own browser)", async () => {
    const { sfx, ctx } = await fresh();
    sfx.unlock();
    const ac = ctx();
    sfx.quietWhileUnfocused(true);
    expect(ac.state).toBe('suspended');
    sfx.quietWhileUnfocused(false);
    expect(ac.state).toBe('running');
    // Losing focus holds nothing asleep: a tap wakes it even if no focus is ever reported.
    sfx.quietWhileUnfocused(true);
    sfx.unlock();
    expect(ac.state).toBe('running');
  });

  it("wakes from Safari's interrupted as well as from asleep, and leaves a closed engine be", async () => {
    const { sfx, ctx } = await fresh();
    sfx.unlock();
    const ac = ctx();
    ac.state = 'interrupted';
    sfx.quietWhileHidden(false);
    expect(ac.state).toBe('running');
    ac.state = 'closed';
    sfx.quietWhileHidden(false);
    expect(ac.state).toBe('closed');
  });
});
