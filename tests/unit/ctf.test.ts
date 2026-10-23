import { describe, expect, it } from 'vitest';
import { ABILITY, CTF, KITS, TEAM } from '../../src/data/battle';
import { Ctf, type Fighter, flagHome, gateSpot, graveSpot, inFort } from '../../src/entities/ctf';
import { SIDES } from '../../src/world/endless';
import { distOf, flowTo, walkable } from '../../src/world/endlessnav';

/** Run a battle on until it is over, or for so long. */
function run(g: Ctf, secs: number, dt = 0.1, you?: () => [number, number]): void {
  for (let t = 0; t < secs && g.phase !== 'over'; t += dt) g.update(dt, you?.());
}
/** Past the gates. */
function open(g: Ctf): void {
  run(g, CTF.gates + 0.05, 0.05);
  expect(g.phase).toBe('fight');
}
/** Everyone but these out of the way: down, with a long while to wait. */
function only(g: Ctf, keep: readonly Fighter[]): void {
  for (const f of g.fighters)
    if (!keep.includes(f)) {
      f.state = 'down';
      f.downT = 9999;
    }
}

describe('the way across the Endless Isle', () => {
  it('runs from each fort to the other, the same length both ways, the mirror being perfect', () => {
    const [pu, pv] = flagHome('pirate');
    const [nu, nv] = flagHome('ninja');
    const toN = distOf(flowTo(nu, nv), pu, pv);
    const toP = distOf(flowTo(pu, pv), nu, nv);
    expect(Number.isFinite(toN)).toBe(true);
    expect(toN).toBeGreaterThan(1500);
    expect(Math.abs(toN - toP)).toBeLessThan(1);
    // And the ground itself mirrors across the channel.
    let differ = 0;
    let n = 0;
    // Off the cells' edges, where a point would round to a different cell each side.
    for (let u = -640; u <= 640; u += 13)
      for (let v = 2.5; v <= 1050; v += 13) {
        n++;
        if (walkable(u, v) !== walkable(u, -v)) differ++;
      }
    expect(differ).toBe(0);
    expect(n).toBeGreaterThan(7000);
  });

  it('has every gate place, graveyard and flag reachable, on ground', () => {
    for (const side of SIDES) {
      const [gu, gv] = graveSpot(side);
      expect(walkable(gu, gv)).toBe(true);
      for (let i = 0; i < TEAM.length; i++) {
        const [u, v] = gateSpot(side, i);
        expect(walkable(u, v)).toBe(true);
        expect(inFort(side, u, v)).toBe(true);
      }
      const [fu, fv] = flagHome(side);
      expect(Number.isFinite(distOf(flowTo(fu, fv), gu, gv))).toBe(true);
    }
  });
});

