/**
 * Capture the Flag on the Endless Isle, the owner's plan's first battle (2026-10-23): five a side, pirates against
 * ninjas, each side's flag in its fort at the far end of its half. Cross over, take theirs, and carry it home while
 * your own is still in its place. Three captures win, or the most when the clock runs out.
 *
 * A pure simulation in the island's own frame (u across the screen, v down it; the ninjas' half is v < 0): fighters,
 * the two flags, the bots that fill both teams, the score. You are one of the fighters, moved from outside; everyone
 * else is a bot. Seeded, so a battle replays the same.
 */

import { rng } from '../core/math';
import {
  ABILITY,
  ABILITY_I,
  type Ability,
  BOT_NAMES,
  CTF,
  KITS,
  type Kit,
  type Role,
  TEAM,
} from '../data/battle';
import { FORT, GRAVE, onHalf, rival, SIDES, type Side } from '../world/endless';
import { clearLine, flowTo, steer, wading, walkable } from '../world/endlessnav';

/** What a bot is out to do when nothing more pressing comes up. */
export type Job = 'attack' | 'defend' | 'mid' | 'escort';

export type Fighter = {
  readonly id: number;
  /** Its place in its team, 0 to 4, the same on both sides: what decides where it stands, so the sides mirror. */
  readonly slot: number;
  readonly side: Side;
  readonly role: Role;
  readonly name: string;
  /** You, or one of the bots. */
  readonly bot: boolean;
  readonly kit: Kit;
  u: number;
  v: number;
  /** Which way it faces, an angle in the island's frame. */
  face: number;
  hp: number;
  /** Until its next attack. */
  cd: number;
  state: 'live' | 'down';
  /** Down: until it is back up at its graveyard. */
  downT: number;
  /** Carrying the other side's flag. */
  carrying: boolean;
  job: Job;
  /** The foe it is after, if any. */
  target: Fighter | null;
  /** For drawing: how long since it swung, and since it was hit. */
  swingT: number;
  hurtT: number;
  /** Until it thinks again. */
  thinkT: number;
  /** The way it is walking, and whether it is walking. */
  du: number;
  dv: number;
  moving: boolean;
  /** Where it last decided to go, and the way there it worked out then. */
  gu: number;
  gv: number;
  dir: [number, number] | null;
  /** Its battle: flags taken, captured and sent home, and foes beaten. */
  /** Its Badge I ability, and how long until it is ready again. */
  readonly ab: Ability;
  abCd: number;
  /** Taunted: made to come at this foe, for so long. */
  tauntBy: Fighter | null;
  tauntT: number;
  /** Aiming a shot at a foe, so long still to go; below 0 when it is not. */
  aimT: number;
  aimAt: Fighter | null;
  stats: { carries: number; caps: number; returns: number; beaten: number; healed: number };
};

export type FlagAt = 'home' | 'carried' | 'dropped';
export type Flag = {
  readonly side: Side;
  at: FlagAt;
  u: number;
  v: number;
  by: Fighter | null;
  t: number;
};

export type CtfEvent =
  | { k: 'go' }
  | { k: 'pickup' | 'drop' | 'return' | 'capture'; side: Side; f: Fighter | null }
  | { k: 'hit'; f: Fighter; by: Fighter | null; n: number }
  | { k: 'swing'; f: Fighter; to: Fighter }
  | { k: 'down' | 'up'; f: Fighter; by?: Fighter | null }
  | { k: 'taunt'; f: Fighter; n: number }
  | { k: 'aim'; f: Fighter; to: Fighter }
  | { k: 'shot'; f: Fighter; to: Fighter | null }
  | { k: 'heal'; f: Fighter; to: Fighter; n: number }
  | { k: 'over'; winner: Side | 'draw' };

/** A fighter's size, for keeping out of each other's way. */
const BODY = 8;
/** How often a bot thinks again. */
const THINK = 0.25;
/** How near a foe has to be before a bot turns to fight it, by job; the healer stands off at its reach. */
const AGGRO: Readonly<Record<Job, number>> = { attack: 60, defend: 170, mid: 150, escort: 160 };
/** With this long left on the clock, a side not ahead sends its middle in too. */
const LATE = 150;
/** How far out from its fort a defender will go after someone. */
const GUARD = 320;

