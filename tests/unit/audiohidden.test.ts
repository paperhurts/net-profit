import { afterEach, describe, expect, it, vi } from 'vitest';

/** An audio engine that only keeps whether it is asleep. */
class Ctx {
  state: 'running' | 'suspended' = 'running';
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

describe('the sound while the page is hidden', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('sleeps when the page is hidden and wakes when it shows again (the owner: it played on in the background)', async () => {
    let made: Ctx | null = null;
    const Made = class extends Ctx {
      constructor() {
        super();
        made = this;
      }
    };
    vi.stubGlobal('window', { AudioContext: Made });
    vi.stubGlobal('AudioContext', Made);
    const { quietWhileHidden, unlock } = await import('../../src/audio/sfx');
    // Before the first tap there is no sound to quiet, and nothing breaks.
    quietWhileHidden(true);
    unlock();
    const ac = made as unknown as Ctx;
    expect(ac.state).toBe('running');
    quietWhileHidden(true);
    expect(ac.state).toBe('suspended');
    // Hidden twice over, it is put to sleep once.
    quietWhileHidden(true);
    expect(ac.suspended).toBe(1);
    quietWhileHidden(false);
    expect(ac.state).toBe('running');
    expect(ac.resumed).toBe(1);
  });
});
