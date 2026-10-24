/**
 * A pet battle (data/petfight.ts), in the ring in the pet house's yard: your pet, steered with the stick, against a
 * trainer's. Real time, never turn-based (the kid's rule). Bite nips whatever is in reach, turning to face it; the
 * special is on its own cooldown. The trainer's pet comes on slowly and nips when close (a short wind-up you can see),
 * and every few seconds winds up a big move shown in red on the ground first, a slam ring where you stand or a charge
 * along a line at you, so the skill is in dodging and timing. When it has just done one it stands open a moment.
 *
 * Pure: no drawing, no sound, no DOM. The game steps it with the stick, presses its buttons, draws what it says and
 * plays what its events say. Positions are world units round the ring's middle.
 */
import {
  type BigMove,
  type FightStats,
  HIT,
  SPECIAL_COOL,
  type Special,
  type Trainer,
} from '../data/petfight';

/** The ring: its radius, and how close to its rope a pet can go. */
export const RING_R = 48;
const EDGE = RING_R - 8;
/** A pet's body, for touching and for biting. */
export const BODY = 8;
export const BITE_REACH = 26;
export const BITE_COOL = 0.8;
/** A bitten pet is knocked back this far, so the other has to come on again. */
export const KNOCK = 16;
/** How long a bite shows. */
export const BITE_T = 0.2;
/** The trainer's pet nips from this near. */
export const NIP_REACH = 24;
export const NIP_COOL = 2.4;
/** The slam's ring, and the charge's line: how long, how wide, how fast it goes. */
export const SLAM_R = 24;
export const CHARGE_LEN = 120;
export const CHARGE_W = 14;
export const CHARGE_SPEED = 260;
/** After a big move it stands open this long. */
export const OPEN_T = 1;
/** Pounce: how far, how fast. Spit: how fast, how far. Roar: how near, how long it dazes. Curl: how long. */
export const POUNCE_LEN = 64;
export const POUNCE_T = 0.28;
export const SPIT_SPEED = 170;
export const SPIT_RANGE = 150;
export const ROAR_R = 70;
export const DAZE_T = 1.6;
export const CURL_T = 1.5;
/** Seconds before the first big move. */
export const FIRST_BIG = 2;
/** After a hit, a moment when nothing more lands. */
export const HURT_T = 0.5;
/** Seconds before it starts, and after it ends before the game takes over. */
export const READY_T = 1.4;
export const OVER_T = 1.6;

export type Side = 'you' | 'foe';

export type Fighter = {
  x: number;
  y: number;
  h: number;
  vx: number;
  vy: number;
  hp: number;
  max: number;
  /** Seconds left: bite showing, bite cooldown, special cooldown, hurt, dazed, curled, mid-pounce. */
  biteT: number;
  biteCd: number;
  spCd: number;
  hurt: number;
  daze: number;
  curl: number;
  pounce: number;
  /** Walking, for the drawing: 0 still, 1 walking. */
  walk: number;
};

/** What the trainer's pet is doing: coming on, winding up a nip or a big move, charging, or open after. */
export type FoeState = 'come' | 'nip' | 'wind' | 'charge' | 'open';

export type Spit = { x: number; y: number; vx: number; vy: number; left: number; from: Side };

export type FightEvent =
  | { k: 'bite'; who: Side; hit: boolean }
  | { k: 'hit'; who: Side; dmg: number }
  | { k: 'special'; who: Side; special: Special }
  | { k: 'wind'; move: BigMove | 'nip' }
  | { k: 'blocked'; who: Side }
  | { k: 'go' }
  | { k: 'over'; won: boolean };

function fighter(x: number, y: number, h: number, hp: number): Fighter {
  return {
    x,
    y,
    h,
    vx: 0,
    vy: 0,
    hp,
    max: hp,
    biteT: 0,
    biteCd: 0,
    spCd: 0,
    hurt: 0,
    daze: 0,
    curl: 0,
    pounce: 0,
    walk: 0,
  };
}

