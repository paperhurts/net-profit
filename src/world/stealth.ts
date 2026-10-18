/**
 * Stealth mission 1, the kid's (2026-10-18, his tab 15: "get to the tower of island 2 and kick the sorcerer off and tada
 * get a boat", and his answers: a new island 2 out on the tar ocean, the same sorcerer; "blue to red"; seen, restart
 * the mission, "but remember you can backstab em"; kicked "into same portal heron does", the Heron saying "come on"; the
 * boat "a chemistry boat"; invisibility in this mission), sneaking through the tunnels of the map he sent with it: a plan of four joined underground tombs (it is
 * an archaeologist's plan of Theban tombs 295, 296, 365 and 178, in four colours, which he chose for the map). In his
 * colours: in from the blue tunnels at the bottom, up through the black hall with its stairs, across into the long
 * green corridor with a pillar in it, through the red halls with their pillars, and up the way out at the very top. Skeleton
 * troops and demons walk it, each with a light; one that sees you, and it is back to the start (his "if they see you,
 * one hit and you're out"). Pillars and corners hide you.
 *
 * Its rooms are traced from his map in its own pixels and laid out far from any sea, one map pixel to MAP_K of the
 * world, his north to the world's -y.
 */

export type Pt = { x: number; y: number };
export type Rect = { x0: number; y0: number; x1: number; y1: number };

/** Where his map's corner lands in the world, and how big one of its pixels is. */
export const MAP_AT = { x: -26000, y: -12000 } as const;
export const MAP_K = 2.4;

const at = (u: number, v: number): Pt => ({ x: MAP_AT.x + u * MAP_K, y: MAP_AT.y + v * MAP_K });
const rect = (u0: number, v0: number, u1: number, v1: number): Rect => {
  const a = at(u0, v0);
  const b = at(u1, v1);
  return { x0: a.x, y0: a.y, x1: b.x, y1: b.y };
};

/** Which part of his map, by its colour on it. */
export type Part = 'blue' | 'black' | 'green' | 'red';

/** The floor: every room and passage, by the part of the map it is in. */
export const TUNNELS: readonly (Rect & { part: Part })[] = [
  // Blue, at the bottom: in from the west, three rooms up a winding way.
  { ...rect(395, 550, 468, 570), part: 'blue' },
  { ...rect(465, 512, 527, 590), part: 'blue' },
  { ...rect(470, 478, 502, 515), part: 'blue' },
  { ...rect(437, 422, 540, 481), part: 'blue' },
  { ...rect(480, 388, 498, 425), part: 'blue' },
  // Black: the big hall, its stairs down the west side, a neck up to rubble at the top.
  { ...rect(375, 165, 555, 392), part: 'black' },
  { ...rect(450, 140, 478, 168), part: 'black' },
  // Green: the long corridor, a pillar in its bulge on the west, a waist low down; joined to the black hall.
  { ...rect(268, 108, 338, 345), part: 'green' },
  { ...rect(256, 210, 270, 256), part: 'green' },
  { ...rect(288, 342, 315, 388), part: 'green' },
  { ...rect(268, 385, 336, 425), part: 'green' },
  { ...rect(335, 222, 378, 255), part: 'green' },
  // Red: an arm in from the green corridor, the middle hall, a neck up to the top hall and its arm, and the way out.
  { ...rect(178, 140, 271, 175), part: 'red' },
  { ...rect(70, 150, 250, 205), part: 'red' },
  { ...rect(147, 202, 182, 236), part: 'red' },
  { ...rect(143, 110, 165, 153), part: 'red' },
  { ...rect(80, 63, 235, 113), part: 'red' },
  { ...rect(22, 73, 82, 100), part: 'red' },
  { ...rect(145, 46, 172, 66), part: 'red' },
];

