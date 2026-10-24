/**
 * Capture the Flag on the Endless Isle, the owner's plan's first battle (2026-10-23): five a side, pirates against
 * ninjas, each side's flag in its fort at the far end of its half. Cross over, take theirs, and carry it home while
 * your own is still in its place. Three captures win, or the most when the clock runs out.
 *
 * And its second, Hold the Forts (2026-10-24), the same fighters on the same island: three bases, each half's own and
 * the Shipwreck between. Stand in a base's ring with no foe in it to take it; each side scores every second for what
 * it holds, the more the much faster, and the first to its total wins. The flags stay in their forts.
 *
 * A pure simulation in the island's own frame (u across the screen, v down it; the ninjas' half is v < 0): fighters,
 * the two flags, the bots that fill both teams, the score. You are one of the fighters, moved from outside; everyone
 * else is a bot. Seeded, so a battle replays the same.
 */

import { rng } from '../core/math';
import {
  ABILITIES,
  ABILITY,
  type Ability,
  ARMOUR,
  type Badge,
  BOT_NAMES,
  CTF,
  FORTS,
  type HoldKey,
  KITS,
  type Kit,
  type Mode,
  type Role,
  TEAM,
} from '../data/battle';
import { FORT, GRAVE, HOLDS13, onHalf, rival, SIDES, type Side } from '../world/endless';
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
  /** Its abilities, one for each of its badges, and how long until each is ready again. */
  readonly abs: readonly Ability[];
  abCd: number[];
  /** Taunted: made to come at this foe, for so long. */
  tauntBy: Fighter | null;
  tauntT: number;
  /** Aiming a shot at a foe, so long still to go; below 0 when it is not. */
  aimT: number;
  aimAt: Fighter | null;
  /** Taking half damage, so long still; stunned, so long still; winding up a stomp, so long still (below 0 when not). */
  guardT: number;
  stunT: number;
  windT: number;
  /** A heal over time on it, so long still, from whom, and the part of a second toward its next heart. */
  hotT: number;
  hotBy: Fighter | null;
  hotAcc: number;
  /** Singing its sea shanty, so long still: it walks at half speed. */
  singT: number;
  /** Its battle: flags taken, captured and sent home, bases taken, foes beaten, and hearts healed. */
  stats: {
    carries: number;
    caps: number;
    returns: number;
    takes: number;
    beaten: number;
    healed: number;
  };
};

/** A group heal on the ground: a heart a second for every teammate in it, for so long; it goes with the singer, or stays
 * where it was laid down. */