/** Where each side's flag stands, in the middle of its fort. */
export function flagHome(side: Side): [number, number] {
  return onHalf(side, FORT.u, FORT.w);
}
/** Where a side's beaten get up again: by its graveyard, on the side toward the channel. */
export function graveSpot(side: Side): [number, number] {
  return onHalf(side, GRAVE.u, GRAVE.w - GRAVE.r - 18);
}
/** Where a side waits behind its gate before the battle: a row inside the fort, in front of the flag. */
export function gateSpot(side: Side, i: number): [number, number] {
  return onHalf(side, FORT.u + (i - 2) * 26, FORT.w - 46 - (i % 2) * 14);
}
/** Inside a side's fort, away from its wall: where everyone waits for the gates. */
export function inFort(side: Side, u: number, v: number, pad = 0): boolean {
  const [fu, fv] = flagHome(side);
  return Math.hypot(u - fu, v - fv) < FORT.r - FORT.wall - BODY - pad;
}
/** Where a defender stands, before its gate; where a bot holding the middle stands, at its own shore. */
function guardSpot(side: Side): [number, number] {
  return onHalf(side, FORT.u, FORT.w - FORT.r - 70);
}
function midSpot(side: Side, i: number): [number, number] {
  return onHalf(side, i % 2 ? 170 : -170, 230);
}

export class Ctf {
  readonly fighters: Fighter[] = [];
  readonly flags: Record<Side, Flag>;
  readonly score: Record<Side, number> = { pirate: 0, ninja: 0 };
  /** Which side you fight for, or null for a battle of bots alone. */
  readonly yours: Side | null;
  readonly you: Fighter | null = null;
  phase: 'gates' | 'fight' | 'over' = 'gates';
  /** Before the gates drop, then the battle's clock. */
  gateT: number = CTF.gates;
  clock: number = CTF.clock;
  /** How long both flags have been out of their forts together. */
  bothOutT = 0;
  winner: Side | 'draw' | null = null;
  readonly events: CtfEvent[] = [];
  private readonly rand: () => number;
  /** Everyone, and everyone the other way round: who goes first takes turns, so neither side always strikes first. */
  private readonly back: Fighter[] = [];
  private tick = 0;
  /** The side you fight against attacks a little slower, so a kid wins a bit more than half the time. */
  private readonly foeSlow: number;

  /** You fight for yours, in the role given; null for a battle of bots alone. */
  constructor(yours: Side | null, seed = 1, foeSlow = 1.12, yourRole: Role = 'damage') {
    this.yours = yours;
    this.rand = rng(seed);
    this.foeSlow = yours ? foeSlow : 1;
    this.flags = {
      pirate: this.homeFlag('pirate'),
      ninja: this.homeFlag('ninja'),
    };
    let id = 0;
    for (const side of SIDES) {
      const names = BOT_NAMES[side];
      let n = 0;
      // Mixed so neither side always has the lower ids, which think first.
      for (let i = 0; i < TEAM.length; i++) {
        const role = TEAM[i] as Role;
        const isYou = side === yours && i === TEAM.indexOf(yourRole);
        const [u, v] = gateSpot(side, i);
        const f: Fighter = {
          id: id++,
          slot: i,
          side,
          role,
          name: isYou ? 'You' : (names[n++] ?? 'Bot'),
          bot: !isYou,
          kit: KITS[role],
          u,
          v,
          face: side === 'pirate' ? -Math.PI / 2 : Math.PI / 2,
          hp: KITS[role].hearts,
          cd: 0,
          state: 'live',
          downT: 0,
          carrying: false,
          job: 'mid',
          target: null,
          swingT: 9,
          hurtT: 9,
          thinkT: this.rand() * THINK,
          du: 0,
          dv: 0,
          moving: false,
          gu: u,
          gv: v,
          dir: null,
          ab: ABILITY_I[role],
          abCd: 0,
          tauntBy: null,
          tauntT: 0,
          aimT: -1,
          aimAt: null,
          stats: { carries: 0, caps: 0, returns: 0, beaten: 0, healed: 0 },
        };
        if (isYou) (this as { you: Fighter | null }).you = f;
        this.fighters.push(f);
      }
    }
    // Jobs: the tank guards the flag, the healer goes with the attack, the damage go for their flag, one of them (or
    // with you on the team, the one left) holding the middle. You the tank, one of them guards the flag instead.
    for (const side of SIDES) {
      const team = this.fighters.filter((f) => f.side === side && f.bot);
      let dmg = 0;
      const dmgJobs: Job[] =
        side !== yours || yourRole === 'healer'
          ? ['attack', 'attack', 'mid']
          : yourRole === 'tank'
            ? ['attack', 'mid', 'defend']
            : ['attack', 'mid'];
      for (const f of team)
        f.job =
          f.role === 'tank'
            ? 'defend'
            : f.role === 'healer'
              ? 'escort'
              : (dmgJobs[dmg++] ?? 'attack');
    }
    this.back.push(...[...this.fighters].reverse());
  }