/** What stands in the way and hides you: his pillars, the walls inside the black hall, and the rubble. */
export type Solid = Rect & { kind: 'pillar' | 'wall' | 'rubble'; h: number };
export const SOLIDS: readonly Solid[] = [
  { ...rect(272, 214, 296, 252), kind: 'pillar', h: 54 },
  { ...rect(86, 70, 108, 96), kind: 'pillar', h: 54 },
  { ...rect(202, 84, 222, 106), kind: 'pillar', h: 54 },
  // Inside the black hall, as on his map, with gaps left to get through.
  { ...rect(431, 165, 437, 192), kind: 'wall', h: 40 },
  { ...rect(431, 203, 470, 209), kind: 'wall', h: 40 },
  { ...rect(493, 165, 499, 232), kind: 'wall', h: 40 },
  { ...rect(520, 263, 555, 269), kind: 'wall', h: 40 },
  // The rubble filling the far ends.
  { ...rect(150, 228, 180, 236), kind: 'rubble', h: 18 },
  { ...rect(452, 140, 476, 150), kind: 'rubble', h: 18 },
];

/** The stairs down the west side of the black hall. */
export const STAIRS = rect(377, 285, 430, 390);
/** In at the bottom of the blue tunnels, and the way up and out at the very top of the red halls. */
export const STEALTH_START = at(405, 560);
export const STEALTH_GOAL = at(158, 54);
/** How near the way out counts as out. */
export const GOAL_REACH = 22;

const inRect = (r: Rect, x: number, y: number) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
const onFloorAt = (x: number, y: number) => TUNNELS.some((r) => inRect(r, x, y));
const solidAt = (x: number, y: number, pad = 0) =>
  SOLIDS.some((s) => x > s.x0 - pad && x < s.x1 + pad && y > s.y0 - pad && y < s.y1 + pad);

/** All of it, with room to spare: anything in here is in the tunnels or in their rock. */
export const TUNNEL_BOUNDS: Rect = rect(0, 30, 600, 610);

/**
 * Up the ladder at the top: the top of the sorcerer's tower on island 2 of the tar ocean, a round stone roof high over
 * the tar, laid out apart from the tunnels. The sorcerer hangs in the air by its far edge, looking out at the portal
 * turning in the tar below it, the Heron's (island 9's escape); every so often he turns round and looks back across the
 * roof. Crates to hide behind on the way. The ladder comes up at the front.
 */
const DG = Math.SQRT1_2;
export const ROOF_AT = { x: MAP_AT.x - 1700, y: MAP_AT.y + 700 } as const;
export const ROOF_R = 150;
export const ROOF_START = {
  x: ROOF_AT.x + ROOF_R * 0.62 * DG,
  y: ROOF_AT.y + ROOF_R * 0.62 * DG,
} as const;
export const SORC_AT = {
  x: ROOF_AT.x - (ROOF_R - 34),
  y: ROOF_AT.y,
} as const;
/** The portal in the tar below the tower's side, out past it where it can be seen, and how far below the roof the tar is. */
export const PORTAL_AT = {
  x: ROOF_AT.x - (ROOF_R + 140),
  y: ROOF_AT.y,
} as const;
export const TOWER_H = 220;
export const COVER: readonly Rect[] = [
  { x0: ROOF_AT.x - 10, y0: ROOF_AT.y + 30, x1: ROOF_AT.x + 14, y1: ROOF_AT.y + 54 },
  { x0: ROOF_AT.x - 70, y0: ROOF_AT.y - 40, x1: ROOF_AT.x - 46, y1: ROOF_AT.y - 16 },
];
const ROOF_BOUNDS: Rect = {
  x0: ROOF_AT.x - ROOF_R - 40,
  y0: ROOF_AT.y - ROOF_R - 40,
  x1: ROOF_AT.x + ROOF_R + 40,
  y1: ROOF_AT.y + ROOF_R + 40,
};
const onRoofAt = (x: number, y: number) => Math.hypot(x - ROOF_AT.x, y - ROOF_AT.y) <= ROOF_R - 12;
const coverAt = (x: number, y: number, pad = 0) =>
  COVER.some((c) => x > c.x0 - pad && x < c.x1 + pad && y > c.y0 - pad && y < c.y1 + pad);

export function inTunnelBounds(x: number, y: number): boolean {
  return inRect(TUNNEL_BOUNDS, x, y) || inRect(ROOF_BOUNDS, x, y);
}

