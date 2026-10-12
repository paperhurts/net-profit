import { afterEach, describe, expect, it, vi } from 'vitest';
import { Ambience, type Snapshot } from '../../src/audio/ambience';
import { cues, setMuted, unlock } from '../../src/audio/sfx';
import { rng } from '../../src/core/math';

/**
 * A stand-in for the browser's audio engine that only keeps count: every node made, what it is
 * plugged into, and whether it has been unplugged. Safari keeps any node still plugged in, and
 * runs it, for good; so every note must unplug what it made once it has ended.
 */
class Param {
  value = 0;
  setValueAtTime(): void {}
  exponentialRampToValueAtTime(): void {}
  linearRampToValueAtTime(): void {}
  setTargetAtTime(): void {}
  cancelScheduledValues(): void {}
}

class Node {
  out: Node[] = [];
  unplugged = false;
  constructor(readonly ctx: FakeContext) {
    ctx.made.push(this);
  }
  connect<T extends Node>(n: T): T {
    this.out.push(n);
    this.unplugged = false;
    return n;
  }
  disconnect(): void {
    this.out = [];
    this.unplugged = true;
  }
}

class Osc extends Node {
  type = 'sine';
  frequency = new Param();
  detune = new Param();
  stopAt: number | null = null;
  onended: (() => void) | null = null;
  start(): void {}
  stop(t: number): void {
    this.stopAt = t;
  }
}

class FakeContext {
  readonly made: Node[] = [];
  currentTime = 0;
  sampleRate = 8000;
  state = 'running';
  readonly destination = new Node(this);
  resume(): void {}
  createGain() {
    return Object.assign(new Node(this), { gain: new Param() });
  }
  createDelay() {
    return Object.assign(new Node(this), { delayTime: new Param() });
  }
  createStereoPanner() {
    return Object.assign(new Node(this), { pan: new Param() });
  }
  createBiquadFilter() {
    return Object.assign(new Node(this), { type: '', frequency: new Param(), Q: new Param() });
  }
  createOscillator() {
    return new Osc(this);
  }
  createBufferSource() {
    return Object.assign(new Node(this), { buffer: null, loop: false, start() {} });
  }
  createBuffer(channels: number, n: number) {
    const data = Array.from({ length: channels }, () => new Float32Array(n));
    return { getChannelData: (c: number) => data[c] as Float32Array };
  }
  /** Every note that was told when to stop, ended. */
  endNotes(): void {
    for (const n of this.made) if (n instanceof Osc && n.stopAt !== null) n.onended?.();
  }
}

afterEach(() => vi.unstubAllGlobals());

describe("the sound effects' notes", () => {
  it('unplug what they made once they have played', () => {
    // The game makes its own context with new; this one remembers it.
    let made: FakeContext | null = null;
    class Ctx extends FakeContext {
      constructor() {
        super();
        made = this;
      }
    }
    vi.stubGlobal('window', { AudioContext: Ctx });
    vi.stubGlobal('AudioContext', Ctx);
    unlock();
    const ctx = made as unknown as FakeContext;
    setMuted(false);
    const before = ctx.made.length;
    cues.upgrade();
    cues.siren();
    cues.reaperRoar();
    const notes = ctx.made.slice(before);
    expect(notes.length).toBeGreaterThan(10);
    ctx.endNotes();
    expect(notes.filter((n) => !n.unplugged)).toEqual([]);
  });
});

describe('the sea all round', () => {
  it('unplugs every gull, chirp, chime and whale song once it is over, keeping only the sea itself', () => {
    const ctx = new FakeContext();
    const amb = new Ambience(
      ctx as unknown as AudioContext,
      ctx.destination as unknown as AudioNode,
      rng(3),
    );
    const lasting = new Set(ctx.made);
    const s: Snapshot = {
      on: true,
      t: 0,
      speedRatio: 0.5,
      dockness: 0,
      dark: 0,
      deepness: 0,
      storm: 0,
      phase: 'Day',
      shoreDist: 50,
      gulls: [{ dx: 80, dy: -40 }],
      pods: [{ dx: 120, dy: 60, dist: 140, escort: false }],
      whales: [
        { dx: 300, dy: 100, dist: 320 },
        { dx: 340, dy: 120, dist: 360 },
      ],
      sinceWhistle: 99,
    };
    // A long while at sea, near the shore (chimes), gulls, dolphins and whales about.
    for (let i = 0; i < 60 * 600; i++) {
      s.t = i / 60;
      ctx.currentTime = s.t;
      amb.update(1 / 60, s);
    }
    const calls = ctx.made.filter((n) => !lasting.has(n));
    expect(calls.filter((n) => n instanceof Osc).length).toBeGreaterThan(100);
    ctx.endNotes();
    expect(calls.filter((n) => !n.unplugged).length).toBe(0);
    // The sea itself, the swell, the hiss, the surf and the pad, plays on.
    expect([...lasting].filter((n) => n.unplugged)).toEqual([]);
  });
});