export type Zone = {
  readonly side: Side;
  readonly by: Fighter;
  u: number;
  v: number;
  t: number;
  acc: number;
  readonly follow: boolean;
};
/** A bomb thrown: in the air so long still, then on the ground until it bursts. */
export type Bomb = {
  readonly side: Side;
  readonly by: Fighter;
  readonly u: number;
  readonly v: number;
  readonly fu: number;
  readonly fv: number;
  fly: number;
  t: number;
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

/**
 * A base in Hold the Forts: whose it is, and who is taking it and how far they have got (seconds stood in its ring).
 * A side taking another's base first undoes what the other had done of taking it.
 */
export type Hold = {
  readonly key: HoldKey;
  /** The half it stands on, or none for the Shipwreck. */
  readonly half: Side | null;
  readonly u: number;
  readonly v: number;
  readonly r: number;
  owner: Side | null;
  by: Side | null;
  t: number;
  /** Both sides in its ring. */
  contested: boolean;
};

export type CtfEvent =
  | { k: 'go' }
  | { k: 'take'; key: HoldKey; side: Side; fs: Fighter[] }
  | { k: 'threat'; key: HoldKey; side: Side }
  | { k: 'pickup' | 'drop' | 'return' | 'capture'; side: Side; f: Fighter | null }
  | { k: 'hit'; f: Fighter; by: Fighter | null; n: number }
  | { k: 'swing'; f: Fighter; to: Fighter }
  | { k: 'down' | 'up'; f: Fighter; by?: Fighter | null }
  | { k: 'taunt'; f: Fighter; n: number }
  | { k: 'aim'; f: Fighter; to: Fighter }
  | { k: 'shot'; f: Fighter; to: Fighter | null }
  | { k: 'heal'; f: Fighter; to: Fighter; n: number }
  | { k: 'guard' | 'wind' | 'group'; f: Fighter }
  | { k: 'stomp'; f: Fighter; n: number }
  | { k: 'leap'; f: Fighter; to: Fighter; fu: number; fv: number }
  | { k: 'bomb'; f: Fighter; u: number; v: number }
  | { k: 'burst'; f: Fighter; u: number; v: number; n: number }
  | { k: 'hot'; f: Fighter; to: Fighter }
  | { k: 'mend'; f: Fighter; to: Fighter; n: number }
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
  /** Which battle: Capture the Flag, or Hold the Forts. */
  readonly mode: Mode;
  /** Hold the Forts' three bases; none in Capture the Flag. */
  readonly holds: Hold[] = [];
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
  /** Group heals on the ground, and bombs thrown. */
  readonly zones: Zone[] = [];
  readonly bombs: Bomb[] = [];
  /** How many badges everyone has, so how many abilities: yours in the role you fight in, the bots' the same. */
  readonly badge: Badge;
  private readonly rand: () => number;
  /** Everyone, and everyone the other way round: who goes first takes turns, so neither side always strikes first. */
  private readonly back: Fighter[] = [];
  private tick = 0;
  /** The side you fight against attacks a little slower, so a kid wins a bit more than half the time. */
  private readonly foeSlow: number;

  /**
   * You fight for yours, in the role given, with your badges in it; null for a battle of bots alone. Everyone has as
   * many badges as you, so they have what you have. Capture the Flag, unless it is Hold the Forts.
   */
  constructor(
    yours: Side | null,
    seed = 1,
    foeSlow = 1.12,
    yourRole: Role = 'damage',
    badge: Badge = 1,
    mode: Mode = 'flag',
  ) {
    this.yours = yours;
    this.badge = badge;
    this.mode = mode;
    if (mode === 'forts') {
      this.clock = FORTS.clock;
      for (const h of HOLDS13)
        this.holds.push({ ...h, owner: null, by: null, t: 0, contested: false });
    }
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
          abs: ABILITIES[role].slice(0, badge),
          abCd: ABILITIES[role].slice(0, badge).map(() => 0),
          tauntBy: null,
          tauntT: 0,
          aimT: -1,
          aimAt: null,
          guardT: 0,
          stunT: 0,
          windT: -1,
          hotT: 0,
          hotBy: null,
          hotAcc: 0,
          singT: 0,
          stats: { carries: 0, caps: 0, returns: 0, takes: 0, beaten: 0, healed: 0 },
        };
        if (isYou) (this as { you: Fighter | null }).you = f;
        this.fighters.push(f);
      }
    }
    // Jobs: the tank guards the flag, the healer goes with the attack, the damage go for their flag, one of them (or
    // with you on the team, the one left) holding the middle. You the tank, one of them guards the flag instead.
    // Holding the forts, the tank holds the Shipwreck, the healer goes with whoever is nearest, and the damage hold
    // their own base, the Shipwreck and raid theirs (with you a damage, you are the Shipwreck's second).
    if (mode === 'forts') {
      for (const side of SIDES) {
        const dmgJobs: Job[] =
          side === yours && yourRole === 'damage'
            ? ['defend', 'attack']
            : ['defend', 'mid', 'attack'];
        let dmg = 0;
        for (const f of this.fighters)
          if (f.side === side && f.bot)
            f.job =
              f.role === 'tank'
                ? 'mid'
                : f.role === 'healer'
                  ? 'escort'
                  : (dmgJobs[dmg++] ?? 'mid');
      }
      this.back.push(...[...this.fighters].reverse());
      return;
    }
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
      for (let i = 0; i < f.abCd.length; i++) f.abCd[i] = Math.max(0, (f.abCd[i] ?? 0) - dt);
      f.tauntT = Math.max(0, f.tauntT - dt);
      f.guardT = Math.max(0, f.guardT - dt);
      f.stunT = Math.max(0, f.stunT - dt);
      f.singT = Math.max(0, f.singT - dt);
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
    if (this.mode === 'flag')
      this.bothOutT = fl.pirate.at !== 'home' && fl.ninja.at !== 'home' ? this.bothOutT + dt : 0;
    const all = this.tick++ % 2 ? this.back : this.fighters;
    for (const f of all) {
      if (f.state === 'down') {
        f.downT -= dt;
        if (f.downT <= 0) this.getUp(f);
        continue;
      }
      // A shot aimed goes off when its aim is done, and a stomp when its wind-up is, yours too.
      if (f.aimT >= 0) {
        f.aimT -= dt;
        if (f.aimT < 0) this.fire(f);
        if (this.phase !== 'fight') return;
      }
      if (f.windT >= 0) {
        f.windT -= dt;
        if (f.windT < 0) this.stomp(f);
        if (this.phase !== 'fight') return;
      }
      if (f.hotT > 0) this.hotTick(f, dt);
      if (!f.bot) continue;
      f.thinkT -= dt;
      if (f.thinkT <= 0) {
        f.thinkT = THINK;
        this.think(f);
      }
      this.act(f, dt);
    }
    this.zoneTicks(dt);
    this.bombTicks(dt);
    if (this.phase !== 'fight') return;
    if (this.mode === 'forts') {
      this.holdTicks(dt);
      return;
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

  /**
   * The bases: taken by a side alone in a ring long enough, undoing first what the other side had done of taking it,
   * a taking left alone fading back; then the points for what each side holds, and the end at the total or the clock.
   */
  private holdTicks(dt: number): void {
    for (const h of this.holds) {
      let p = 0;
      let n = 0;
      for (const f of this.fighters)
        if (f.state === 'live' && Math.hypot(f.u - h.u, f.v - h.v) <= h.r) {
          if (f.side === 'pirate') p++;
          else n++;
        }
      h.contested = p > 0 && n > 0;
      const alone: Side | null = p && !n ? 'pirate' : n && !p ? 'ninja' : null;
      if (h.contested) continue;
      if (alone && alone !== h.owner) {
        if (h.by && h.by !== alone) {
          h.t -= dt;
          if (h.t <= 0) {
            h.by = alone;
            h.t = -h.t;
          }
        } else {
          if (!h.by && h.owner) this.events.push({ k: 'threat', key: h.key, side: alone });
          h.by = alone;
          h.t += dt;
        }
        if (h.by === alone && h.t >= FORTS.take) {
          h.owner = alone;
          h.by = null;
          h.t = 0;
          const fs = this.fighters.filter(
            (f) =>
              f.side === alone && f.state === 'live' && Math.hypot(f.u - h.u, f.v - h.v) <= h.r,
          );
          for (const f of fs) f.stats.takes++;
          this.events.push({ k: 'take', key: h.key, side: alone, fs });
        }
      } else if (h.by) {
        // Nobody in it, or only its own side: what was done of taking it fades, at once for its own.
        h.t -= dt * (alone ? 1 : FORTS.fade);
        if (h.t <= 0) {
          h.t = 0;
          h.by = null;
        }
      }
    }
    for (const side of SIDES) {
      const n = this.holds.filter((h) => h.owner === side).length;
      this.score[side] += (FORTS.rate[n] ?? 0) * dt;
    }
    const p = this.score.pirate;
    const n = this.score.ninja;
    if (p >= FORTS.win || n >= FORTS.win) this.end(p > n ? 'pirate' : n > p ? 'ninja' : 'draw');
    else if (this.clock <= 0) this.end(p > n ? 'pirate' : n > p ? 'ninja' : 'draw');
  }

  /** A side's own base, and the other side's, and the Shipwreck. */
  hold(key: HoldKey): Hold {
    return this.holds.find((h) => h.key === key) as Hold;
  }
  private homeHold(side: Side): Hold {
    return this.hold(side === 'pirate' ? 'battery' : 'bell');
  }

  /** Where a bot holding the forts is going: by its job, and how the bases stand. */
  private objective(f: Fighter): Hold {
    const mine = this.homeHold(f.side);
    const theirs = this.homeHold(rival(f.side));
    const wreck = this.hold('wreck');
    const ours = (h: Hold) => h.owner === f.side && h.by === null;
    if (f.job === 'defend') return mine;
    if (f.job === 'mid') return ours(wreck) && !ours(mine) ? mine : wreck;
    // The raider: theirs, then the Shipwreck, then home, whichever is not ours yet; all ours, it holds theirs.
    for (const h of [theirs, wreck, mine]) if (!ours(h)) return h;
    return theirs;
  }

  /** Where in a base's ring a fighter stands: round its middle by its place in the team, the same on both halves; at
   * the Shipwreck, on its own side of the wreck. */
  holdSpot(f: Fighter, h: Hold): [number, number] {
    if (h.key === 'wreck') return [(f.slot - 2) * 13, f.side === 'pirate' ? 40 : -40];
    const a = (f.slot / 5) * Math.PI * 2 + 0.4;
    const s = h.half === 'pirate' ? 1 : -1;
    for (const r of [30, 24, 36]) {
      const u = h.u + Math.cos(a) * r;
      const v = h.v + Math.sin(a) * r * s;
      if (walkable(u, v)) return [u, v];
    }
    return [h.u + 26, h.v];
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
    this.calm(f);
    this.events.push({ k: 'up', f });
  }

  /** Whatever was going on with it, over: beaten, or back up. */
  private calm(f: Fighter): void {
    f.guardT = 0;
    f.stunT = 0;
    f.windT = -1;
    f.hotT = 0;
    f.hotBy = null;
    f.singT = 0;
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i] as Zone;
      if (z.by === f && z.follow) this.zones.splice(i, 1);
    }
  }

  /** Hearts off a fighter: from a foe's blow, or from your minion. A carrier takes one more once both flags have been
   * out a while; a guard halves it; then a tank's armour, or yours, takes a heart off it. */
  hurt(f: Fighter, n: number, by: Fighter | null = null): void {
    if (f.state !== 'live' || this.phase !== 'fight') return;
    const extra = f.carrying && this.bothOutT >= CTF.bothOut ? 1 : 0;
    const guarded = (n + extra) * (f.guardT > 0 ? ABILITY.guard.take : 1);
    const k =
      f.role === 'tank' || f === this.you ? Math.max(ARMOUR.least, guarded - ARMOUR.less) : guarded;
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
    this.calm(f);
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
    if (f?.state !== 'live' || this.phase !== 'fight' || f.cd > 0 || this.held(f)) return null;
    const to = this.inReach(f);
    if (!to) return null;
    this.blow(f, to);
    return to;
  }

  /** The side you fight against goes a little slower, its attacks and its abilities alike. */
  private slowOf(f: Fighter): number {
    return f.bot && this.yours && f.side !== this.yours ? this.foeSlow : 1;
  }

  /** Stunned, or winding up a stomp: it can do nothing else. */
  held(f: Fighter): boolean {
    return f.stunT > 0 || f.windT >= 0;
  }

  /**
   * One of a fighter's abilities, by its place (0 for Badge I's), if it is ready and there is something for it; what
   * it did, or null if nothing. Each aims itself:
   *
   * - the tank's shout makes every foe close by come at it; its guard halves what it takes for a while; its stomp
   *   winds up in a red ring, then hits and stuns every foe close round it;
   * - the damage's shot aims at the nearest foe in reach, a carrier first, and goes off when the aim is done; its leap
   *   lands it behind a foe further off with a strike; its bomb is thrown where it will catch the most foes, a carrier
   *   above all, and bursts a moment after it lands;
   * - the healer's heal goes to the most hurt teammate near, or itself; its heal over time to the same, a heart a
   *   second; its group heal to every teammate near, a heart a second, sung (the pirates', going with the singer, who
   *   walks at half speed) or laid on the ground (the ninjas', staying where it is).
   */
  ability(f: Fighter | null = this.you, slot = 0, at: Fighter | null = null): Ability | null {
    const ab = f?.abs[slot];
    if (!f || !ab || f.state !== 'live' || this.phase !== 'fight') return null;
    if ((f.abCd[slot] ?? 0) > 0 || f.aimT >= 0 || this.held(f)) return null;
    const every = ABILITY[ab].every * this.slowOf(f);
    const done = (): Ability => {
      f.abCd[slot] = every;
      return ab;
    };
    switch (ab) {
      case 'taunt': {
        const near = this.foesNear(f.u, f.v, f.side, ABILITY.taunt.reach);
        if (!near.length) return null;
        for (const e of near) {
          e.tauntBy = f;
          e.tauntT = ABILITY.taunt.lasts;
          if (e.bot) e.target = f;
        }
        f.swingT = 0;
        this.events.push({ k: 'taunt', f, n: near.length });
        return done();
      }
      case 'shot': {
        const to = at ?? this.nearestFoe(f, ABILITY.shot.reach);
        if (!to) return null;
        f.aimT = ABILITY.shot.aim;
        f.aimAt = to;
        f.face = Math.atan2(to.v - f.v, to.u - f.u);
        this.events.push({ k: 'aim', f, to });
        return done();
      }
      case 'heal': {
        const to = this.mostHurt(f, 1, ABILITY.heal.reach);
        if (!to) return null;
        const n = Math.min(ABILITY.heal.hearts, to.kit.hearts - to.hp);
        to.hp += n;
        f.stats.healed += n;
        f.swingT = 0;
        this.events.push({ k: 'heal', f, to, n });
        return done();
      }
      case 'guard': {
        f.guardT = ABILITY.guard.lasts;
        this.events.push({ k: 'guard', f });
        return done();
      }
      case 'stomp': {
        if (!this.foesNear(f.u, f.v, f.side, ABILITY.stomp.reach).length) return null;
        f.windT = ABILITY.stomp.wind;
        this.events.push({ k: 'wind', f });
        return done();
      }
      case 'leap': {
        const to = at ?? this.nearestFoe(f, ABILITY.leap.reach);
        if (!to) return null;
        const fu = f.u;
        const fv = f.v;
        // Down behind it, the way it was going, or in front if that is no place to stand.
        const d = Math.hypot(to.u - f.u, to.v - f.v) || 1;
        const du = (to.u - f.u) / d;
        const dv = (to.v - f.v) / d;
        const step = BODY * 2;
        if (walkable(to.u + du * step, to.v + dv * step)) {
          f.u = to.u + du * step;
          f.v = to.v + dv * step;
        } else {
          f.u = to.u - du * step;
          f.v = to.v - dv * step;
        }
        f.face = Math.atan2(to.v - f.v, to.u - f.u);
        f.swingT = 0;
        f.target = to;
        this.events.push({ k: 'leap', f, to, fu, fv });
        this.hurt(to, ABILITY.leap.hit, f);
        return done();
      }
      case 'bomb': {
        const to = at ?? this.bombAt(f);
        if (!to) return null;
        const B = ABILITY.bomb;
        this.bombs.push({
          side: f.side,
          by: f,
          u: to.u,
          v: to.v,
          fu: f.u,
          fv: f.v,
          fly: B.fly,
          t: B.fly + B.fuse,
        });
        f.face = Math.atan2(to.v - f.v, to.u - f.u);
        f.swingT = 0;
        this.events.push({ k: 'bomb', f, u: to.u, v: to.v });
        return done();
      }
      case 'hot': {
        const to = this.mostHurt(f, 1, ABILITY.hot.reach);
        if (!to) return null;
        to.hotT = ABILITY.hot.lasts;
        to.hotBy = f;
        to.hotAcc = 0;
        f.swingT = 0;
        this.events.push({ k: 'hot', f, to });
        return done();
      }
      case 'group': {
        if (!this.mostHurt(f, 1, ABILITY.group.reach)) return null;
        const follow = f.side === 'pirate';
        this.zones.push({
          side: f.side,
          by: f,
          u: f.u,
          v: f.v,
          t: ABILITY.group.lasts,
          acc: 0,
          follow,
        });
        if (follow) f.singT = ABILITY.group.lasts;
        f.swingT = 0;
        this.events.push({ k: 'group', f });
        return done();
      }
    }
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

  /** A stomp's wind-up done: every foe still close round it hit, and stunned. */
  private stomp(f: Fighter): void {
    f.windT = -1;
    f.swingT = 0;
    const near = this.foesNear(f.u, f.v, f.side, ABILITY.stomp.reach);
    this.events.push({ k: 'stomp', f, n: near.length });
    for (const e of near) {
      this.hurt(e, ABILITY.stomp.hit, f);
      if (e.state !== 'live') continue;
      e.stunT = ABILITY.stomp.stun;
      // Knocked out of whatever it was doing.
      e.aimT = -1;
      e.aimAt = null;
      e.windT = -1;
    }
  }

  /** A heal over time: a heart each whole second it has run. */
  private hotTick(f: Fighter, dt: number): void {
    f.hotAcc += dt;
    f.hotT -= dt;
    while (f.hotAcc >= 1) {
      f.hotAcc -= 1;
      this.mend(f.hotBy ?? f, f, 1);
    }
    if (f.hotT <= 0) {
      f.hotT = 0;
      f.hotBy = null;
    }
  }

  /** Group heals: each, every whole second, a heart for every teammate in it; a sung one goes with its singer. */
  private zoneTicks(dt: number): void {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i] as Zone;
      if (z.follow) {
        z.u = z.by.u;
        z.v = z.by.v;
      }
      z.acc += dt;
      z.t -= dt;
      while (z.acc >= 1) {
        z.acc -= 1;
        for (const t of this.fighters)
          if (
            t.side === z.side &&
            t.state === 'live' &&
            Math.hypot(t.u - z.u, t.v - z.v) <= ABILITY.group.reach
          )
            this.mend(z.by, t, 1);
      }
      if (z.t <= 0) this.zones.splice(i, 1);
    }
  }

  /** Bombs: in the air, then on the ground, then bursting on every foe of its thrower still in its ring. */
  private bombTicks(dt: number): void {
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i] as Bomb;
      b.fly -= dt;
      b.t -= dt;
      if (b.t > 0) continue;
      this.bombs.splice(i, 1);
      const caught = this.foesNear(b.u, b.v, b.side, ABILITY.bomb.ring);
      this.events.push({ k: 'burst', f: b.by, u: b.u, v: b.v, n: caught.length });
      for (const e of caught) this.hurt(e, ABILITY.bomb.hit, b.by);
      if (this.phase !== 'fight') return;
    }
  }

  /** Hearts back for a teammate, up to its whole, counted to the healer. */
  private mend(by: Fighter, to: Fighter, n: number): void {
    if (to.state !== 'live') return;
    const k = Math.min(n, to.kit.hearts - to.hp);
    if (k <= 0) return;
    to.hp += k;
    by.stats.healed += k;
    this.events.push({ k: 'mend', f: by, to, n: k });
  }

  /** The live foes of a side this near a point. */
  private foesNear(u: number, v: number, side: Side, r: number): Fighter[] {
    return this.fighters.filter(
      (e) => e.side !== side && e.state === 'live' && Math.hypot(e.u - u, e.v - v) <= r,
    );
  }

  /** The foe a shot or a leap goes at: the nearest in reach, one carrying a flag first. */
  private nearestFoe(f: Fighter, reach: number): Fighter | null {
    let best: Fighter | null = null;
    let bs = Infinity;
    for (const e of this.fighters) {
      if (e.side === f.side || e.state !== 'live') continue;
      const d = Math.hypot(e.u - f.u, e.v - f.v);
      if (d > reach) continue;
      const s = d - (e.carrying ? 1000 : 0);
      if (s < bs) {
        bs = s;
        best = e;
      }
    }
    return best;
  }

  /** The foe a bomb goes at: in reach, where its ring would catch the most, one carrying a flag above all. */
  private bombAt(f: Fighter): Fighter | null {
    let best: Fighter | null = null;
    let bs = -Infinity;
    for (const e of this.fighters) {
      if (e.side === f.side || e.state !== 'live') continue;
      const d = Math.hypot(e.u - f.u, e.v - f.v);
      if (d > ABILITY.bomb.reach) continue;
      const s =
        this.foesNear(e.u, e.v, f.side, ABILITY.bomb.ring).length * 100 +
        (e.carrying ? 1000 : 0) -
        d * 0.1;
      if (s > bs) {
        bs = s;
        best = e;
      }
    }
    return best;
  }

  /** The teammate in reach (itself included) missing the most of its hearts, at least so many. */
  private mostHurt(f: Fighter, least: number, reach: number): Fighter | null {
    let best: Fighter | null = null;
    let bm = least - 0.5;
    for (const t of this.fighters) {
      if (t.side !== f.side || t.state !== 'live') continue;
      if (Math.hypot(t.u - f.u, t.v - f.v) > reach) continue;
      const m = t.kit.hearts - t.hp + (t.carrying ? 0.5 : 0);
      if (m > bm) {
        bm = m;
        best = t;
      }
    }
    return best;
  }

  /**
   * When a bot uses its abilities, its last badge's first: a healer's heal once a teammate near is three hearts down,
   * its heal over time once one is two down with none on it, its group heal once two near are two down; a shot or a
   * leap at the foe it is after and not yet in its sword's reach; a bomb where it will catch two, or a carrier; the
   * tank's shout once two foes are close, or one close is after a teammate or carries our flag; its guard when a foe
   * is on it and it is three hearts down; its stomp once two foes are round it, or one carrying our flag.
   */
  private botAbility(f: Fighter): void {
    if (f.aimT >= 0 || this.held(f)) return;
    for (let slot = f.abs.length - 1; slot >= 0; slot--) {
      const ab = f.abs[slot] as Ability;
      if ((f.abCd[slot] ?? 0) > 0) continue;
      const at = this.botWants(f, ab);
      if (at === false) continue;
      if (this.ability(f, slot, at === true ? null : at)) return;
    }
  }

  /** Whether a bot wants an ability now: false, true, or the foe to use it on. */
  private botWants(f: Fighter, ab: Ability): boolean | Fighter {
    const t = f.target?.state === 'live' ? f.target : null;
    const d = t ? Math.hypot(t.u - f.u, t.v - f.v) : Infinity;
    switch (ab) {
      case 'heal':
        return !!this.mostHurt(f, 3, ABILITY.heal.reach);
      case 'hot': {
        const to = this.mostHurt(f, 2, ABILITY.hot.reach);
        return !!to && to.hotT <= 0;
      }
      case 'group': {
        let n = 0;
        for (const m of this.fighters)
          if (
            m.side === f.side &&
            m.state === 'live' &&
            m.kit.hearts - m.hp >= 2 &&
            Math.hypot(m.u - f.u, m.v - f.v) <= ABILITY.group.reach * 0.8
          )
            n++;
        return n >= 2;
      }
      case 'shot':
        // Only at the foe it is after, to reach it before it gets close.
        return t && d > f.kit.reach + 30 && d <= ABILITY.shot.reach ? t : false;
      case 'leap':
        return t && d > f.kit.reach + 40 && d <= ABILITY.leap.reach ? t : false;
      case 'bomb': {
        const to = this.bombAt(f);
        if (!to) return false;
        const n = this.foesNear(to.u, to.v, f.side, ABILITY.bomb.ring).length;
        return n >= 2 || to.carrying ? to : false;
      }
      case 'guard': {
        const near = this.foesNear(f.u, f.v, f.side, f.kit.reach + 30);
        return near.length > 0 && (f.kit.hearts - f.hp >= 3 || f.carrying);
      }
      case 'stomp': {
        const near = this.foesNear(f.u, f.v, f.side, ABILITY.stomp.reach * 0.85);
        return near.length >= 2 || near.some((e) => e.carrying);
      }
      case 'taunt': {
        let n = 0;
        let want = false;
        for (const e of this.foesNear(f.u, f.v, f.side, ABILITY.taunt.reach)) {
          n++;
          if (e.carrying || (e.target && e.target !== f)) want = true;
        }
        return n >= 2 || (n > 0 && want);
      }
    }
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
    } else if (this.mode === 'forts') {
      // Holding the forts: to its base, fighting whoever is in or by its ring when it gets near, and on the way only
      // what comes at it; the healer with the nearest teammate, at the base nearest them.
      let h = this.objective(f);
      let spot = this.holdSpot(f, h);
      if (f.job === 'escort') {
        const lead = this.fighters
          .filter((t) => t.side === f.side && t.state === 'live' && t !== f && t.job !== 'escort')
          .sort((a, b) => Math.hypot(a.u - f.u, a.v - f.v) - Math.hypot(b.u - f.u, b.v - f.v))[0];
        if (lead) {
          h = this.holds.reduce((a, b) =>
            Math.hypot(b.u - lead.u, b.v - lead.v) < Math.hypot(a.u - lead.u, a.v - lead.v) ? b : a,
          );
          spot =
            Math.hypot(lead.u - h.u, lead.v - h.v) < h.r + 40
              ? this.holdSpot(f, h)
              : [lead.u, lead.v];
        }
      }
      const near = Math.hypot(f.u - h.u, f.v - h.v) < h.r + 160;
      f.target =
        (near ? this.pickFoe(f, h.r + 60, h.u, h.v) : null) ??
        (f.job === 'defend' ? null : this.pickFoe(f, AGGRO[f.job]));
      aim = f.target ? [f.target.u, f.target.v] : spot;
      route = spot;
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
    if (f.aimT >= 0 || this.held(f)) {
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
    const pace =
      f.kit.speed *
      (f.carrying ? CTF.carry : 1) *
      (wading(f.u, f.v) ? 0.5 : 1) *
      (f.singT > 0 ? 0.5 : 1);
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