/** How far the figure keeps off the walls. */
const KEEP = 7;
/** Whether the figure can stand here: on the floor, kept off the walls, not in a pillar, wall or rubble. */
export function tunnelWalkable(x: number, y: number): boolean {
  if (inRect(ROOF_BOUNDS, x, y)) return onRoofAt(x, y) && !coverAt(x, y, 5);
  return (
    onFloorAt(x - KEEP, y) &&
    onFloorAt(x + KEEP, y) &&
    onFloorAt(x, y - KEEP) &&
    onFloorAt(x, y + KEEP) &&
    !solidAt(x, y, 5)
  );
}

/** Whether nothing stands between two points: every step of the way on the floor, and not through anything solid. */
export function clearLine(ax: number, ay: number, bx: number, by: number): boolean {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 5));
  for (let i = 1; i < n; i++) {
    const x = ax + ((bx - ax) * i) / n;
    const y = ay + ((by - ay) * i) / n;
    if (!onFloorAt(x, y) || solidAt(x, y)) return false;
  }
  return true;
}

/** How far a guard's light reaches, how wide it is either side, and how long a guard must see you to catch you. */
export const SIGHT = 150;
export const SIGHT_HALF = 0.5;
export const CATCH_T = 0.35;
/** Invisible, you are seen only this close: it is never perfect. How long it lasts, and how long until it works again. */
export const INVIS_NEAR = 32;
export const INVIS_T = 5;
export const INVIS_WAIT = 12;
/** How near behind a guard you must be to backstab it, and how far round behind (from straight ahead) counts. */
export const STAB_REACH = 34;
export const BEHIND = 1.9;
/** The sorcerer: how far he sees and how wide; how near behind him you must be to kick him off; his turns. */
export const SORC_SIGHT = 180;
export const SORC_HALF = 0.6;
export const KICK_REACH = 44;
const AWAY_T = 5;
const TURN_T = 0.6;
const BACK_T = 1.9;
const SORC_CYCLE = AWAY_T + TURN_T + BACK_T + TURN_T;
/** From the kick, how long he falls, when the Heron calls from the portal, and when it is over. */
export const KICK_FALL = 1.6;
export const HERON_AT = 2;
export const KICK_END = 4.4;

export type GuardKind = 'skeleton' | 'demon';
export type GuardPlan = {
  kind: GuardKind;
  /** Walked round in order; one point is standing still. */
  path: readonly Pt[];
  speed: number;
  /** How long it stands at each point, looking about. */
  wait: number;
  /** Standing still, the way it faces, and how far it turns its head either way. */
  face?: number;
  sweep?: number;
};

const P = (u: number, v: number) => at(u, v);
/** Who walks the tunnels, and where: a skeleton in each of the first rooms, a demon in the big hall, more further in. */
export const GUARDS: readonly GuardPlan[] = [
  { kind: 'skeleton', path: [P(450, 452), P(528, 452)], speed: 34, wait: 1.4 },
  { kind: 'demon', path: [P(525, 380), P(525, 285), P(470, 285)], speed: 38, wait: 1.2 },
  { kind: 'skeleton', path: [P(410, 200)], speed: 0, wait: 0, face: Math.PI * 0.3, sweep: 0.9 },
  { kind: 'skeleton', path: [P(303, 125), P(303, 330)], speed: 40, wait: 1.6 },
  { kind: 'demon', path: [P(85, 180), P(235, 180)], speed: 44, wait: 1 },
  { kind: 'skeleton', path: [P(160, 95)], speed: 0, wait: 0, face: Math.PI * 0.5, sweep: 1.2 },
];

export type Guard = GuardPlan & {
  x: number;
  y: number;
  /** The way it is looking. */
  look: number;
  /** Which point of its path it is going to, and how long it has stood there. */
  i: number;
  t: number;
  /** How sure it is that it sees you, 0 to CATCH_T. */
  seen: number;
  /** Backstabbed: down for the rest of this go. */
  down: boolean;
};

function fresh(g: GuardPlan): Guard {
  const p0 = g.path[0] as Pt;
  const p1 = (g.path[1] ?? p0) as Pt;
  return {
    ...g,
    x: p0.x,
    y: p0.y,
    look: g.face ?? Math.atan2(p1.y - p0.y, p1.x - p0.x),
    i: g.path.length > 1 ? 1 : 0,
    t: 0,
    seen: 0,
    down: false,
  };
}