describe('a Capture the Flag battle', () => {
  it('is five a side, a tank, a healer and three damage, you taking a damage place', () => {
    const g = new Ctf('pirate', 3);
    for (const side of SIDES) {
      const team = g.team(side);
      expect(team.map((f) => f.role).sort()).toEqual([
        'damage',
        'damage',
        'damage',
        'healer',
        'tank',
      ]);
    }
    expect(g.you?.side).toBe('pirate');
    expect(g.you?.role).toBe('damage');
    expect(g.you?.hp).toBe(KITS.damage.hearts);
    expect(g.fighters.filter((f) => !f.bot)).toEqual([g.you]);
  });

  it('waits behind the gates for ten seconds, then the gates drop', () => {
    const g = new Ctf('ninja', 1);
    const at = g.fighters.map((f) => [f.u, f.v]);
    run(g, CTF.gates - 0.5);
    expect(g.phase).toBe('gates');
    expect(g.fighters.map((f) => [f.u, f.v])).toEqual(at);
    run(g, 1);
    expect(g.phase).toBe('fight');
    expect(g.events.some((e) => e.k === 'go')).toBe(true);
    run(g, 3);
    expect(g.fighters.some((f) => f.bot && f.moving)).toBe(true);
  });

  it('lets you strike the nearest foe in reach, for two, and not again until your weapon is ready', () => {
    const g = new Ctf('pirate', 2);
    const you = g.you as Fighter;
    expect(g.strike()).toBeNull();
    open(g);
    const foe = g.team('ninja')[2] as Fighter;
    only(g, [you, foe]);
    foe.u = you.u + 30;
    foe.v = you.v;
    foe.cd = 99;
    expect(g.strike()).toBe(foe);
    expect(foe.hp).toBe(KITS.damage.hearts - KITS.damage.hit);
    expect(g.strike()).toBeNull();
    you.cd = 0;
    foe.u = you.u + 80;
    expect(g.strike()).toBeNull();
  });

  it('takes a flag a foe touches, drops it where its carrier falls, and sends it home after ten seconds alone', () => {
    const g = new Ctf('pirate', 4);
    open(g);
    const you = g.you as Fighter;
    const guard = g.team('ninja')[2] as Fighter;
    only(g, [you, guard]);
    guard.cd = 99;
    const [nu, nv] = flagHome('ninja');
    g.update(0.05, [nu + 10, nv]);
    expect(g.flags.ninja.at).toBe('carried');
    expect(g.flags.ninja.by).toBe(you);
    expect(you.carrying).toBe(true);
    // Carried off, then you fall: it lies where you fell.
    g.update(0.05, [nu + 60, nv + 120]);
    expect([g.flags.ninja.u, g.flags.ninja.v]).toEqual([nu + 60, nv + 120]);
    g.hurt(you, 99, guard);
    expect(you.state).toBe('down');
    expect(g.flags.ninja.at).toBe('dropped');
    expect([g.flags.ninja.u, g.flags.ninja.v]).toEqual([nu + 60, nv + 120]);
    expect(guard.stats.beaten).toBe(1);
    // Nobody touches it: home in ten seconds.
    guard.state = 'down';
    guard.downT = 9999;
    run(g, CTF.dropped - 0.5);
    expect(g.flags.ninja.at).toBe('dropped');
    run(g, 1);
    expect(g.flags.ninja.at).toBe('home');
  });

  it('sends a dropped flag home at once when its own side touches it', () => {
    const g = new Ctf('ninja', 5);
    open(g);
    const you = g.you as Fighter;
    only(g, [you]);
    const flag = g.flags.ninja;
    flag.at = 'dropped';
    flag.u = 0;
    flag.v = -300;
    flag.t = CTF.dropped;
    g.update(0.05, [0, -290]);
    expect(flag.at).toBe('home');
    expect([flag.u, flag.v]).toEqual(flagHome('ninja'));
    expect(you.stats.returns).toBe(1);
  });

  it('scores a carried flag brought to your own, only while yours is at home', () => {
    const g = new Ctf('pirate', 6);
    open(g);
    const you = g.you as Fighter;
    only(g, [you]);
    const [nu, nv] = flagHome('ninja');
    const [pu, pv] = flagHome('pirate');
    g.update(0.05, [nu, nv + 10]);
    expect(you.carrying).toBe(true);
    // Yours is out: no capture until it is back.
    g.flags.pirate.at = 'dropped';
    g.flags.pirate.u = 400;
    g.flags.pirate.v = 400;
    g.flags.pirate.t = 99;
    g.update(0.05, [pu, pv - 10]);
    expect(g.score.pirate).toBe(0);
    g.flags.pirate.at = 'home';
    g.flags.pirate.u = pu;
    g.flags.pirate.v = pv;
    g.update(0.05, [pu, pv - 10]);
    expect(g.score.pirate).toBe(1);
    expect(you.carrying).toBe(false);
    expect(g.flags.ninja.at).toBe('home');
    expect(you.stats.caps).toBe(1);
    expect(g.events.some((e) => e.k === 'capture' && e.side === 'pirate')).toBe(true);
  });

  it('is won at three captures, and on the clock by the most, the same being a draw', () => {
    const g = new Ctf('pirate', 7);
    open(g);
    const you = g.you as Fighter;
    only(g, [you]);
    const [nu, nv] = flagHome('ninja');
    const [pu, pv] = flagHome('pirate');
    for (let i = 0; i < CTF.win; i++) {
      g.update(0.05, [nu, nv + 10]);
      g.update(0.05, [pu, pv - 10]);
    }
    expect(g.phase).toBe('over');
    expect(g.winner).toBe('pirate');
    expect(g.events.some((e) => e.k === 'over' && e.winner === 'pirate')).toBe(true);

    const d = new Ctf(null, 8);
    open(d);
    only(d, []);
    run(d, CTF.clock + 1, 1);
    expect(d.phase).toBe('over');
    expect(d.winner).toBe('draw');
  });

  it('brings the beaten back up at their graveyard, whole, after the wait', () => {
    const g = new Ctf('ninja', 9);
    open(g);
    const you = g.you as Fighter;
    only(g, [you]);
    g.hurt(you, 99);
    expect(you.state).toBe('down');
    run(g, CTF.respawn - 0.5);
    expect(you.state).toBe('down');
    run(g, 1);
    expect(you.state).toBe('live');
    expect(you.hp).toBe(KITS.damage.hearts);
    const [gu, gv] = graveSpot('ninja');
    expect(Math.hypot(you.u - gu, you.v - gv)).toBeLessThan(20);
  });

  it('makes both carriers take a heart more once both flags have been out a minute', () => {
    const g = new Ctf('pirate', 10);
    open(g);
    const you = g.you as Fighter;
    only(g, [you]);
    const [nu, nv] = flagHome('ninja');
    g.update(0.05, [nu, nv + 10]);
    g.flags.pirate.at = 'dropped';
    g.flags.pirate.t = 9999;
    g.hurt(you, 1);
    expect(you.hp).toBe(KITS.damage.hearts - 1);
    run(g, CTF.bothOut + 0.5, 0.5, () => [you.u, you.v]);
    g.hurt(you, 1);
    expect(you.hp).toBe(KITS.damage.hearts - 3);
  });

  it('never sets more than two of their bots on you at once, unless you have their flag', () => {
    const g = new Ctf('pirate', 11);
    open(g);
    const you = g.you as Fighter;
    const foes = g.team('ninja').filter((f) => f.role === 'damage');
    only(g, [you, ...foes]);
    foes.forEach((f, i) => {
      f.u = you.u + 40 + i * 10;
      f.v = you.v + 20;
      f.job = 'mid';
    });
    run(g, 0.6, 0.1, () => [you.u, you.v]);
    expect(foes.filter((f) => f.target === you).length).toBeLessThanOrEqual(2);
  });

  it('lets you take any role, its hearts and its Badge I ability yours, a bot filling the place you leave', () => {
    for (const role of ['tank', 'damage', 'healer'] as const) {
      const g = new Ctf('ninja', 2, 1.12, role);
      const you = g.you as Fighter;
      expect(you.role).toBe(role);
      expect(you.hp).toBe(KITS[role].hearts);
      expect(you.ab).toBe({ tank: 'taunt', damage: 'shot', healer: 'heal' }[role]);
      expect(g.fighters.filter((f) => !f.bot)).toEqual([you]);
      expect(
        g
          .team('ninja')
          .map((f) => f.role)
          .sort(),
      ).toEqual(['damage', 'damage', 'damage', 'healer', 'tank']);
    }
  });

  it("the tank's shout makes every foe close by come at it, then waits its cooldown", () => {
    const g = new Ctf('pirate', 12, 1.12, 'tank');
    open(g);
    const you = g.you as Fighter;
    const near = g.team('ninja').filter((f) => f.role === 'damage');
    only(g, [you, ...near]);
    expect(g.ability()).toBeNull();
    near.forEach((f, i) => {
      f.u = you.u + (i === 2 ? ABILITY.taunt.reach + 40 : 60 + i * 30);
      f.v = you.v;
      f.target = null;
    });
    expect(g.ability()).toBe('taunt');
    expect(near.map((f) => f.tauntBy === you)).toEqual([true, true, false]);
    expect(g.events.some((e) => e.k === 'taunt' && e.n === 2)).toBe(true);
    // Made to come at you, even with something else to do.
    const first = near[0] as Fighter;
    first.carrying = true;
    run(g, 0.3, 0.1, () => [you.u, you.v]);
    expect(first.target).toBe(you);
    expect(g.ability()).toBeNull();
    you.abCd = 0;
    expect(g.ability()).toBe('taunt');
  });

  it("the damage's shot aims at the nearest foe in reach, a carrier first, and hits for four when the aim is done", () => {
    const g = new Ctf('pirate', 13);
    open(g);
    const you = g.you as Fighter;
    const [a, b] = g.team('ninja').filter((f) => f.role === 'damage') as [Fighter, Fighter];
    only(g, [you, a, b]);
    a.cd = b.cd = 99;
    a.abCd = b.abCd = 99;
    a.u = you.u + ABILITY.shot.reach + 20;
    a.v = b.v = you.v;
    b.u = you.u - ABILITY.shot.reach - 20;
    expect(g.ability()).toBeNull();
    a.u = you.u + 150;
    b.u = you.u - 250;
    b.carrying = true;
    expect(g.ability()).toBe('shot');
    expect(you.aimAt).toBe(b);
    expect(b.hp).toBe(KITS.damage.hearts);
    run(g, ABILITY.shot.aim + 0.1, 0.05, () => [you.u, you.v]);
    expect(b.hp).toBe(KITS.damage.hearts - ABILITY.shot.hit);
    expect(g.events.some((e) => e.k === 'shot' && e.to === b)).toBe(true);
    expect(g.ability()).toBeNull();
  });

  it("the healer's heal goes to the most hurt teammate near, or itself, and never past full", () => {
    const g = new Ctf('pirate', 14, 1.12, 'healer');
    open(g);
    const you = g.you as Fighter;
    const [tank, dmg] = [
      g.team('pirate').find((f) => f.role === 'tank'),
      g.team('pirate').find((f) => f.role === 'damage'),
    ] as [Fighter, Fighter];
    only(g, [you, tank, dmg]);
    expect(g.ability()).toBeNull();
    tank.u = dmg.u = you.u + 100;
    tank.v = dmg.v = you.v;
    tank.hp = KITS.tank.hearts - 2;
    dmg.hp = KITS.damage.hearts - 5;
    expect(g.ability()).toBe('heal');
    expect(dmg.hp).toBe(KITS.damage.hearts - 1);
    expect(you.stats.healed).toBe(ABILITY.heal.hearts);
    you.abCd = 0;
    dmg.hp = KITS.damage.hearts;
    expect(g.ability()).toBe('heal');
    expect(tank.hp).toBe(KITS.tank.hearts);
    you.abCd = 0;
    you.hp = 3;
    tank.u = you.u + ABILITY.heal.reach + 30;
    expect(g.ability()).toBe('heal');
    expect(you.hp).toBe(3 + ABILITY.heal.hearts);
  });

  it('has the bots use their abilities, on both sides', () => {
    const g = new Ctf(null, 15);
    const used = { pirate: new Set<string>(), ninja: new Set<string>() };
    for (let t = 0; t < CTF.gates + 180 && g.phase !== 'over'; t += 0.1) {
      g.update(0.1);
      for (const e of g.events.splice(0))
        if (e.k === 'taunt' || e.k === 'aim' || e.k === 'heal') used[e.f.side].add(e.k);
    }
    expect([...used.pirate].sort()).toEqual(['aim', 'heal', 'taunt']);
    expect([...used.ninja].sort()).toEqual(['aim', 'heal', 'taunt']);
  });

  it('balances out: bots alone, each side wins about as often, and every battle ends by its clock', () => {
    const wins = { pirate: 0, ninja: 0, draw: 0 };
    let caps = 0;
    const n = 40;
    for (let s = 1; s <= n; s++) {
      const g = new Ctf(null, s);
      run(g, CTF.gates + CTF.clock + 1);
      expect(g.phase).toBe('over');
      wins[g.winner ?? 'draw']++;
      caps += g.score.pirate + g.score.ninja;
    }
    const decided = wins.pirate + wins.ninja;
    expect(decided).toBeGreaterThan(n * 0.55);
    expect(wins.pirate / decided).toBeGreaterThan(0.3);
    expect(wins.pirate / decided).toBeLessThan(0.7);
    expect(caps / n).toBeGreaterThan(1.5);
  }, 60000);
});