export class PetFight {
  readonly you: Fighter;
  readonly foe: Fighter;
  readonly stats: FightStats;
  readonly trainer: Trainer;
  phase: 'ready' | 'fight' | 'over' = 'ready';
  t = 0;
  won = false;
  foeState: FoeState = 'come';
  foeT = 0;
  /** The big move being wound up or done, and where: the slam's middle, or the charge's start and way. */
  move: BigMove | null = null;
  at = { x: 0, y: 0 };
  dir = { x: 0, y: 0 };
  /** Seconds until the next big move. */
  nextBig: number;
  nipCd = 0;
  spits: Spit[] = [];
  /** Where the last pounce started, and its way. */
  private pounceDir = { x: 0, y: 0 };
  private pounceHit = false;
  private chargeHit = false;
  private events: FightEvent[] = [];

  constructor(stats: FightStats, trainer: Trainer) {
    this.stats = stats;
    this.trainer = trainer;
    this.you = fighter(-RING_R * 0.5, RING_R * 0.3, 0, stats.hp);
    this.foe = fighter(RING_R * 0.5, -RING_R * 0.3, Math.PI, trainer.hp);
    this.nextBig = FIRST_BIG;
  }

  /** What happened since last asked. */
  take(): FightEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  /** The time left before the big move lands, 0..1 of its wind-up, for the red to deepen. */
  get windK(): number {
    return this.foeState === 'wind' ? Math.min(1, this.foeT / this.trainer.wind) : 0;
  }

  /** Bite: whatever is in reach, turning to face it. */
  bite(): void {
    const y = this.you;
    if (this.phase !== 'fight' || y.biteCd > 0 || y.curl > 0 || y.pounce > 0) return;
    y.biteCd = BITE_COOL;
    y.biteT = BITE_T;
    const f = this.foe;
    const d = Math.hypot(f.x - y.x, f.y - y.y);
    y.h = Math.atan2(f.y - y.y, f.x - y.x);
    const hit = d <= BITE_REACH;
    this.events.push({ k: 'bite', who: 'you', hit });
    if (hit && this.hurtFoe(this.stats.bite)) knock(f, y);
  }

  /** The special, when it is ready. */
  special(): void {
    const y = this.you;
    if (this.phase !== 'fight' || y.spCd > 0 || y.pounce > 0) return;
    const s = this.stats.special;
    y.spCd = SPECIAL_COOL[s];
    const f = this.foe;
    const d = Math.hypot(f.x - y.x, f.y - y.y) || 1;
    const ux = (f.x - y.x) / d;
    const uy = (f.y - y.y) / d;
    y.h = Math.atan2(uy, ux);
    this.events.push({ k: 'special', who: 'you', special: s });
    if (s === 'pounce') {
      y.pounce = POUNCE_T;
      this.pounceDir = { x: ux, y: uy };
      this.pounceHit = false;
      y.curl = 0;
    } else if (s === 'spit') {
      this.spits.push({
        x: y.x + ux * BODY,
        y: y.y + uy * BODY,
        vx: ux * SPIT_SPEED,
        vy: uy * SPIT_SPEED,
        left: SPIT_RANGE / SPIT_SPEED,
        from: 'you',
      });
    } else if (s === 'roar') {
      if (d <= ROAR_R) {
        f.daze = DAZE_T;
        // A dazed pet loses what it was winding up.
        if (this.foeState === 'wind' || this.foeState === 'nip') this.foeOpen(DAZE_T);
      }
    } else {
      y.curl = CURL_T;
    }
  }