  private homeFlag(side: Side): Flag {
    const [u, v] = flagHome(side);
    return { side, at: 'home', u, v, by: null, t: 0 };
  }

  /** A side's fighters. */
  team(side: Side): Fighter[] {
    return this.fighters.filter((f) => f.side === side);
  }

  /** Move on dt seconds. You are wherever you were put (you: your place in the island's frame). */
  update(dt: number, you?: readonly [number, number]): void {
    if (this.phase === 'over') return;
    if (this.you && you && this.you.state === 'live') {
      const y = this.you;
      const d = Math.hypot(you[0] - y.u, you[1] - y.v);
      if (d > 0.5) {
        y.face = Math.atan2(you[1] - y.v, you[0] - y.u);
        y.moving = true;
      } else y.moving = false;
      y.u = you[0];
      y.v = you[1];
    }
    for (const f of this.fighters) {
      f.cd = Math.max(0, f.cd - dt);
      f.abCd = Math.max(0, f.abCd - dt);
      f.tauntT = Math.max(0, f.tauntT - dt);
      f.swingT += dt;
      f.hurtT += dt;
    }
    if (this.phase === 'gates') {
      this.gateT -= dt;
      if (this.gateT <= 0) {
        this.phase = 'fight';
        this.events.push({ k: 'go' });
      }
      return;
    }
    this.clock = Math.max(0, this.clock - dt);
    const fl = this.flags;
    this.bothOutT = fl.pirate.at !== 'home' && fl.ninja.at !== 'home' ? this.bothOutT + dt : 0;
    const all = this.tick++ % 2 ? this.back : this.fighters;
    for (const f of all) {
      if (f.state === 'down') {
        f.downT -= dt;
        if (f.downT <= 0) this.getUp(f);
        continue;
      }
      // A shot aimed goes off when its aim is done, yours too.
      if (f.aimT >= 0) {
        f.aimT -= dt;
        if (f.aimT < 0) this.fire(f);
        if (this.phase !== 'fight') return;
      }
      if (!f.bot) continue;
      f.thinkT -= dt;
      if (f.thinkT <= 0) {
        f.thinkT = THINK;
        this.think(f);
      }
      this.act(f, dt);
    }
    // Dropped flags, left alone, go home.
    for (const side of SIDES) {
      const flag = fl[side];
      if (flag.at !== 'dropped') continue;
      flag.t -= dt;
      if (flag.t <= 0) {
        this.sendHome(flag);
        this.events.push({ k: 'return', side, f: null });
      }
    }
    this.touches(all);
    if (this.clock <= 0 && this.phase === 'fight') {
      const p = this.score.pirate;
      const n = this.score.ninja;
      this.end(p > n ? 'pirate' : n > p ? 'ninja' : 'draw');
    }
  }

  private end(w: Side | 'draw'): void {
    this.phase = 'over';
    this.winner = w;
    this.events.push({ k: 'over', winner: w });
  }

  private sendHome(flag: Flag): void {
    const [u, v] = flagHome(flag.side);
    flag.at = 'home';
    flag.u = u;
    flag.v = v;
    flag.by = null;
  }

