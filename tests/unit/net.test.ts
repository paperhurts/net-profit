import { describe, expect, it } from 'vitest';
import legacy from '../../legacy/net-profit.html?raw';
import { rng } from '../../src/core/math';
import { NETW } from '../../src/data/tuning';
import {
  type Hull,
  type Net,
  placeNetBehind,
  STERN,
  towLength,
  towNet,
} from '../../src/entities/net';

const fresh = (): Net => ({ x: 0, y: 0, speed: 0, torn: 0 });

describe('towLength', () => {
  it('grows with the net width: 44 plus 28% of it', () => {
    for (const w of NETW) expect(towLength(w)).toBeCloseTo(44 + w * 0.28);
  });
});

describe('placeNetBehind', () => {
  it('drops the net at full rope straight behind the stern', () => {
    const boat: Hull = { x: 1000, y: 1000, h: 0.45 };
    const net = fresh();
    placeNetBehind(net, boat, 1.2, 60);
    const back = STERN * 1.2 + 60;
    expect(net.x).toBeCloseTo(1000 - Math.cos(0.45) * back);
    expect(net.y).toBeCloseTo(1000 - Math.sin(0.45) * back);
  });
});

describe('towNet', () => {
  const L = towLength(NETW[0]);

  it('pulls the net to rope length when the stern moves away', () => {
    const boat: Hull = { x: 1000, y: 1000, h: 0 };
    const net = fresh();
    placeNetBehind(net, boat, 1, L);
    boat.x += 50;
    towNet(net, boat, 1, L, 1 / 60);
    const sternX = boat.x - STERN;
    expect(Math.hypot(net.x - sternX, net.y - boat.y)).toBeCloseTo(L);
    expect(net.speed).toBeCloseTo(50 * 60);
  });

  it('leaves the net where it is while the rope is slack', () => {
    const boat: Hull = { x: 1000, y: 1000, h: 0 };
    const net = fresh();
    placeNetBehind(net, boat, 1, L);
    boat.x -= 20; // reversing toward the net
    const before = { x: net.x, y: net.y };
    towNet(net, boat, 1, L, 1 / 60);
    expect(net).toMatchObject(before);
    expect(net.speed).toBe(0);
  });

  it('nudges a net that lands on the stern to six units behind it', () => {
    const boat: Hull = { x: 1000, y: 1000, h: Math.PI / 2 };
    const net: Net = { x: 1000, y: 1000 - STERN + 1, speed: 0, torn: 0 };
    towNet(net, boat, 1, L, 1 / 60);
    expect(net.x).toBeCloseTo(1000);
    expect(net.y).toBeCloseTo(1000 - STERN - 6);
  });

  it('tracks inside a turn like a trailer, lagging behind the hull', () => {
    const boat: Hull = { x: 0, y: 0, h: 0 };
    const net = fresh();
    placeNetBehind(net, boat, 1, L);
    // The boat carves a quarter turn to the left at 200 units a second.
    const R = 150;
    for (let i = 1; i <= 90; i++) {
      const a = (i / 90) * (Math.PI / 2);
      boat.x = R * Math.sin(a);
      boat.y = R * (1 - Math.cos(a));
      boat.h = a;
      towNet(net, boat, 1, L, 1 / 60);
    }
    // The centre of the turn is (0, R). A towed trailer cuts the corner, so the
    // net runs on a tighter radius than the hull and trails it round the arc.
    const hullRadius = Math.hypot(boat.x, boat.y - R);
    const netRadius = Math.hypot(net.x, net.y - R);
    expect(netRadius).toBeLessThan(hullRadius);
    expect(netRadius).toBeGreaterThan(hullRadius * 0.8);
    expect(Math.atan2(net.y - R, net.x)).toBeLessThan(Math.atan2(boat.y - R, boat.x));
  });

  it('matches the legacy code exactly, step for step, on five hundred random states', () => {
    const start = legacy.indexOf('/* net tows behind like a trailer */');
    expect(start).toBeGreaterThan(0);
    const end = legacy.indexOf('net.speed = Math.hypot(net.x-pnx, net.y-pny)/dt;', start);
    const block = legacy.slice(
      start,
      end + 'net.speed = Math.hypot(net.x-pnx, net.y-pny)/dt;'.length,
    );
    // The prototype's own six lines, run as a function of the same state. The
    // body is a slice of the repo's committed reference file, evaluated only
    // inside this test process; it is the reference, not an input.
    const legacyTow = new Function('boat', 'net', 'k', 'towLen', 'dt', block) as (
      boat: Hull,
      net: Net,
      k: number,
      towLen: () => number,
      dt: number,
    ) => void;

    const r = rng(7);
    for (let i = 0; i < 500; i++) {
      const boat: Hull = { x: 500 + r() * 3800, y: 500 + r() * 3800, h: r() * Math.PI * 2 };
      const k = 1 + r() * 0.6;
      const len = towLength(NETW[Math.floor(r() * 6)] ?? 52);
      const dist = r() * (len + 40);
      const ang = r() * Math.PI * 2;
      const a: Net = {
        x: boat.x + Math.cos(ang) * dist,
        y: boat.y + Math.sin(ang) * dist,
        speed: 0,
        torn: 0,
      };
      const b: Net = { ...a };
      const dt = 0.008 + r() * 0.04;
      towNet(a, boat, k, len, dt);
      legacyTow(boat, b, k, () => len, dt);
      expect(a.x).toBe(b.x);
      expect(a.y).toBe(b.y);
      expect(a.speed).toBe(b.speed);
    }
  });
});