  /** One step: the stick (a world-space way, magnitude 0..1) moves your pet. */
  step(dt: number, mx: number, my: number): void {
    this.t += dt;
    if (this.phase === 'ready') {
      if (this.t >= READY_T) {
        this.phase = 'fight';
        this.t = 0;
        this.events.push({ k: 'go' });
      }
      return;
    }
    if (this.phase === 'over') return;
    const y = this.you;
    const f = this.foe;
    for (const p of [y, f]) {
      p.biteT = Math.max(0, p.biteT - dt);
      p.biteCd = Math.max(0, p.biteCd - dt);
      p.spCd = Math.max(0, p.spCd - dt);
      p.hurt = Math.max(0, p.hurt - dt);
      p.daze = Math.max(0, p.daze - dt);
      p.curl = Math.max(0, p.curl - dt);
    }
    this.nipCd = Math.max(0, this.nipCd - dt);
    this.moveYou(dt, mx, my);
    this.moveFoe(dt);
    this.moveSpits(dt);
    // Bodies never pass through each other.
    const dx = f.x - y.x;
    const dy = f.y - y.y;
    const d = Math.hypot(dx, dy);
    if (d < BODY * 2 && d > 0 && this.foeState !== 'charge' && y.pounce <= 0) {
      const push = (BODY * 2 - d) / 2;
      y.x -= (dx / d) * push;
      y.y -= (dy / d) * push;
      f.x += (dx / d) * push;
      f.y += (dy / d) * push;
    }
    for (const p of [y, f]) keepIn(p);
    if (f.hp <= 0 || y.hp <= 0) {
      this.phase = 'over';
      this.won = f.hp <= 0;
      this.t = 0;
      this.events.push({ k: 'over', won: this.won });
    }
  }

  private moveYou(dt: number, mx: number, my: number): void {
    const y = this.you;
    if (y.pounce > 0) {
      const step = Math.min(dt, y.pounce);
      y.pounce -= step;
      const v = POUNCE_LEN / POUNCE_T;
      y.x += this.pounceDir.x * v * step;
      y.y += this.pounceDir.y * v * step;
      const f = this.foe;
      if (!this.pounceHit && Math.hypot(f.x - y.x, f.y - y.y) <= BODY * 2 + 6) {
        this.pounceHit = true;
        this.hurtFoe(HIT.pounce + (this.stats.bite > 2 ? 1 : 0));
      }
      y.walk = 1;
      return;
    }
    const m = Math.min(1, Math.hypot(mx, my));
    const slow = y.curl > 0 ? 0.35 : 1;
    const tx = m > 0.05 ? (mx / (Math.hypot(mx, my) || 1)) * m * this.stats.speed * slow : 0;
    const ty = m > 0.05 ? (my / (Math.hypot(mx, my) || 1)) * m * this.stats.speed * slow : 0;
    const e = Math.min(1, dt * 14);
    y.vx += (tx - y.vx) * e;
    y.vy += (ty - y.vy) * e;
    y.x += y.vx * dt;
    y.y += y.vy * dt;
    const sp = Math.hypot(y.vx, y.vy);
    y.walk = sp > 6 ? 1 : 0;
    if (sp > 6 && y.biteT <= 0) y.h = Math.atan2(y.vy, y.vx);
  }

  private moveFoe(dt: number): void {
    const f = this.foe;
    const y = this.you;
    const tr = this.trainer;
    f.walk = 0;
    if (f.daze > 0) return;
    this.foeT += dt;
    const dx = y.x - f.x;
    const dy = y.y - f.y;
    const d = Math.hypot(dx, dy) || 1;
    switch (this.foeState) {
      case 'come': {
        this.nextBig -= dt;
        f.h = Math.atan2(dy, dx);
        if (this.nextBig <= 0) {
          this.windUp();
          return;
        }
        if (d <= NIP_REACH && this.nipCd <= 0) {
          this.foeState = 'nip';
          this.foeT = 0;
          this.events.push({ k: 'wind', move: 'nip' });
          return;
        }
        if (d > BODY * 2 + 4) {
          f.x += (dx / d) * tr.speed * dt;
          f.y += (dy / d) * tr.speed * dt;
          f.walk = 1;
        }
        return;
      }
      case 'nip': {
        if (this.foeT < tr.nipWind) return;
        this.nipCd = NIP_COOL;
        f.biteT = BITE_T;
        const hit = d <= NIP_REACH + 4;
        this.events.push({ k: 'bite', who: 'foe', hit });
        if (hit && this.hurtYou(tr.nip, true)) knock(y, f);
        this.foeState = 'come';
        this.foeT = 0;
        return;
      }
      case 'wind': {
        f.h =
          this.move === 'charge'
            ? Math.atan2(this.dir.y, this.dir.x)
            : Math.atan2(this.at.y - f.y, this.at.x - f.x);
        if (this.foeT < tr.wind) return;
        if (this.move === 'slam') {
          // It leaps onto the ring and slams.
          f.x = this.at.x;
          f.y = this.at.y;
          if (Math.hypot(y.x - this.at.x, y.y - this.at.y) <= SLAM_R + BODY * 0.5)
            this.hurtYou(tr.big, false);
          this.foeOpen(OPEN_T);
        } else {
          this.foeState = 'charge';
          this.foeT = 0;
          this.chargeHit = false;
        }
        return;
      }
      case 'charge': {
        f.x += this.dir.x * CHARGE_SPEED * dt;
        f.y += this.dir.y * CHARGE_SPEED * dt;
        f.walk = 1;
        if (!this.chargeHit && Math.hypot(y.x - f.x, y.y - f.y) <= CHARGE_W + BODY * 0.5) {
          this.chargeHit = true;
          this.hurtYou(tr.big, false);
        }
        if (this.foeT * CHARGE_SPEED >= CHARGE_LEN || Math.hypot(f.x, f.y) >= EDGE)
          this.foeOpen(OPEN_T);
        return;
      }
      case 'open': {
        if (this.foeT >= this.openFor) {
          this.foeState = 'come';
          this.foeT = 0;
        }
        return;
      }
    }
  }