  /** Flags picked up, sent home and carried in. */
  private touches(all: readonly Fighter[]): void {
    for (const f of all) {
      if (f.state !== 'live') continue;
      const theirs = this.flags[rival(f.side)];
      const mine = this.flags[f.side];
      if (
        !f.carrying &&
        theirs.at !== 'carried' &&
        Math.hypot(theirs.u - f.u, theirs.v - f.v) < CTF.touch
      ) {
        theirs.at = 'carried';
        theirs.by = f;
        f.carrying = true;
        f.stats.carries++;
        this.events.push({ k: 'pickup', side: theirs.side, f });
      }
      if (mine.at === 'dropped' && Math.hypot(mine.u - f.u, mine.v - f.v) < CTF.touch) {
        this.sendHome(mine);
        f.stats.returns++;
        this.events.push({ k: 'return', side: mine.side, f });
      }
      if (f.carrying && mine.at === 'home' && Math.hypot(mine.u - f.u, mine.v - f.v) < CTF.touch) {
        f.carrying = false;
        f.stats.caps++;
        this.sendHome(theirs);
        this.score[f.side]++;
        this.events.push({ k: 'capture', side: f.side, f });
        if (this.score[f.side] >= CTF.win) {
          this.end(f.side);
          return;
        }
      }
    }
    // A carrier's flag goes where it goes.
    for (const side of SIDES) {
      const flag = this.flags[side];
      if (flag.at === 'carried' && flag.by) {
        flag.u = flag.by.u;
        flag.v = flag.by.v;
      }
    }
  }

  private getUp(f: Fighter): void {
    const [u, v] = graveSpot(f.side);
    f.state = 'live';
    f.hp = f.kit.hearts;
    f.u = u + ((f.slot % 3) - 1) * 14;
    f.v = v;
    f.target = null;
    f.thinkT = 0;
    f.tauntT = 0;
    this.events.push({ k: 'up', f });
  }

  /** Hearts off a fighter: from a foe's blow, or from your minion. A carrier takes one more once both flags have been
   * out a while. */
  hurt(f: Fighter, n: number, by: Fighter | null = null): void {
    if (f.state !== 'live' || this.phase !== 'fight') return;
    const extra = f.carrying && this.bothOutT >= CTF.bothOut ? 1 : 0;
    const k = n + extra;
    f.hp = Math.max(0, f.hp - k);
    f.hurtT = 0;
    this.events.push({ k: 'hit', f, by, n: k });
    if (f.hp > 0) return;
    f.state = 'down';
    f.downT = CTF.respawn;
    f.target = null;
    f.aimT = -1;
    f.aimAt = null;
    f.tauntT = 0;
    if (by) by.stats.beaten++;
    this.events.push({ k: 'down', f, by });
    if (f.carrying) {
      f.carrying = false;
      const flag = this.flags[rival(f.side)];
      flag.at = 'dropped';
      flag.by = null;
      flag.u = f.u;
      flag.v = f.v;
      flag.t = CTF.dropped;
      this.events.push({ k: 'drop', side: flag.side, f });
    }
  }