/** Whether a guard sees a point: near enough, inside its light, and nothing in between. */
export function sees(g: Guard, x: number, y: number): boolean {
  const dx = x - g.x;
  const dy = y - g.y;
  const d = Math.hypot(dx, dy);
  if (d > SIGHT) return false;
  if (d > 12) {
    let a = Math.atan2(dy, dx) - g.look;
    a = Math.atan2(Math.sin(a), Math.cos(a));
    if (Math.abs(a) > SIGHT_HALF) return false;
  }
  return clearLine(g.x, g.y, x, y);
}

/** The floor a guard's light falls on, as a fan of points from its feet, cut short by walls and pillars. */
export function lightFan(
  g: { x: number; y: number; look: number },
  rays = 14,
  range = SIGHT,
  half = SIGHT_HALF,
): Pt[] {
  const pts: Pt[] = [{ x: g.x, y: g.y }];
  const roof = inRect(ROOF_BOUNDS, g.x, g.y);
  for (let k = 0; k <= rays; k++) {
    const a = g.look - half + (2 * half * k) / rays;
    let r = 0;
    while (r < range) {
      const x = g.x + Math.cos(a) * (r + 5);
      const y = g.y + Math.sin(a) * (r + 5);
      if (
        roof
          ? Math.hypot(x - ROOF_AT.x, y - ROOF_AT.y) > ROOF_R || coverAt(x, y)
          : !onFloorAt(x, y) || solidAt(x, y)
      )
        break;
      r += 5;
    }
    pts.push({ x: g.x + Math.cos(a) * r, y: g.y + Math.sin(a) * r });
  }
  return pts;
}

/** Whether a point is behind something looking this way: round past BEHIND from straight ahead. */
export function behind(look: number, from: Pt, at: Pt): boolean {
  let a = Math.atan2(at.y - from.y, at.x - from.x) - look;
  a = Math.atan2(Math.sin(a), Math.cos(a));
  return Math.abs(a) > BEHIND;
}

/** Whether the sorcerer, looking this way from his place, sees a point on the roof: crates hide you. */
export function sorcSees(look: number, x: number, y: number): boolean {
  const dx = x - SORC_AT.x;
  const dy = y - SORC_AT.y;
  if (Math.hypot(dx, dy) > SORC_SIGHT) return false;
  let a = Math.atan2(dy, dx) - look;
  a = Math.atan2(Math.sin(a), Math.cos(a));
  if (Math.abs(a) > SORC_HALF) return false;
  const n = Math.ceil(Math.hypot(dx, dy) / 5);
  for (let i = 1; i < n; i++)
    if (coverAt(SORC_AT.x + (dx * i) / n, SORC_AT.y + (dy * i) / n)) return false;
  return true;
}

/** Which way the sorcerer looks this far into his round: out at the portal, turning, back across the roof, turning. */
export function sorcLook(t: number): { look: number; away: boolean } {
  const out = Math.atan2(PORTAL_AT.y - SORC_AT.y, PORTAL_AT.x - SORC_AT.x);
  const back = out + Math.PI;
  const k = ((t % SORC_CYCLE) + SORC_CYCLE) % SORC_CYCLE;
  if (k < AWAY_T) return { look: out + Math.sin(t * 0.9) * 0.15, away: true };
  if (k < AWAY_T + TURN_T) return { look: out + ((k - AWAY_T) / TURN_T) * Math.PI, away: false };
  if (k < AWAY_T + TURN_T + BACK_T)
    return { look: back + Math.sin((k - AWAY_T - TURN_T) * 2.4) * 0.5, away: false };
  return { look: back + ((k - AWAY_T - TURN_T - BACK_T) / TURN_T) * Math.PI, away: false };
}

export type StealthEvent = 'caught' | 'out' | 'roofCaught' | 'won';

/** The mission under way: the guards walking their rounds, and whether they have seen you; then the tower's top. */
export class Stealth {
  guards: Guard[] = GUARDS.map(fresh);
  /** Game seconds since it started, for the guards that look about. */
  T = 0;
  /** Invisible just now: seen only up close. */
  invisible = false;
  /** Up on the tower's top; the sorcerer's round, how sure he is he sees you, and seconds since the kick, or -1. */
  roof = false;
  sorcT = 0;
  sorcSeen = 0;
  kickT = -1;