  private openFor = OPEN_T;

  private foeOpen(t: number): void {
    this.foeState = 'open';
    this.foeT = 0;
    this.openFor = t;
    this.move = null;
    this.nextBig = this.trainer.every;
  }

  private windUp(): void {
    const f = this.foe;
    const y = this.you;
    const tr = this.trainer;
    const i = Math.floor(this.t / tr.every) % tr.moves.length;
    const m = tr.moves[i] ?? 'slam';
    this.move = m;
    this.foeState = 'wind';
    this.foeT = 0;
    if (m === 'slam') {
      this.at = { x: y.x, y: y.y };
    } else {
      const d = Math.hypot(y.x - f.x, y.y - f.y) || 1;
      this.at = { x: f.x, y: f.y };
      this.dir = { x: (y.x - f.x) / d, y: (y.y - f.y) / d };
    }
    this.events.push({ k: 'wind', move: m });
  }

  private moveSpits(dt: number): void {
    const f = this.foe;
    this.spits = this.spits.filter((s) => {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.left -= dt;
      if (Math.hypot(f.x - s.x, f.y - s.y) <= BODY + 3) {
        this.hurtFoe(HIT.spit);
        return false;
      }
      return s.left > 0 && Math.hypot(s.x, s.y) < RING_R + 10;
    });
  }

  /** Says whether it landed. */
  private hurtFoe(dmg: number): boolean {
    const f = this.foe;
    if (f.hurt > 0) return false;
    f.hp = Math.max(0, f.hp - dmg);
    f.hurt = HURT_T;
    this.events.push({ k: 'hit', who: 'foe', dmg });
    return true;
  }

  private hurtYou(dmg: number, bite: boolean): boolean {
    const y = this.you;
    if (y.curl > 0) {
      this.events.push({ k: 'blocked', who: 'you' });
      // Curled up, a nip finds spikes.
      if (bite) this.hurtFoe(HIT.spikes);
      return false;
    }
    if (y.hurt > 0 || y.pounce > 0) return false;
    y.hp = Math.max(0, y.hp - dmg);
    y.hurt = HURT_T;
    this.events.push({ k: 'hit', who: 'you', dmg });
    return true;
  }
}

/** A bitten pet knocked back, away from the biter. */
function knock(p: Fighter, from: Fighter): void {
  const d = Math.hypot(p.x - from.x, p.y - from.y) || 1;
  p.x += ((p.x - from.x) / d) * KNOCK;
  p.y += ((p.y - from.y) / d) * KNOCK;
  keepIn(p);
}

function keepIn(p: Fighter): void {
  const d = Math.hypot(p.x, p.y);
  if (d > EDGE) {
    p.x *= EDGE / d;
    p.y *= EDGE / d;
  }
}