  /** The nearest live foe of a fighter within its reach, if any. */
  inReach(f: Fighter, pad = 6): Fighter | null {
    let best: Fighter | null = null;
    let bd = f.kit.reach + pad;
    for (const e of this.fighters) {
      if (e.side === f.side || e.state !== 'live') continue;
      const d = Math.hypot(e.u - f.u, e.v - f.v);
      if (d <= bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  /** You strike (or throw) at the nearest foe in reach, if your last attack is done; who was struck, if anyone. */
  strike(f: Fighter | null = this.you): Fighter | null {
    if (f?.state !== 'live' || this.phase !== 'fight' || f.cd > 0) return null;
    const to = this.inReach(f);
    if (!to) return null;
    this.blow(f, to);
    return to;
  }

  /** The side you fight against goes a little slower, its attacks and its abilities alike. */
  private slowOf(f: Fighter): number {
    return f.bot && this.yours && f.side !== this.yours ? this.foeSlow : 1;
  }

  /**
   * A fighter's ability, if it is ready and there is something for it: the tank's shout makes every foe close by come
   * at it; the damage's shot aims at the nearest foe in reach, a carrier first, and goes off when the aim is done; the
   * healer's heal goes to the most hurt teammate near, or itself. What it did, or null if nothing.
   */
  ability(f: Fighter | null = this.you, at: Fighter | null = null): Ability | null {
    if (f?.state !== 'live' || this.phase !== 'fight' || f.abCd > 0 || f.aimT >= 0) return null;
    const every = ABILITY[f.ab].every * this.slowOf(f);
    if (f.ab === 'taunt') {
      const near = this.fighters.filter(
        (e) =>
          e.side !== f.side &&
          e.state === 'live' &&
          Math.hypot(e.u - f.u, e.v - f.v) <= ABILITY.taunt.reach,
      );
      if (!near.length) return null;
      for (const e of near) {
        e.tauntBy = f;
        e.tauntT = ABILITY.taunt.lasts;
        if (e.bot) e.target = f;
      }
      f.abCd = every;
      f.swingT = 0;
      this.events.push({ k: 'taunt', f, n: near.length });
      return 'taunt';
    }
    if (f.ab === 'shot') {
      const to = at ?? this.shotAt(f);
      if (!to) return null;
      f.aimT = ABILITY.shot.aim;
      f.aimAt = to;
      f.face = Math.atan2(to.v - f.v, to.u - f.u);
      f.abCd = every;
      this.events.push({ k: 'aim', f, to });
      return 'shot';
    }
    const to = this.mostHurt(f, 1);
    if (!to) return null;
    const n = Math.min(ABILITY.heal.hearts, to.kit.hearts - to.hp);
    to.hp += n;
    f.stats.healed += n;
    f.abCd = every;
    f.swingT = 0;
    this.events.push({ k: 'heal', f, to, n });
    return 'heal';
  }

  /** A shot's aim done: it hits, if what it aimed at is still up and not too far gone. */
  private fire(f: Fighter): void {
    const to = f.aimAt;
    f.aimAt = null;
    f.aimT = -1;
    f.swingT = 0;
    if (to?.state === 'live' && Math.hypot(to.u - f.u, to.v - f.v) <= ABILITY.shot.reach * 1.25) {
      this.events.push({ k: 'shot', f, to });
      this.hurt(to, ABILITY.shot.hit, f);
    } else this.events.push({ k: 'shot', f, to: null });
  }

  /** The foe a shot goes at: the nearest in reach, one carrying a flag first. */
  private shotAt(f: Fighter): Fighter | null {
    let best: Fighter | null = null;
    let bs = Infinity;
    for (const e of this.fighters) {
      if (e.side === f.side || e.state !== 'live') continue;
      const d = Math.hypot(e.u - f.u, e.v - f.v);
      if (d > ABILITY.shot.reach) continue;
      const s = d - (e.carrying ? 1000 : 0);
      if (s < bs) {
        bs = s;
        best = e;
      }
    }
    return best;
  }

  /** The teammate in a heal's reach (itself included) missing the most of its hearts, at least so many. */
  private mostHurt(f: Fighter, least: number): Fighter | null {
    let best: Fighter | null = null;
    let bm = least - 0.5;
    for (const t of this.fighters) {
      if (t.side !== f.side || t.state !== 'live') continue;
      if (Math.hypot(t.u - f.u, t.v - f.v) > ABILITY.heal.reach) continue;
      const m = t.kit.hearts - t.hp + (t.carrying ? 0.5 : 0);
      if (m > bm) {
        bm = m;
        best = t;
      }
    }
    return best;
  }

  /**
   * When a bot uses its ability: a healer once a teammate near is three hearts down; a shot whenever a foe is in its
   * reach; the tank's shout once two foes are close, or one close is after a teammate or carries our flag.
   */
  private botAbility(f: Fighter): void {
    if (f.abCd > 0 || f.aimT >= 0) return;
    if (f.ab === 'heal') {
      if (this.mostHurt(f, 3)) this.ability(f);
      return;
    }
    if (f.ab === 'shot') {
      // Only at the foe it is after, to reach it before it gets close.
      const t = f.target;
      if (t?.state !== 'live') return;
      const d = Math.hypot(t.u - f.u, t.v - f.v);
      if (d > f.kit.reach + 30 && d <= ABILITY.shot.reach) this.ability(f, t);
      return;
    }
    let n = 0;
    let want = false;
    for (const e of this.fighters) {
      if (e.side === f.side || e.state !== 'live') continue;
      if (Math.hypot(e.u - f.u, e.v - f.v) > ABILITY.taunt.reach) continue;
      n++;
      if (e.carrying || (e.target && e.target !== f)) want = true;
    }
    if (n >= 2 || (n && want)) this.ability(f);
  }

  private blow(f: Fighter, to: Fighter): void {
    const slow = this.slowOf(f);
    f.cd = f.kit.every * slow;
    f.swingT = 0;
    f.face = Math.atan2(to.v - f.v, to.u - f.u);
    this.events.push({ k: 'swing', f, to });
    this.hurt(to, f.kit.hit, f);
  }

  /** How many on a fighter's team are already after a foe. */
  private after(e: Fighter, side: Side): number {
    let n = 0;
    for (const f of this.fighters) if (f.side === side && f.target === e && f.state === 'live') n++;
    return n;
  }

  /**
   * A foe worth turning to, within range of a point (the bot itself, or the teammate it is guarding): the one
   * carrying our flag above all, else the nearest, spread out over the foes so nobody, you included, is set on by
   * more of them than anyone else.
   */
  private pickFoe(f: Fighter, range: number, au = f.u, av = f.v): Fighter | null {
    let best: Fighter | null = null;
    let bs = Infinity;
    for (const e of this.fighters) {
      if (e.side === f.side || e.state !== 'live') continue;
      const d = Math.hypot(e.u - au, e.v - av);
      if (d > (e.carrying ? range * 1.6 : range)) continue;
      const already = this.after(e, f.side) - (f.target === e ? 1 : 0);
      // Never more than two on you at once, unless you have their flag.
      if (!e.bot && !e.carrying && already >= 2) continue;
      const s = Math.hypot(e.u - f.u, e.v - f.v) + already * 60 - (e.carrying ? 200 : 0);
      if (s < bs) {
        bs = s;
        best = e;
      }
    }
    return best;
  }

  /** The n of a side nearest a point, alive and not carrying. */
  private nearestTo(side: Side, u: number, v: number, n: number): Fighter[] {
    return this.fighters
      .filter((f) => f.side === side && f.state === 'live' && f.bot && !f.carrying)
      .sort((a, b) => Math.hypot(a.u - u, a.v - v) - Math.hypot(b.u - u, b.v - v))
      .slice(0, n);
  }

  /**
   * The bots' minds, four times a second: who to fight, if anyone, and where to go. A carrier runs home and fights only
   * what is in its way. The two nearest our flag lying out go and touch it home. With theirs carrying ours, the
   * defender and the middle go after the carrier. With one of ours carrying theirs, everyone else goes with the carrier
   * and fights whoever comes for it. Otherwise each does its job, turning to fight what comes near enough: an attacker
   * only what is right in its way, on its way to their flag.
   *
   * It goes straight at what it is after when the way is clear; otherwise it follows the way to where that is going
   * (a carrier's home, their flag), the same few ways for everyone, worked out once.
   */
  private think(f: Fighter): void {
    const mine = this.flags[f.side];
    const theirs = this.flags[rival(f.side)];
    const ours = theirs.at === 'carried' ? theirs.by : null;
    const thief = mine.at === 'carried' ? mine.by : null;
    /** What it goes straight at when it can, and where it follows the way to when it cannot. */
    let aim: [number, number];
    let route: [number, number];
    f.target = null;
    const taunter = f.tauntT > 0 && f.tauntBy?.state === 'live' ? f.tauntBy : null;
    if (taunter) {
      // Taunted, it has to come at whoever shouted, even carrying a flag.
      f.target = taunter;
      aim = route = [taunter.u, taunter.v];
    } else if (f.carrying) {
      f.target = this.inReach(f, 0);
      aim = route = flagHome(f.side);
    } else if (mine.at === 'dropped' && this.nearestTo(f.side, mine.u, mine.v, 2).includes(f)) {
      f.target = this.inReach(f, 0);
      aim = route = [mine.u, mine.v];
    } else if (thief && f.job === 'defend') {
      f.target = thief;
      aim = [thief.u, thief.v];
      route = flagHome(thief.side);
    } else if (ours) {
      f.target = this.pickFoe(f, 150, ours.u, ours.v);
      aim = f.target ? [f.target.u, f.target.v] : [ours.u, ours.v];
      route = flagHome(f.side);
    } else {
      const [hu, hv] = flagHome(f.side);
      const foe = this.pickFoe(f, AGGRO[f.job]);
      if (foe && (f.job !== 'defend' || Math.hypot(foe.u - hu, foe.v - hv) < GUARD || foe.carrying))
        f.target = foe;
      [aim, route] = this.goal(f);
      if (f.target) aim = [f.target.u, f.target.v];
    }
    f.gu = route[0];
    f.gv = route[1];
    const d = Math.hypot(aim[0] - f.u, aim[1] - f.v);
    if (d < 1) f.dir = [0, 0];
    else if (d < 260 && clearLine(f.u, f.v, aim[0], aim[1]))
      f.dir = [(aim[0] - f.u) / d, (aim[1] - f.v) / d];
    else f.dir = steer(flowTo(route[0], route[1]), f.u, f.v);
    if (!f.target) {
      f.gu = aim[0];
      f.gv = aim[1];
    }
    this.botAbility(f);
  }

  /** Where a bot is heading when it has nothing more pressing, by its job: where it aims, and the way it follows there. */
  private goal(f: Fighter): [[number, number], [number, number]] {
    const theirs = this.flags[rival(f.side)];
    const flag: [number, number] = [theirs.u, theirs.v];
    // Late on, not ahead, the middle goes for their flag too.
    const push = this.clock < LATE && this.score[f.side] <= this.score[rival(f.side)];
    if (f.job === 'attack' || (f.job === 'mid' && (theirs.at === 'dropped' || push)))
      return [flag, flag];
    if (f.job === 'escort') {
      // With the nearest teammate going for their flag (you count), the way they are going.
      const lead = this.fighters
        .filter(
          (t) =>
            t.side === f.side && t.state === 'live' && t !== f && (t.job === 'attack' || !t.bot),
        )
        .sort((a, b) => Math.hypot(a.u - f.u, a.v - f.v) - Math.hypot(b.u - f.u, b.v - f.v))[0];
      if (lead) return [[lead.u, lead.v], flag];
      const m = midSpot(f.side, f.slot);
      return [m, m];
    }
    const spot = f.job === 'defend' ? guardSpot(f.side) : midSpot(f.side, f.slot);
    return [spot, spot];
  }

  /**
   * A bot does what it decided: strikes its foe when it is in reach, closes in on it (the healer keeping its distance),
   * or walks the way it worked out. Close to its foe it goes straight at it.
   */
  private act(f: Fighter, dt: number): void {
    if (f.aimT >= 0) {
      f.moving = false;
      return;
    }
    const t = f.target && f.target.state === 'live' ? f.target : null;
    let stopAt = 6;
    let gu = f.gu;
    let gv = f.gv;
    let dir = f.dir;
    if (t) {
      const d = Math.hypot(t.u - f.u, t.v - f.v);
      if (d <= f.kit.reach + 2 && f.cd <= 0) this.blow(f, t);
      if (!f.carrying) {
        gu = t.u;
        gv = t.v;
        stopAt = f.kit.thrown ? f.kit.reach * 0.8 : f.kit.reach - 6;
        if (d < 90 && d > 0) dir = [(t.u - f.u) / d, (t.v - f.v) / d];
      }
    }
    const dist = Math.hypot(gu - f.u, gv - f.v);
    if (dist <= stopAt || !dir || (dir[0] === 0 && dir[1] === 0)) {
      f.moving = false;
      if (t) f.face = Math.atan2(t.v - f.v, t.u - f.u);
      return;
    }
    // Keep a little apart from teammates.
    let [du, dv] = dir;
    for (const o of this.fighters) {
      if (o === f || o.side !== f.side || o.state !== 'live') continue;
      const ou = f.u - o.u;
      const ov = f.v - o.v;
      const od = Math.hypot(ou, ov);
      if (od > 0 && od < BODY * 2) {
        du += (ou / od) * 0.6;
        dv += (ov / od) * 0.6;
      }
    }
    const dl = Math.hypot(du, dv) || 1;
    du /= dl;
    dv /= dl;
    const pace = f.kit.speed * (f.carrying ? CTF.carry : 1) * (wading(f.u, f.v) ? 0.5 : 1);
    this.move(f, du * pace * dt, dv * pace * dt);
    f.du = du;
    f.dv = dv;
    f.moving = true;
    f.face = Math.atan2(dv, du);
  }

  /** Step, sliding along whatever is in the way. */
  private move(f: Fighter, mu: number, mv: number): void {
    if (walkable(f.u + mu, f.v + mv)) {
      f.u += mu;
      f.v += mv;
    } else if (walkable(f.u + mu, f.v)) f.u += mu;
    else if (walkable(f.u, f.v + mv)) f.v += mv;
    else f.thinkT = 0;
  }
}
