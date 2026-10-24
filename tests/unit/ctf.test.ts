import { describe, expect, it } from 'vitest';
import {
  ABILITIES,
  ABILITY,
  ARMOUR,
  BADGE_MARKS,
  badgeOf,
  CTF,
  FORTS,
  KITS,
  TEAM,
} from '../../src/data/battle';
import {
  Ctf,
  type Fighter,
  flagHome,
  gateSpot,
  graveSpot,
  type Hold,
  inFort,
} from '../../src/entities/ctf';
import { onHalf, SIDES } from '../../src/world/endless';
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
    // A 2, less a heart for your armour; then a minute on, a heart more.
    g.hurt(you, 2);
    expect(you.hp).toBe(KITS.damage.hearts - 1);
    run(g, CTF.bothOut + 0.5, 0.5, () => [you.u, you.v]);
    g.hurt(you, 2);
    expect(you.hp).toBe(KITS.damage.hearts - 3);
  });

  it('gives the tanks armour, and you yours in any place: a heart off every hit, never under half', () => {
    const g = new Ctf('pirate', 12, 1.12, 'healer');
    open(g);
    const you = g.you as Fighter;
    const tank = g.team('ninja').find((f) => f.role === 'tank') as Fighter;
    const dmg = g.team('ninja').find((f) => f.role === 'damage') as Fighter;
    only(g, [you, tank, dmg]);
    g.hurt(tank, 2);
    g.hurt(tank, 1);
    g.hurt(dmg, 2);
    expect([tank.hp, dmg.hp]).toEqual([KITS.tank.hearts - 1.5, KITS.damage.hearts - 2]);
    // You, the healer: their 2 is 1, their 1 half a heart, a keg's 5 is 4.
    g.hurt(you, 2);
    g.hurt(you, 1);
    expect(you.hp).toBe(KITS.healer.hearts - 1.5);
    g.hurt(you, ABILITY.bomb.hit);
    expect(you.hp).toBe(KITS.healer.hearts - 1.5 - (ABILITY.bomb.hit - ARMOUR.less));
    // You as the tank: the armour once, not twice.
    const t = new Ctf('pirate', 12, 1.12, 'tank');
    open(t);
    const me = t.you as Fighter;
    only(t, [me]);
    t.hurt(me, 2);
    expect(me.hp).toBe(KITS.tank.hearts - 1);
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
      expect(you.abs).toEqual([{ tank: 'taunt', damage: 'shot', healer: 'heal' }[role]]);
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
    you.abCd[0] = 0;
    expect(g.ability()).toBe('taunt');
  });

  it("the damage's shot aims at the nearest foe in reach, a carrier first, and hits for four when the aim is done", () => {
    const g = new Ctf('pirate', 13);
    open(g);
    const you = g.you as Fighter;
    const [a, b] = g.team('ninja').filter((f) => f.role === 'damage') as [Fighter, Fighter];
    only(g, [you, a, b]);
    a.cd = b.cd = 99;
    a.abCd[0] = b.abCd[0] = 99;
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
    you.abCd[0] = 0;
    dmg.hp = KITS.damage.hearts;
    expect(g.ability()).toBe('heal');
    expect(tank.hp).toBe(KITS.tank.hearts);
    you.abCd[0] = 0;
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

describe('Badges II and III', () => {
  /** A place out in the open on the pirates' half, with room all round. */
  const OPEN = onHalf('pirate', -40, 470);
  /** Somewhere in the open for each fighter, and nobody's abilities going off but the one being tried. */
  function place(f: Fighter, du: number, dv = 0): void {
    f.u = OPEN[0] + du;
    f.v = OPEN[1] + dv;
    f.target = null;
  }
  function quiet(...fs: Fighter[]): void {
    for (const f of fs) f.abCd = f.abCd.map(() => 99);
  }
  const at = () => [OPEN[0], OPEN[1]] as [number, number];

  it('takes 3 marks for Badge II and 8 for Badge III, and gives everyone as many badges as you', () => {
    expect([0, 1, 2, 3, 7, 8, 30].map(badgeOf)).toEqual([1, 1, 1, 2, 2, 3, 3]);
    expect(BADGE_MARKS).toEqual([0, 3, 8]);
    for (const badge of [1, 2, 3] as const) {
      const g = new Ctf('pirate', 20, 1.12, 'tank', badge);
      for (const f of g.fighters) expect(f.abs).toEqual(ABILITIES[f.role].slice(0, badge));
      expect((g.you as Fighter).abCd).toHaveLength(badge);
    }
  });

  it("the tank's guard halves what it takes, for six seconds", () => {
    const g = new Ctf('pirate', 21, 1.12, 'tank', 2);
    open(g);
    const you = g.you as Fighter;
    only(g, [you]);
    place(you, 0);
    expect(g.ability(you, 1)).toBe('guard');
    expect(g.events.some((e) => e.k === 'guard' && e.f === you)).toBe(true);
    // Halved to 1, then the armour takes it to half a heart; after, the armour alone takes 2 to 1.
    g.hurt(you, 2);
    expect(you.hp).toBe(KITS.tank.hearts - 0.5);
    expect(g.ability(you, 1)).toBeNull();
    run(g, ABILITY.guard.lasts + 0.1, 0.1, at);
    g.hurt(you, 2);
    expect(you.hp).toBe(KITS.tank.hearts - 1.5);
  });

  it("the tank's stomp winds up in its ring, then hits and stuns every foe close round it", () => {
    const g = new Ctf('pirate', 22, 1.12, 'tank', 3);
    open(g);
    const you = g.you as Fighter;
    const [a, b, c] = g.team('ninja').filter((f) => f.role === 'damage') as [
      Fighter,
      Fighter,
      Fighter,
    ];
    only(g, [you, a, b, c]);
    place(you, 0);
    place(a, 400);
    place(b, -400);
    place(c, 0, 400);
    expect(g.ability(you, 2)).toBeNull();
    place(a, 50);
    place(b, -60, 20);
    place(c, ABILITY.stomp.reach + 60);
    quiet(a, b, c);
    a.cd = b.cd = c.cd = 99;
    expect(g.ability(you, 2)).toBe('stomp');
    expect(you.windT).toBeGreaterThan(0);
    // Winding up, it can do nothing else.
    expect(g.strike(you)).toBeNull();
    expect(g.ability(you, 0)).toBeNull();
    run(g, ABILITY.stomp.wind + 0.05, 0.05, at);
    expect([a.hp, b.hp, c.hp]).toEqual([
      KITS.damage.hearts - ABILITY.stomp.hit,
      KITS.damage.hearts - ABILITY.stomp.hit,
      KITS.damage.hearts,
    ]);
    expect(a.stunT).toBeGreaterThan(1);
    expect(c.stunT).toBe(0);
    expect(g.events.some((e) => e.k === 'stomp' && e.n === 2)).toBe(true);
    // Stunned: it does not move or strike, until the stun wears off.
    a.cd = 0;
    const [au, av] = [a.u, a.v];
    expect(g.strike(a)).toBeNull();
    run(g, 0.5, 0.05, at);
    expect([a.u, a.v]).toEqual([au, av]);
    run(g, ABILITY.stomp.stun, 0.05, at);
    expect(a.stunT).toBe(0);
  });

  it("the damage's leap lands it behind a foe further off, with a strike for three", () => {
    const g = new Ctf('pirate', 23, 1.12, 'damage', 2);
    open(g);
    const you = g.you as Fighter;
    const a = g.team('ninja').find((f) => f.role === 'damage') as Fighter;
    only(g, [you, a]);
    quiet(a);
    a.cd = 99;
    place(you, 0);
    place(a, ABILITY.leap.reach + 30);
    expect(g.ability(you, 1)).toBeNull();
    place(a, 180);
    expect(walkable(a.u, a.v)).toBe(true);
    expect(g.ability(you, 1)).toBe('leap');
    expect(Math.hypot(you.u - a.u, you.v - a.v)).toBeLessThan(20);
    expect(a.hp).toBe(KITS.damage.hearts - ABILITY.leap.hit);
    expect(walkable(you.u, you.v)).toBe(true);
    const e = g.events.find((x) => x.k === 'leap');
    expect(e && 'fu' in e ? [e.fu, e.fv] : null).toEqual([OPEN[0], OPEN[1]]);
  });

  it("the damage's bomb lands where a foe stood, and bursts on whoever is still in its ring", () => {
    const g = new Ctf('pirate', 24, 1.12, 'damage', 3);
    open(g);
    const you = g.you as Fighter;
    const [a, b] = g.team('ninja').filter((f) => f.role === 'damage') as [Fighter, Fighter];
    only(g, [you, a, b]);
    quiet(a, b);
    a.cd = b.cd = 99;
    place(you, 0);
    place(a, 150);
    place(b, 165, 10);
    expect(g.ability(you, 2)).toBe('bomb');
    expect(g.bombs).toHaveLength(1);
    // One walks out of the ring before it goes off; the other stays.
    place(a, 150 + ABILITY.bomb.ring + 40);
    a.stunT = b.stunT = 99;
    run(g, ABILITY.bomb.fly + ABILITY.bomb.fuse - 0.1, 0.05, at);
    expect(b.hp).toBe(KITS.damage.hearts);
    run(g, 0.2, 0.05, at);
    expect(g.bombs).toHaveLength(0);
    expect([a.hp, b.hp]).toEqual([KITS.damage.hearts, KITS.damage.hearts - ABILITY.bomb.hit]);
    expect(g.events.some((e) => e.k === 'burst' && e.n === 1)).toBe(true);
  });

  it("the healer's heal over time gives a heart a second for six seconds, never past full", () => {
    const g = new Ctf('pirate', 25, 1.12, 'healer', 2);
    open(g);
    const you = g.you as Fighter;
    const tank = g.team('pirate').find((f) => f.role === 'tank') as Fighter;
    only(g, [you, tank]);
    quiet(tank);
    place(you, 0);
    place(tank, 100);
    expect(g.ability(you, 1)).toBeNull();
    tank.hp = KITS.tank.hearts - 9;
    expect(g.ability(you, 1)).toBe('hot');
    const keep = () => {
      place(tank, 100);
      return at();
    };
    run(g, ABILITY.hot.lasts + 0.2, 0.05, keep);
    expect(tank.hp).toBe(KITS.tank.hearts - 9 + ABILITY.hot.lasts);
    expect(you.stats.healed).toBe(ABILITY.hot.lasts);
    expect(tank.hotT).toBe(0);
    you.abCd[1] = 0;
    tank.hp = KITS.tank.hearts - 2;
    expect(g.ability(you, 1)).toBe('hot');
    run(g, ABILITY.hot.lasts + 0.2, 0.05, keep);
    expect(tank.hp).toBe(KITS.tank.hearts);
  });

  it("the group heal: the pirates' shanty goes with its singer, slowed to half; the ninjas' lotus stays put", () => {
    for (const side of SIDES) {
      const g = new Ctf(side, 26, 1.12, 'healer', 3);
      open(g);
      const you = g.you as Fighter;
      const [tank, dmg] = [
        g.team(side).find((f) => f.role === 'tank'),
        g.team(side).find((f) => f.role === 'damage'),
      ] as [Fighter, Fighter];
      only(g, [you, tank, dmg]);
      quiet(tank, dmg);
      const base = onHalf(side, -40, 470);
      you.u = base[0];
      you.v = base[1];
      tank.u = dmg.u = base[0] + 120;
      tank.v = dmg.v = base[1];
      tank.hp = KITS.tank.hearts - 8;
      dmg.hp = KITS.damage.hearts - 7;
      const hold = () => {
        tank.u = dmg.u = base[0] + 120;
        tank.v = dmg.v = base[1];
        tank.stunT = dmg.stunT = 1;
      };
      expect(g.ability(you, 2)).toBe('group');
      const z = g.zones[0];
      expect(z?.follow).toBe(side === 'pirate');
      expect(you.singT > 0).toBe(side === 'pirate');
      // You walk off a little way: the shanty comes too, the lotus stays where it was laid.
      run(g, 1.1, 0.05, () => {
        hold();
        return [base[0] - 30, base[1]];
      });
      expect(z?.u).toBeCloseTo(side === 'pirate' ? base[0] - 30 : base[0], 6);
      run(g, ABILITY.group.lasts, 0.05, () => {
        hold();
        return [base[0] - 30, base[1]];
      });
      expect(g.zones).toHaveLength(0);
      expect(tank.hp).toBe(KITS.tank.hearts - 8 + ABILITY.group.lasts);
      expect(dmg.hp).toBe(KITS.damage.hearts - 7 + ABILITY.group.lasts);
    }
  });

  it('has the bots use every badge, on both sides', () => {
    const want = ['aim', 'bomb', 'group', 'guard', 'heal', 'hot', 'leap', 'taunt', 'wind'];
    const used = { pirate: new Set<string>(), ninja: new Set<string>() };
    for (let s = 30; s < 33; s++) {
      const g = new Ctf(null, s, 1, 'damage', 3);
      for (let t = 0; t < CTF.gates + CTF.clock && g.phase !== 'over'; t += 0.1) {
        g.update(0.1);
        for (const e of g.events.splice(0))
          if (want.includes(e.k) && 'f' in e && e.f) used[e.f.side].add(e.k);
      }
    }
    expect([...used.pirate].sort()).toEqual(want);
    expect([...used.ninja].sort()).toEqual(want);
  });

  it('stays even with every badge: bots alone, each side wins about as often, and every battle ends by its clock', () => {
    for (const badge of [2, 3] as const) {
      const wins = { pirate: 0, ninja: 0, draw: 0 };
      let caps = 0;
      const n = 40;
      for (let s = 1; s <= n; s++) {
        const g = new Ctf(null, s, 1, 'damage', badge);
        run(g, CTF.gates + CTF.clock + 1);
        expect(g.phase).toBe('over');
        wins[g.winner ?? 'draw']++;
        caps += g.score.pirate + g.score.ninja;
      }
      const decided = wins.pirate + wins.ninja;
      expect(decided).toBeGreaterThan(n * 0.5);
      expect(wins.pirate / decided).toBeGreaterThan(0.3);
      expect(wins.pirate / decided).toBeLessThan(0.7);
      expect(caps / n).toBeGreaterThan(1.5);
    }
  }, 60000);
});

describe('Hold the Forts', () => {
  /** A fighter stood at a point in its ring, the walker's way: where you stand is where you are put. */
  const standIn = (g: Ctf, f: Fighter, key: 'battery' | 'wreck' | 'bell') => {
    const h = g.hold(key);
    const [u, v] = g.holdSpot(f, h);
    f.u = u;
    f.v = v;
    return [u, v] as [number, number];
  };

  it('has three bases, nobody holding any, the two halves the mirror of each other, and the flags stay home', () => {
    const g = new Ctf('pirate', 1, 1.12, 'damage', 1, 'forts');
    expect(g.mode).toBe('forts');
    expect(g.clock).toBe(FORTS.clock);
    expect(g.holds.map((h) => [h.key, h.owner])).toEqual([
      ['battery', null],
      ['wreck', null],
      ['bell', null],
    ]);
    const [bat, wreck, bell] = g.holds as [Hold, Hold, Hold];
    expect([bat.u, bat.v]).toEqual([bell.u, -bell.v]);
    expect([wreck.u, wreck.v]).toEqual([0, 0]);
    // Every place a fighter stands in a ring is ground, on both halves, for every slot.
    for (const f of g.fighters)
      for (const h of g.holds) {
        const [u, v] = g.holdSpot(f, h);
        expect(walkable(u, v)).toBe(true);
        expect(Math.hypot(u - h.u, v - h.v)).toBeLessThanOrEqual(h.r);
      }
    run(g, CTF.gates + 120);
    expect(g.flags.pirate.at).toBe('home');
    expect(g.flags.ninja.at).toBe('home');
  });

  it('is taken by standing in its ring alone for five seconds; with a foe in it too, nobody gets anywhere', () => {
    const g = new Ctf('pirate', 2, 1.12, 'damage', 1, 'forts');
    open(g);
    const you = g.you as Fighter;
    const foe = g.team('ninja').find((f) => f.role === 'damage') as Fighter;
    only(g, [you, foe]);
    foe.stunT = 9999;
    foe.abCd = foe.abCd.map(() => 9999);
    foe.cd = 9999;
    foe.u = 0;
    foe.v = -300;
    const spot = standIn(g, you, 'battery');
    run(g, FORTS.take - 0.5, 0.1, () => spot);
    expect(g.hold('battery').owner).toBeNull();
    expect(g.hold('battery').by).toBe('pirate');
    // A foe walks in: it stops where it is.
    standIn(g, foe, 'battery');
    const t = g.hold('battery').t;
    run(g, 3, 0.1, () => spot);
    expect(g.hold('battery').contested).toBe(true);
    expect(g.hold('battery').t).toBeCloseTo(t, 5);
    // It goes: the rest of the five seconds, and the base is ours, counted to you.
    foe.u = 0;
    foe.v = -300;
    g.events.length = 0;
    run(g, 0.7, 0.1, () => spot);
    expect(g.hold('battery').owner).toBe('pirate');
    expect(
      g.events.some(
        (e) => e.k === 'take' && e.key === 'battery' && e.side === 'pirate' && e.fs.includes(you),
      ),
    ).toBe(true);
    expect(you.stats.takes).toBe(1);
  });

  it('takes theirs back by first undoing what they had done of taking it; a taking left alone fades', () => {
    const g = new Ctf('pirate', 3, 1.12, 'damage', 1, 'forts');
    open(g);
    const you = g.you as Fighter;
    const foe = g.team('ninja').find((f) => f.role === 'damage') as Fighter;
    only(g, [you, foe]);
    foe.stunT = 9999;
    foe.cd = 9999;
    foe.abCd = foe.abCd.map(() => 9999);
    you.u = 0;
    you.v = 600;
    standIn(g, foe, 'wreck');
    run(g, 3, 0.1, () => [you.u, you.v]);
    expect(g.hold('wreck').by).toBe('ninja');
    // It leaves: what it had done fades at half the pace.
    foe.u = -380;
    foe.v = -600;
    run(g, 2, 0.1, () => [you.u, you.v]);
    expect(g.hold('wreck').t).toBeCloseTo(2, 1);
    // You go in: two seconds to undo it, then five more to take it.
    const spot = standIn(g, you, 'wreck');
    run(g, 2.2, 0.1, () => spot);
    expect(g.hold('wreck').by).toBe('pirate');
    run(g, FORTS.take, 0.1, () => spot);
    expect(g.hold('wreck').owner).toBe('pirate');
  });

  it('scores 1, 3 and 10 a second for one, two and three bases, and the first to the total wins', () => {
    const g = new Ctf('pirate', 4, 1.12, 'damage', 1, 'forts');
    open(g);
    only(g, []);
    const you = g.you as Fighter;
    you.state = 'down';
    for (const [n, rate] of [
      [1, 1],
      [2, 3],
      [3, 10],
    ] as const) {
      g.holds.forEach((h, i) => {
        h.owner = i < n ? 'pirate' : null;
      });
      const s = g.score.pirate;
      run(g, 2, 0.1);
      expect(g.score.pirate - s).toBeCloseTo(rate * 2, 1);
      expect(g.score.ninja).toBe(0);
    }
    run(g, 60, 0.1);
    expect(g.phase).toBe('over');
    expect(g.winner).toBe('pirate');
    expect(g.score.pirate).toBeGreaterThanOrEqual(FORTS.win);
  });

  it('stays even: bots alone take the bases back and forth, each side wins about as often, every battle ending', () => {
    for (const badge of [1, 3] as const) {
      const wins = { pirate: 0, ninja: 0, draw: 0 };
      let takes = 0;
      let len = 0;
      const n = 30;
      for (let s = 1; s <= n; s++) {
        const g = new Ctf(null, s, 1, 'damage', badge, 'forts');
        let t = 0;
        for (; t < CTF.gates + FORTS.clock + 1 && g.phase !== 'over'; t += 0.1) {
          g.update(0.1);
          takes += g.events.filter((e) => e.k === 'take').length;
          g.events.length = 0;
        }
        expect(g.phase).toBe('over');
        wins[g.winner ?? 'draw']++;
        len += t;
      }
      const decided = wins.pirate + wins.ninja;
      expect(decided).toBeGreaterThan(n * 0.8);
      expect(wins.pirate / decided).toBeGreaterThan(0.3);
      expect(wins.pirate / decided).toBeLessThan(0.7);
      expect(takes / n).toBeGreaterThan(4);
      // About three to five minutes, the plan's.
      expect(len / n).toBeGreaterThan(150);
      expect(len / n).toBeLessThan(330);
    }
  }, 60000);
});