  /** Back to the start: every guard up again and on its round. */
  reset(): void {
    this.guards = GUARDS.map(fresh);
    this.T = 0;
    this.roof = false;
    this.sorcT = 0;
    this.sorcSeen = 0;
    this.kickT = -1;
  }

  /** Up the ladder onto the tower's top, the sorcerer looking out at the portal. */
  toRoof(): void {
    this.roof = true;
    this.sorcT = 0;
    this.sorcSeen = 0;
    this.kickT = -1;
  }

  /** The way the sorcerer looks now, and whether it is away from the roof. */
  get sorc(): { look: number; away: boolean } {
    return sorcLook(this.sorcT);
  }

  /** The standing guard you are close behind, unseen, to backstab; or none. */
  stabbable(me: Pt): Guard | null {
    if (this.roof) return null;
    for (const g of this.guards)
      if (
        !g.down &&
        g.seen === 0 &&
        Math.hypot(me.x - g.x, me.y - g.y) < STAB_REACH &&
        behind(g.look, g, me)
      )
        return g;
    return null;
  }

  /** Close behind the sorcerer while he looks out at the portal, and unseen: he can be kicked off. */
  canKick(me: Pt): boolean {
    return (
      this.roof &&
      this.kickT < 0 &&
      this.sorcSeen === 0 &&
      this.sorc.away &&
      Math.hypot(me.x - SORC_AT.x, me.y - SORC_AT.y) < KICK_REACH
    );
  }

  kick(): void {
    if (this.kickT < 0) this.kickT = 0;
  }

  private seesMe(seen: boolean, x: number, y: number, me: Pt): boolean {
    return seen && (!this.invisible || Math.hypot(me.x - x, me.y - y) < INVIS_NEAR);
  }

  /**
   * A step. In the tunnels the guards walk and look: 'caught' when one has seen you long enough, 'out' at the way up.
   * On the tower's top the sorcerer looks about: 'roofCaught' when he has seen you; after the kick, 'won' when it is over.
   */
  update(dt: number, me: Pt): StealthEvent | null {
    this.T += dt;
    if (this.roof) {
      if (this.kickT >= 0) {
        this.kickT += dt;
        return this.kickT >= KICK_END ? 'won' : null;
      }
      this.sorcT += dt;
      const s = this.sorc;
      this.sorcSeen = this.seesMe(sorcSees(s.look, me.x, me.y), SORC_AT.x, SORC_AT.y, me)
        ? this.sorcSeen + dt
        : Math.max(0, this.sorcSeen - dt * 2);
      return this.sorcSeen >= CATCH_T ? 'roofCaught' : null;
    }
    for (const g of this.guards) {
      if (g.down) continue;
      if (g.path.length > 1) {
        const p = g.path[g.i] as Pt;
        const dx = p.x - g.x;
        const dy = p.y - g.y;
        const d = Math.hypot(dx, dy);
        if (d < 1) {
          g.t += dt;
          // Standing at a turn, it looks one way and the other before going on.
          g.look += Math.sin(g.t * 3) * dt * 1.2;
          if (g.t >= g.wait) {
            g.t = 0;
            g.i = (g.i + 1) % g.path.length;
            const q = g.path[g.i] as Pt;
            g.look = Math.atan2(q.y - g.y, q.x - g.x);
          }
        } else {
          const s = Math.min(d, g.speed * dt);
          g.x += (dx / d) * s;
          g.y += (dy / d) * s;
          g.look = Math.atan2(dy, dx);
        }
      } else if (g.sweep) g.look = (g.face ?? 0) + Math.sin(this.T * 0.8) * g.sweep;
      g.seen = this.seesMe(sees(g, me.x, me.y), g.x, g.y, me)
        ? g.seen + dt
        : Math.max(0, g.seen - dt * 2);
      if (g.seen >= CATCH_T) return 'caught';
    }
    if (Math.hypot(me.x - STEALTH_GOAL.x, me.y - STEALTH_GOAL.y) < GOAL_REACH) return 'out';
    return null;
  }

  /** The one that is looking hardest at you, for its "!". */
  spotter(): Guard | null {
    let best: Guard | null = null;
    for (const g of this.guards)
      if (!g.down && g.seen > 0 && (!best || g.seen > best.seen)) best = g;
    return best;
  }
}
