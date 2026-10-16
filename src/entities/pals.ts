/**
 * The two Cthulhu leaves behind when it crumbles, the kid's: a healer cat and
 * a little Cthulhu warrior; and the Forgotten One's bones, which get up when
 * he falls and are on your side, as the kid wrote. All come along as the
 * warlock does: aboard they ride on the boat (the cat on the cabin roof, the
 * warrior at the stern, the bones at the bow);
 * ashore they follow the figure everywhere, every island and every room,
 * popping over if left far behind. The cat and the warrior have five hit
 * points and the bones four; hurt to none, one is worn out and rests aboard
 * until the next landing, mending as it goes. In a fight they go for whatever
 * is near the figure and hit it up close: the warrior and the bones for 2, the
 * cat with a swipe for 1. The bones also raise a ghost and a skeleton to fight
 * for you (the game calls them up). And the cat heals: twice a fight,
 * a moment after the figure loses a heart, it gives one back. Fed a fish from
 * the hold (tap it on the boat, at sea, with fish aboard) it has another heal,
 * up to five, kept for the fights to come. Tap it otherwise to pet it. The game finds what they fight, as for the
 * warlock, and says what hurts them.
 *
 * And the naga, the kid's blue sea-warrior: a fish-headed fighter with a snake's tail for legs, red spines down
 * his back and a long pole with a great orange fin-blade on it, kept in a cage at island 2's monkey camp until
 * the camp is beaten. Ashore he is one of these, with the longest reach of them and five hit points; at sea he
 * does not ride the boat but swims beside it, keeping up however fast it goes, and rests there when worn out.
 *
 * And the necromancer, chained to the Heron's orb of power until the kid's hero broke his chain: once the Heron
 * is beaten for good he comes along too, riding the boat amidships. He does not fight up close. He keeps back at
 * the figure's heel, four hit points, and when a fight is on he raises his skeleton hamster to fight for you (the
 * game calls it up), and raises it again a while after it falls.
 *
 * And Caterman, the kid's technology cat-human from island 11 (3 hit points, 2 damage): out of his workshop once the
 * Heron's brother has gone, he comes along, riding the boat at the bow. He zaps from further off than the others
 * reach, with a little blaster he built.
 *
 * And the baby Reaper, out of the egg the Reaper on land left: his father small, on four clawed legs, with a big
 * round eye. Ashore he trots at the figure's heel and nips whatever it fights, for 1. At sea he swims as the naga
 * does, but off the bow on the side away from the viewer (the otter has the near side), his little striped fin up,
 * and every few seconds he leaps clear of the water and dives back in. Tap him and he leaps for you.
 */

import { Worn } from '../data/badges';
import { drawCaterman } from '../render/caterman';
import { drawReaperBody, sideOn } from '../render/reaper';
import type { DrawView, Entity, Layer, World } from './entity';
import { drawNecromancer } from './nest';
import { walkable, walkStep } from './walker';

export type PalKind = 'cat' | 'warrior' | 'bones' | 'naga' | 'necro' | 'baby' | 'caterman';

export const PAL_HP = 5;
export const BONES_HP = 4;
export const NECRO_HP = 4;
/** Caterman, the kid's: 3 hit points, and his blaster hits for 2. */
export const CATERMAN_HP = 3;
export const PAL_SPEED = 100;
/** How close each keeps behind the figure, and how far off it pops over. */
export const PAL_HEEL: Readonly<Record<PalKind, number>> = {
  cat: 24,
  warrior: 30,
  bones: 36,
  naga: 34,
  necro: 42,
  baby: 28,
  caterman: 32,
};
export const PAL_BLINK = 200;
/** A companion that cannot make any way along the figure's steps for this long pops over beside it. */
export const STUCK_T = 0.8;
/** Something this close to the figure is fought; each hits from this close, this often, this hard. */
export const FIGHT_FROM = 130;
export const REACH: Readonly<Record<PalKind, number>> = {
  cat: 20,
  warrior: 26,
  bones: 28,
  naga: 36,
  necro: 0,
  baby: 24,
  // His blaster reaches further than a blade.
  caterman: 60,
};
export const SWING_EVERY: Readonly<Record<PalKind, number>> = {
  cat: 1.1,
  warrior: 1.4,
  bones: 1.5,
  naga: 1.3,
  necro: 0,
  baby: 1,
  caterman: 1.3,
};
export const POWER: Readonly<Record<PalKind, number>> = {
  cat: 1,
  warrior: 2,
  bones: 2,
  naga: 2,
  necro: 0,
  baby: 1,
  caterman: 2,
};
/**
 * Where the naga swims at sea, in the hull's units: this far off the boat's right side, this far ahead of
 * amidships, alongside the cabin and clear of the net's lines off the stern.
 */
export const SWIM_SIDE = 28;
export const SWIM_AHEAD = 6;
/**
 * The baby Reaper: head to tail ashore and at sea, in world units; where he swims, in the hull's units, off the side
 * away from the viewer and ahead of the bow, the otter's place mirrored; and his leaps, how long one lasts, how
 * high it goes, and the seconds between them.
 */
export const BABY_LEN = 54;
export const BABY_SEA_LEN = 48;
export const BABY_SIDE = 18;
export const BABY_AHEAD = 30;
export const LEAP_T = 0.8;
export const LEAP_H = 18;
export const LEAP_EVERY = 4.5;
/** The bones raise their ghost and skeleton once a fight is on, and again this long after, if those are gone. */
export const RAISE_EVERY = 12;
/** The necromancer raises his hamster once a fight is on, and again this long after, if it has fallen. */
export const HAMSTER_EVERY = 10;
/** Blinking this long after a hit; worn out, resting this long. */
export const PAL_INVULN = 1;
export const PAL_REST = 40;
/** The cat's heals: this many each fight, up to this many with fish, given this long after a heart is lost. */
export const HEALS = 2;
export const MAX_HEALS = 5;
export const HEAL_DELAY = 1.2;

export type PalTarget = { x: number; y: number; hit(power: number): void };

export class Pal implements Entity {
  /** Freed from the temple: it is yours. */
  free = false;
  state: 'away' | 'with' | 'resting' = 'away';
  x = 0;
  y = 0;
  h = Math.PI / 4;
  ph = 0;
  gait = 0;
  hp = PAL_HP;
  invuln = 0;
  /** Its badge, if one is pinned on it (data/badges.ts). */
  readonly worn = new Worn();
  /** Seconds since its last swing began, for the swing's look. */
  swingT = 9;
  /** The cat's heals left this fight, and the one it is about to give: to the figure, or (null) to a companion. */
  heals = HEALS;
  private healT = -1;
  private healWho: object | null = null;
  /**
   * The cat has had a tuna, the kid's (2026-10-13: "cat can heal companions as long as you fed it tuna"): its heals go
   * to a hurt companion as well as to the figure, until they run out.
   */
  tuna = false;
  /** Seconds of hearts over it after a pet. */
  love = 0;
  private rest = 0;
  private swingCd = 0;
  private hadFigure = false;
  /** The naga is in the water beside the boat, on this side of it: 1 its right, -1 its left. */
  swimming = false;
  side = 1;
  /** The baby Reaper at sea: seconds into a leap (-1 when he is not leaping), and until his next. */
  leapT = -1;
  leapCd = LEAP_EVERY;
  /** The baby Reaper splashed back into the sea, here. */
  onSplash: ((x: number, y: number) => void) | null = null;
  private readonly trail: { x: number; y: number }[] = [];
  /** What it can fight, nearest, within reach of a point; the game knows. */
  findTarget: ((x: number, y: number, range: number) => PalTarget | null) | null = null;
  /** It swung at something. */
  onSwing: (() => void) | null = null;
  /** It was hurt; out says it is worn out. */
  onHurt: ((out: boolean) => void) | null = null;
  /** The cat gives the figure a heart back. */
  onHeal: (() => void) | null = null;
  /** The cat, fed tuna, gives a companion back what it lost; the game says how. */
  onHealPal: ((who: object) => void) | null = null;
  /** The bones raise a ghost and a skeleton here, or the necromancer his hamster; the game calls them up. */
  onRaise: ((x: number, y: number) => void) | null = null;
  /** Whether they may raise now: the game says whether the last ones are gone. */
  canRaise: (() => boolean) | null = null;
  private raiseCd = 0;
  /** Seconds it has wanted to follow and not moved. */
  private blockedT = 0;
  /** Where it stops following: its place in the army's rings, when the game gives it one (spread.ts); else its heel. */
  heelAt: number | null = null;

  constructor(readonly kind: PalKind) {
    this.hp = this.maxHp;
  }

  /** Beside the figure, ashore. */
  get shown(): boolean {
    return this.state === 'with';
  }

  /** Its hit points when whole. */
  get maxHp(): number {
    return this.kind === 'bones'
      ? BONES_HP
      : this.kind === 'necro'
        ? NECRO_HP
        : this.kind === 'caterman'
          ? CATERMAN_HP
          : PAL_HP;
  }

  /** Out of the temple at a point, as Cthulhu crumbles: free, and beside the figure. */
  come(x: number, y: number): void {
    this.free = true;
    this.state = 'with';
    this.hp = this.maxHp;
    this.x = x;
    this.y = y;
    this.trail.length = 0;
    this.hadFigure = true;
    this.swimming = false;
  }

  /** The baby Reaper, out of his egg at sea at this point: he leaps from it into the water beside the boat. */
  hatchAt(x: number, y: number): void {
    this.free = true;
    this.state = 'away';
    this.hp = this.maxHp;
    this.x = x;
    this.y = y;
    this.swimming = true;
    this.leapT = 0;
    this.leapCd = LEAP_EVERY;
  }

  /** The baby Reaper leaps clear of the water, if he is swimming and not leaping already. Returns whether he did. */
  leap(): boolean {
    if (this.kind !== 'baby' || !this.swimming || this.state === 'with' || this.leapT >= 0)
      return false;
    this.leapT = 0;
    this.leapCd = LEAP_EVERY;
    return true;
  }

  /** How high the baby Reaper is out of the water, mid-leap. */
  get leapZ(): number {
    return this.leapT < 0 ? 0 : Math.sin((Math.PI * this.leapT) / LEAP_T) * LEAP_H;
  }

  /** A hit on it. Returns whether it hurt. */
  hurt(): boolean {
    if (this.state !== 'with' || this.invuln > 0) return false;
    if (this.worn.absorb()) {
      this.invuln = PAL_INVULN;
      return true;
    }
    this.hp--;
    this.invuln = PAL_INVULN;
    if (this.hp <= 0) {
      this.state = 'resting';
      this.rest = PAL_REST;
      this.onHurt?.(true);
    } else this.onHurt?.(false);
    return true;
  }

  /** Knocked flying, as by the Old One: back to the boat to rest, without a word. */
  knockOut(): void {
    if (this.state !== 'with') return;
    this.state = 'resting';
    this.rest = PAL_REST;
    this.hp = 0;
  }

  /** A fight has begun: the cat has at least its two heals again. */
  newFight(): void {
    this.heals = Math.max(this.heals, HEALS);
  }

  /** The figure has lost a heart: the cat will give one back, if it has a heal and is with it. */
  noticeHurt(): void {
    if (this.kind !== 'cat' || this.state !== 'with' || this.heals <= 0 || this.healT >= 0) return;
    this.healT = HEAL_DELAY;
    this.healWho = null;
  }

  /** A companion has been hurt (not worn out): a cat that has had tuna will heal it too. */
  noticePalHurt(who: object): void {
    if (
      this.kind !== 'cat' ||
      !this.tuna ||
      this.state !== 'with' ||
      this.heals <= 0 ||
      this.healT >= 0
    )
      return;
    this.healT = HEAL_DELAY;
    this.healWho = who;
  }

  /**
   * Fed a fish: another heal, up to the most it holds. A tuna also lets it heal companions, and it will eat one for
   * that even full. Returns whether it would eat.
   */
  feed(tuna = false): boolean {
    if (this.kind !== 'cat') return false;
    const wantsTuna = tuna && !this.tuna;
    if (this.heals >= MAX_HEALS && !wantsTuna) return false;
    this.heals = Math.min(MAX_HEALS, this.heals + 1);
    if (tuna) this.tuna = true;
    this.love = 1.6;
    return true;
  }

  /** A pat. */
  pet(): void {
    this.love = 1.6;
  }

  private arrive(f: { x: number; y: number }): void {
    this.x = f.x;
    this.y = f.y;
    const off =
      this.kind === 'cat'
        ? [16, 12]
        : this.kind === 'warrior'
          ? [-16, 14]
          : this.kind === 'naga'
            ? [-14, -18]
            : this.kind === 'necro'
              ? [-20, -6]
              : this.kind === 'baby'
                ? [12, 18]
                : this.kind === 'caterman'
                  ? [-10, 20]
                  : [14, -16];
    for (const [dx, dy] of [
      off,
      [-(off[0] as number), off[1] as number],
      [0, 18],
      [18, 0],
    ] as const) {
      if (walkable(f.x + (dx as number), f.y + (dy as number), 99)) {
        this.x = f.x + (dx as number);
        this.y = f.y + (dy as number);
        break;
      }
    }
    this.trail.length = 0;
  }

  update(dt: number, w: World): void {
    this.invuln = Math.max(0, this.invuln - dt);
    this.love = Math.max(0, this.love - dt);
    this.raiseCd = Math.max(0, this.raiseCd - dt);
    this.swingT += dt;
    if (this.healT >= 0) {
      this.healT -= dt;
      if (this.healT < 0 && this.heals > 0 && this.state === 'with') {
        this.heals--;
        if (this.healWho) this.onHealPal?.(this.healWho);
        else this.onHeal?.();
        this.healWho = null;
        // The tuna is spent with the last of its heals.
        if (this.heals <= 0) this.tuna = false;
      }
    }
    if (!this.free) return;
    const f = w.figure;
    const landed = !!f && !this.hadFigure;
    this.hadFigure = !!f;
    if (landed) this.worn.refill();
    const hurt = this.state === 'with' && this.hp < this.maxHp;
    if (this.worn.tick(dt, hurt) && hurt) this.hp++;
    if (this.state === 'resting') {
      this.rest -= dt;
      if (landed) this.rest = 0;
      if (this.rest > 0) {
        this.swim(dt, w);
        return;
      }
      this.state = 'away';
      this.hp = this.maxHp;
    }
    if (!f) {
      if (this.state === 'with') this.state = 'away';
      this.hp = this.maxHp;
      this.swim(dt, w);
      return;
    }
    if (this.state === 'away' || Math.hypot(f.x - this.x, f.y - this.y) > PAL_BLINK) {
      this.state = 'with';
      this.swimming = false;
      this.arrive(f);
      return;
    }
    this.gait = Math.max(0, this.gait - dt * 4);
    // Something to fight, near the figure?
    const foe = this.findTarget?.(f.x, f.y, FIGHT_FROM) ?? null;
    this.swingCd -= dt;
    const raiser = this.kind === 'bones' || this.kind === 'necro';
    if (foe && raiser && this.raiseCd <= 0 && (this.canRaise?.() ?? true)) {
      this.raiseCd = this.kind === 'necro' ? HAMSTER_EVERY : RAISE_EVERY;
      this.swingT = 0;
      this.onRaise?.(this.x, this.y);
    }
    // The necromancer keeps back and lets his hamster fight; the rest go in.
    if (foe && this.kind !== 'necro') {
      const dx = foe.x - this.x;
      const dy = foe.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      this.h = Math.atan2(dy, dx);
      if (d > REACH[this.kind]) this.step(dx / d, dy / d, PAL_SPEED, dt);
      else if (this.swingCd <= 0) {
        this.swingCd = SWING_EVERY[this.kind];
        this.swingT = 0;
        foe.hit(this.worn.power(POWER[this.kind]));
        this.onSwing?.();
      }
      this.trail.length = 0;
      return;
    }
    // Otherwise at the figure's heel, along the way it walked.
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(f.x - last.x, f.y - last.y) >= 5) {
      this.trail.push({ x: f.x, y: f.y });
      if (this.trail.length > 80) this.trail.shift();
    }
    const d = Math.hypot(f.x - this.x, f.y - this.y);
    const heel = this.heelAt ?? PAL_HEEL[this.kind];
    if (d > heel) {
      while (this.trail.length > 1) {
        const c = this.trail[0] as { x: number; y: number };
        if (Math.hypot(c.x - this.x, c.y - this.y) >= 4) break;
        this.trail.shift();
      }
      const t = this.trail[0] ?? f;
      const dx = t.x - this.x;
      const dy = t.y - this.y;
      const dl = Math.hypot(dx, dy);
      if (dl > 0.5) {
        const moved = this.step(dx / dl, dy / dl, Math.min(PAL_SPEED, 30 + (d - heel) * 5), dt);
        this.blockedT = moved > 0 ? 0 : this.blockedT + dt;
        if (this.blockedT >= STUCK_T) {
          this.blockedT = 0;
          this.arrive(f);
        }
      }
    } else this.h = Math.atan2(f.y - this.y, f.x - this.x);
  }

  /**
   * The naga at sea: beside the boat on the side nearer the viewer, so the hull never hides him, ducking
   * under to the other side once a turn has clearly put him behind it; keeping up; over at once if far behind.
   * The baby Reaper the same, but off the bow on the far side, leaping now and then.
   */
  private swim(dt: number, w: World): void {
    if (this.kind !== 'naga' && this.kind !== 'baby') return;
    const b = w.boat;
    const k = w.hullScale;
    const c = Math.cos(b.h);
    const s = Math.sin(b.h);
    // The boat's right side faces the viewer when it points down the screen's +x+y.
    const near = c - s;
    if (near > 0.35) this.side = 1;
    else if (near < -0.35) this.side = -1;
    const baby = this.kind === 'baby';
    const side = baby ? -this.side : this.side;
    const along = (baby ? BABY_AHEAD : SWIM_AHEAD) * k;
    const off = (baby ? BABY_SIDE : SWIM_SIDE) * k * side;
    const tx = b.x + c * along - s * off;
    const ty = b.y + s * along + c * off;
    if (baby) this.leaping(dt);
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (!this.swimming || d > PAL_BLINK) {
      this.swimming = true;
      this.x = tx;
      this.y = ty;
      this.h = b.h;
      return;
    }
    // As fast as the boat and more, so he keeps his place beside it rather than trailing into the net.
    const sp = Math.min(d * 8, Math.abs(b.v) * 1.3 + 120);
    if (d > 0.5) {
      this.x += (dx / d) * sp * dt;
      this.y += (dy / d) * sp * dt;
    }
    if (Math.abs(b.v) > 12) this.h = b.v > 0 ? b.h : b.h + Math.PI;
    else if (baby && this.leapT < 0) this.h = b.h;
    this.ph += dt * (2.5 + Math.abs(b.v) / 30);
  }

  /** The baby Reaper's leaps: one every few seconds, and the splash as he goes back in. */
  private leaping(dt: number): void {
    if (this.leapT >= 0) {
      this.leapT += dt;
      if (this.leapT >= LEAP_T) {
        this.leapT = -1;
        this.onSplash?.(this.x, this.y);
      }
      return;
    }
    this.leapCd -= dt;
    if (this.leapCd <= 0) this.leap();
  }

  private step(ux: number, uy: number, sp: number, dt: number): number {
    const moved = walkStep(this, ux * sp * dt, uy * sp * dt, 99);
    if (moved > 0) {
      this.h = Math.atan2(uy, ux);
      this.ph += moved * 0.3;
      this.gait = 1;
    }
    return moved;
  }

  draw(_v: DrawView, _layer: Layer): void {}

  /** It, at its feet, for the game's sorted solids. */
  drawBody(v: DrawView): void {
    if (this.state !== 'with') return;
    if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2) return;
    const sx = v.px(this.x, this.y);
    const sy = v.py(this.x, this.y, Math.abs(Math.sin(this.ph)) * 2 * this.gait);
    if (this.kind === 'necro')
      drawNecromancer(v, this.x, this.y, this.ph, { raising: this.swingT < 0.6 });
    else if (this.kind === 'cat')
      drawCat(v, sx, sy, this.h, this.ph, this.gait, this.swingT < 0.25, 1);
    else if (this.kind === 'warrior')
      drawWarrior(v, sx, sy, this.h, this.ph, this.gait, this.swingT < 0.3, 1);
    else if (this.kind === 'naga')
      drawNaga(v, sx, sy, this.h, this.ph, this.gait, this.swingT < 0.3, 1, false);
    else if (this.kind === 'caterman')
      drawCaterman(v, sx, sy, this.h, this.ph, this.gait, this.swingT < 0.22, 1);
    else if (this.kind === 'baby') {
      // His middle stands this high on his legs; he trots, bobbing, and his jaw snaps open as he nips.
      const z = (50 * BABY_LEN) / 240 + Math.abs(Math.sin(this.ph * 0.5)) * 1.5 * this.gait;
      drawReaperBody(v, this.x, this.y, z, sideOn(this.h), 0, {
        T: this.ph / 12,
        len: BABY_LEN,
        legs: 'walk',
        mouth: this.swingT < 0.3 ? 1 - this.swingT / 0.3 : 0,
        young: true,
      });
    } else drawBones(v, sx, sy, this.h, this.ph, this.gait, this.swingT < 0.3, 1);
    this.drawOver(v, sx, sy);
  }

  /** Its hit points when hurt, and hearts when petted, over it. */
  private drawOver(v: DrawView, sx: number, sy: number): void {
    const { ctx } = v;
    const Z = v.zoom;
    const top =
      sy -
      (this.kind === 'cat'
        ? 20
        : this.kind === 'warrior'
          ? 30
          : this.kind === 'naga'
            ? 36
            : this.kind === 'necro'
              ? 50
              : this.kind === 'baby'
                ? 26
                : this.kind === 'caterman'
                  ? 36
                  : 40) *
        Z;
    const max = this.maxHp;
    if (this.hp < max) {
      for (let i = 0; i < max; i++) {
        ctx.fillStyle = i < this.hp ? '#3FB37A' : 'rgba(128,128,128,.4)';
        ctx.fillRect(sx + (i - max / 2) * 5 * Z, top, 4 * Z, 3 * Z);
      }
    }
    if (this.love > 0) {
      ctx.fillStyle = `rgba(255,105,140,${Math.min(1, this.love)})`;
      for (let i = 0; i < 2; i++) {
        const hx = sx + (i ? 6 : -6) * Z;
        const hy = top - 6 * Z - (1.6 - this.love) * 14 * Z;
        ctx.beginPath();
        ctx.arc(hx - 1.5 * Z, hy, 1.8 * Z, 0, Math.PI * 2);
        ctx.arc(hx + 1.5 * Z, hy, 1.8 * Z, 0, Math.PI * 2);
        ctx.moveTo(hx - 3.2 * Z, hy + 0.4 * Z);
        ctx.lineTo(hx, hy + 3.6 * Z);
        ctx.lineTo(hx + 3.2 * Z, hy + 0.4 * Z);
        ctx.fill();
      }
    }
  }

  /**
   * Where it rides on a boat of this hull scale: the cat on the cabin roof, the warrior at the stern, the bones at
   * the bow, the necromancer amidships.
   */
  seat(b: { x: number; y: number; h: number }, k: number): { x: number; y: number; z: number } {
    const c = Math.cos(b.h);
    const s = Math.sin(b.h);
    if (this.kind === 'cat') return { x: b.x - c * 4 * k, y: b.y - s * 4 * k, z: 26 * k };
    if (this.kind === 'bones') return { x: b.x + c * 20 * k, y: b.y + s * 20 * k, z: 9 * k + 1 };
    // Caterman up at the bow, on the warrior's side, ready with his blaster.
    if (this.kind === 'caterman')
      return { x: b.x + c * 13 * k - s * 7 * k, y: b.y + s * 13 * k + c * 7 * k, z: 9 * k + 1 };
    // The necromancer amidships, on the side away from the warrior.
    if (this.kind === 'necro')
      return { x: b.x + c * 6 * k + s * 7 * k, y: b.y + s * 6 * k - c * 7 * k, z: 9 * k + 1 };
    return { x: b.x - c * 22 * k - s * 5 * k, y: b.y - s * 22 * k + c * 5 * k, z: 9 * k + 1 };
  }

  /** Riding along on a boat of this hull scale while the figure is aboard. */
  drawAboard(v: DrawView, b: { x: number; y: number; h: number }, k: number): void {
    if (!this.free || this.state === 'with' || this.kind === 'naga' || this.kind === 'baby') return;
    if (this.kind === 'cat') {
      // On the cabin roof, curled up.
      const p = this.seat(b, k);
      const sx = v.px(p.x, p.y);
      const sy = v.py(p.x, p.y, p.z);
      drawCat(v, sx, sy, b.h, 0, 0, false, 0.8);
      this.drawOver(v, sx, sy);
    } else if (this.kind === 'necro') {
      const p = this.seat(b, k);
      drawNecromancer(v, p.x, p.y, 0, { z: p.z, size: 0.8 });
    } else if (this.kind === 'caterman') {
      const p = this.seat(b, k);
      drawCaterman(v, v.px(p.x, p.y), v.py(p.x, p.y, p.z), b.h, 0, 0, false, 0.8);
    } else {
      const p = this.seat(b, k);
      const draw = this.kind === 'warrior' ? drawWarrior : drawBones;
      draw(v, v.px(p.x, p.y), v.py(p.x, p.y, p.z), b.h, 0, 0, false, 0.8);
    }
  }
}

/** The naga or the baby Reaper can be drawn swimming: free and not ashore with the figure. */
export function swims(p: Pal): boolean {
  return (p.kind === 'naga' || p.kind === 'baby') && p.free && p.state !== 'with' && p.swimming;
}

/** The naga in the water beside the boat: his tail under the surface, a ripple round him. */
export function drawSwimming(v: DrawView, p: Pal): void {
  if (!swims(p)) return;
  if (p.kind === 'baby') {
    drawBabySwimming(v, p);
    return;
  }
  const { ctx } = v;
  const Z = v.zoom;
  const sx = v.px(p.x, p.y);
  const sy = v.py(p.x, p.y, 0);
  ctx.strokeStyle = 'rgba(255,255,255,.45)';
  ctx.lineWidth = 1.2 * Z;
  ctx.beginPath();
  ctx.ellipse(
    sx,
    sy,
    (10 + Math.sin(v.T * 3) * 1.5) * Z,
    (5 + Math.sin(v.T * 3) * 0.7) * Z,
    0,
    0,
    Math.PI * 2,
  );
  ctx.stroke();
  drawNaga(v, sx, sy, p.h, p.ph, 1, false, 1, true);
}

/**
 * The baby Reaper in the water, side on as his father is drawn: paddling at the surface with his back, his fin and his
 * big eye up out of it and his legs under, a ripple round him; mid-leap, all of him up out of the water, nose up
 * rising and nose down falling, legs paddling, with rings where he left it.
 */
function drawBabySwimming(v: DrawView, p: Pal): void {
  const { ctx } = v;
  const Z = v.zoom;
  const sx = v.px(p.x, p.y);
  const sy = v.py(p.x, p.y, 0);
  const h = sideOn(p.h);
  const ring = (r: number, a: number) => {
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = 1.2 * Z;
    ctx.beginPath();
    ctx.ellipse(sx, sy, r * Z, r * 0.5 * Z, 0, 0, Math.PI * 2);
    ctx.stroke();
  };
  if (p.leapT >= 0) {
    const f = p.leapT / LEAP_T;
    if (f < 0.35) ring(10 + f * 34, 0.5 * (1 - f / 0.35));
    if (f > 0.75) ring(8 + (f - 0.75) * 44, 0.5);
    drawReaperBody(v, p.x, p.y, p.leapZ, h, Math.cos(Math.PI * f) * 0.55, {
      T: v.T,
      len: BABY_SEA_LEN,
      legs: 'swim',
      mouth: f > 0.3 && f < 0.6 ? 0.6 : 0,
      young: true,
    });
    return;
  }
  // Only what is above the water shows: cut him off at the surface, bobbing a little.
  ctx.save();
  ctx.beginPath();
  ctx.rect(sx - 200 * Z, sy - 200 * Z, 400 * Z, 201.5 * Z);
  ctx.clip();
  drawReaperBody(v, p.x, p.y, 2 + Math.sin(v.T * 2.4) * 1.2, h, 0.05, {
    T: v.T,
    len: BABY_SEA_LEN,
    legs: 'swim',
    young: true,
  });
  ctx.restore();
  ring(13 + Math.sin(v.T * 3) * 1.5, 0.45);
}

/**
 * The Forgotten One's bones, on your side now: a tall skeleton with his long black hair still on the
 * skull, green where his eyes were red, and his great sword.
 */
export function drawBones(
  v: DrawView,
  x: number,
  y: number,
  h: number,
  ph: number,
  gait: number,
  swing: boolean,
  size: number,
): void {
  const { ctx } = v;
  const Z = v.zoom * size * 1.3;
  const dir = Math.cos(h) - Math.sin(h) >= 0 ? 1 : -1;
  const step = Math.sin(ph) * 2.4 * gait;
  const bone = '#EDE8DA';
  const hy = y - 25 * Z;
  // His hair, hanging down behind the skull.
  ctx.fillStyle = '#0E0C10';
  ctx.beginPath();
  ctx.arc(x, hy - 0.4 * Z, 4.8 * Z, Math.PI, 0);
  ctx.lineTo(x + 5.4 * Z, hy + 9.5 * Z);
  for (let i = 1; i <= 4; i++) ctx.lineTo(x + (5.4 - i * 2.7) * Z, hy + (i % 2 ? 7 : 10) * Z);
  ctx.closePath();
  ctx.fill();
  // Legs, spine, hips and ribs.
  ctx.strokeStyle = bone;
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.8 * Z;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + s * 2 * Z, y - 10 * Z);
    ctx.lineTo(x + (s * 2 + step * s) * Z, y);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x, y - 10 * Z);
  ctx.lineTo(x, y - 21 * Z);
  ctx.stroke();
  ctx.lineWidth = 1.4 * Z;
  ctx.beginPath();
  ctx.moveTo(x - 3 * Z, y - 10 * Z);
  ctx.lineTo(x + 3 * Z, y - 10 * Z);
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(x, y - 14 * Z - i * 2.4 * Z, (4 - i * 0.4) * Z, 1.2 * Z, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  // The skull, with green eyes now.
  ctx.fillStyle = bone;
  ctx.beginPath();
  ctx.arc(x, hy, 4.2 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 2.4 * Z, hy + 2.6 * Z, 4.8 * Z, 2.4 * Z);
  ctx.fillStyle = '#5BE08E';
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + dir * 0.8 * Z + e * 1.6 * Z, hy - 0.2 * Z, 1.1 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  // And the fringe of his hair either side of it.
  ctx.fillStyle = '#0E0C10';
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + e * 0.4 * Z, hy - 4.3 * Z);
    ctx.quadraticCurveTo(x + e * 4.8 * Z, hy - 4.4 * Z, x + e * 4.4 * Z, hy + 5 * Z);
    ctx.lineTo(x + e * 3.2 * Z, hy + 1.5 * Z);
    ctx.quadraticCurveTo(x + e * 3.2 * Z, hy - 2.6 * Z, x + e * 0.4 * Z, hy - 4.3 * Z);
    ctx.fill();
  }
  // His great sword, with its cross-guard: up, then down as he strikes.
  const a = swing ? -0.2 : -1.1;
  const hx = x + 5 * Z * dir;
  const hyy = y - 16 * Z;
  ctx.strokeStyle = '#B9C2C8';
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  ctx.moveTo(hx, hyy);
  ctx.lineTo(hx + Math.cos(a) * 16 * Z * dir, hyy + Math.sin(a) * 16 * Z);
  ctx.stroke();
  ctx.strokeStyle = '#5A5560';
  ctx.lineWidth = 1.8 * Z;
  ctx.beginPath();
  ctx.moveTo(hx - 2.6 * Z, hyy + 0.6 * Z);
  ctx.lineTo(hx + 2.6 * Z, hyy - 0.6 * Z);
  ctx.stroke();
}

/** The healer cat: white, with a pink nose, a swishing tail and a red cross on its collar. */
export function drawCat(
  v: DrawView,
  x: number,
  y: number,
  h: number,
  ph: number,
  gait: number,
  swipe: boolean,
  size: number,
): void {
  const { ctx, T } = v;
  const Z = v.zoom * size;
  const dir = Math.cos(h) - Math.sin(h) >= 0 ? 1 : -1;
  const step = Math.sin(ph * 2) * 1.5 * gait;
  // Tail, curling up behind.
  ctx.strokeStyle = '#F2EEE6';
  ctx.lineWidth = 2.4 * Z;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 6 * Z * dir, y - 5 * Z);
  ctx.quadraticCurveTo(
    x - 12 * Z * dir,
    y - 8 * Z,
    x - 10 * Z * dir,
    y - 15 * Z + Math.sin(T * 3) * 2 * Z,
  );
  ctx.stroke();
  // Legs.
  ctx.strokeStyle = '#E3DDD2';
  ctx.lineWidth = 1.8 * Z;
  for (const lx of [-4, 3]) {
    ctx.beginPath();
    ctx.moveTo(x + lx * Z * dir, y - 4 * Z);
    ctx.lineTo(x + (lx + step) * Z * dir, y);
    ctx.stroke();
  }
  // Body and head.
  ctx.fillStyle = '#F7F4EE';
  ctx.beginPath();
  ctx.ellipse(x, y - 6 * Z, 7 * Z, 4.2 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  const hx = x + 6 * Z * dir;
  const hy = y - 10 * Z;
  ctx.beginPath();
  ctx.arc(hx, hy, 4 * Z, 0, Math.PI * 2);
  ctx.fill();
  // Ears.
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + (e * 3.4 - 0.4) * Z, hy - 2 * Z);
    ctx.lineTo(hx + e * 2.6 * Z, hy - 6.4 * Z);
    ctx.lineTo(hx + e * 0.6 * Z, hy - 3.4 * Z);
    ctx.closePath();
    ctx.fill();
  }
  // Eyes, nose, and the red cross on its collar.
  ctx.fillStyle = '#3A6E52';
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(hx + (e * 1.5 + dir) * Z, hy - 0.4 * Z, 0.8 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#F08AA0';
  ctx.beginPath();
  ctx.arc(hx + 2 * Z * dir, hy + 1.2 * Z, 0.7 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#E4572E';
  ctx.fillRect(hx - 1.6 * Z * dir - 1.6 * Z, hy + 3 * Z, 3.2 * Z, 1.2 * Z);
  ctx.fillRect(hx - 1.6 * Z * dir - 0.6 * Z, hy + 2 * Z, 1.2 * Z, 3.2 * Z);
  if (swipe) {
    // A swipe: three quick claw lines out in front.
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 1.2 * Z;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(hx + 5 * Z * dir, hy - 3 * Z + i * 2.5 * Z);
      ctx.lineTo(hx + 11 * Z * dir, hy - 5 * Z + i * 2.5 * Z);
      ctx.stroke();
    }
  }
}

/** The Cthulhu warrior: small, an octopus for a head with a beard of tentacles, a sword and a round shield. */
export function drawWarrior(
  v: DrawView,
  x: number,
  y: number,
  h: number,
  ph: number,
  gait: number,
  swing: boolean,
  size: number,
): void {
  const { ctx, T } = v;
  const Z = v.zoom * size;
  const dir = Math.cos(h) - Math.sin(h) >= 0 ? 1 : -1;
  const step = Math.sin(ph) * 2.5 * gait;
  ctx.lineCap = 'round';
  // Legs.
  ctx.strokeStyle = '#2C4C3F';
  ctx.lineWidth = 2.6 * Z;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + s * 2 * Z, y - 8 * Z);
    ctx.lineTo(x + (s * 2 + step * s) * Z, y);
    ctx.stroke();
  }
  // Body, armoured.
  ctx.fillStyle = '#6A4E8C';
  ctx.beginPath();
  ctx.ellipse(x, y - 13 * Z, 5 * Z, 6.5 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  // Shield on the far arm.
  ctx.fillStyle = '#8E7AB0';
  ctx.beginPath();
  ctx.arc(x - 5 * Z * dir, y - 13 * Z, 4 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#C9B8E8';
  ctx.lineWidth = 1 * Z;
  ctx.stroke();
  // Sword in the near hand, up and swinging down when it strikes.
  const a = swing ? -0.2 : -1.1;
  const hx = x + 5 * Z * dir;
  const hy = y - 13 * Z;
  ctx.strokeStyle = '#D9DEE3';
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(hx + Math.cos(a) * 13 * Z * dir, hy + Math.sin(a) * 13 * Z);
  ctx.stroke();
  // The octopus head and its beard.
  const gx = x;
  const gy = y - 24 * Z;
  ctx.fillStyle = '#4E8A6E';
  ctx.beginPath();
  ctx.ellipse(gx, gy, 5.5 * Z, 6.5 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3E6B57';
  ctx.lineWidth = 1.4 * Z;
  for (let i = 0; i < 4; i++) {
    const bx = gx + (-3 + i * 2) * Z;
    ctx.beginPath();
    ctx.moveTo(bx, gy + 4 * Z);
    ctx.quadraticCurveTo(bx + Math.sin(T * 3 + i) * 1.5 * Z, gy + 7 * Z, bx, gy + 10 * Z);
    ctx.stroke();
  }
  ctx.fillStyle = '#B8FF7A';
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(gx + (e * 2 + dir) * Z, gy - 0.5 * Z, 1 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}

const NAGA = {
  blue: '#3A78C8',
  dark: '#24508F',
  spot: '#1B3A6B',
  pale: '#8FC4F0',
  fin: '#8A4FC9',
  spine: '#C8323C',
  orange: '#E07A2E',
  blade: '#F08A3A',
  edge: '#B5521E',
} as const;

/**
 * The naga, the kid's blue sea-warrior: a fish head with its jaws open, an orange crest with red spines, orange
 * shoulder plates, a blue body on a long spotted snake's tail that ends in a purple fin, and a long pole with a
 * great serrated orange fin-blade, held up and brought down as he strikes. In the water his tail is under the
 * surface and only his top half shows.
 */
export function drawNaga(
  v: DrawView,
  x: number,
  y: number,
  h: number,
  ph: number,
  gait: number,
  swing: boolean,
  size: number,
  inWater: boolean,
): void {
  const { ctx, T } = v;
  const Z = v.zoom * size;
  const dir = Math.cos(h) - Math.sin(h) >= 0 ? 1 : -1;
  const X = (dx: number) => x + dx * dir * Z;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // The tail: curled on the ground behind him ashore, stretched out under the surface at sea.
  const wave = (i: number) => Math.sin(ph * 2 + i * 1.3) * (inWater ? 1.6 : 1.1 * gait);
  const tail: [number, number][] = inWater
    ? [
        [0, 0],
        [-7, 1],
        [-15, 1],
        [-23, 0],
        [-30, -1],
      ]
    : [
        [0, -8],
        [-6, -1],
        [-14, 0],
        [-20, -3],
        [-22, -10],
      ];
  const pts = tail.map(([tx, ty], i): [number, number] => [X(tx), y + (ty + wave(i)) * Z]);
  ctx.globalAlpha = inWater ? 0.45 : 1;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i] as [number, number];
    const b = pts[i + 1] as [number, number];
    ctx.strokeStyle = NAGA.blue;
    ctx.lineWidth = (6.2 - i * 1.1) * Z;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.fillStyle = NAGA.spot;
    ctx.beginPath();
    ctx.arc((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.6 * Z, 0.8 * Z, 0, Math.PI * 2);
    ctx.fill();
    if (!inWater) {
      // Red spines along the top of the tail.
      ctx.strokeStyle = NAGA.spine;
      ctx.lineWidth = 0.8 * Z;
      ctx.beginPath();
      ctx.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - (2.6 - i * 0.4) * Z);
      ctx.lineTo((a[0] + b[0]) / 2 - dir * 1.5 * Z, (a[1] + b[1]) / 2 - (5.4 - i * 0.6) * Z);
      ctx.stroke();
    }
  }
  // The purple fin at its end.
  const end = pts[pts.length - 1] as [number, number];
  const fx = end[0];
  const fy = end[1];
  ctx.fillStyle = NAGA.fin;
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(fx - dir * 5 * Z, fy - 4.5 * Z);
  ctx.lineTo(fx - dir * 3.5 * Z, fy);
  ctx.lineTo(fx - dir * 5 * Z, fy + 3.5 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  // Above the water, or standing on his tail: he bobs a little at sea.
  const by = inWater ? y + Math.sin(T * 2.2) * 0.8 * Z - 2 * Z : y - 8 * Z;
  if (inWater) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 40 * Z, y - 70 * Z, 80 * Z, 70 * Z + 0.5);
    ctx.clip();
  }
  const Y = (dy: number) => by + dy * Z;
  // The pole, held behind him first so the far arm and the body go over it.
  const a = swing ? -0.2 : -1.2;
  const ux = Math.cos(a) * dir;
  const uy = Math.sin(a);
  const hx = X(4);
  const hy = Y(-7);
  const back = [hx - ux * 11 * Z, hy - uy * 11 * Z] as const;
  const front = [hx + ux * 19 * Z, hy + uy * 19 * Z] as const;
  ctx.strokeStyle = '#3A2E28';
  ctx.lineWidth = 1.6 * Z;
  ctx.beginPath();
  ctx.moveTo(back[0], back[1]);
  ctx.lineTo(front[0], front[1]);
  ctx.stroke();
  // A spike on its back end, and the great serrated fin-blade on the front.
  ctx.fillStyle = NAGA.blade;
  ctx.beginPath();
  ctx.moveTo(back[0] - ux * 3.5 * Z, back[1] - uy * 3.5 * Z);
  ctx.lineTo(back[0] - uy * 1.2 * Z * dir, back[1] + ux * 1.2 * Z * dir);
  ctx.lineTo(back[0] + uy * 1.2 * Z * dir, back[1] - ux * 1.2 * Z * dir);
  ctx.closePath();
  ctx.fill();
  // Across the pole, on the side away from him.
  const nx = uy * dir;
  const ny = -ux * dir;
  const side = ny > 0 ? 1 : -1;
  const at = (t: number, w: number): [number, number] => [
    front[0] + ux * t * Z + nx * side * w * Z,
    front[1] + uy * t * Z + ny * side * w * Z,
  ];
  const blade: [number, number][] = [
    at(-3, 0),
    at(10, 0),
    at(8, 3.2),
    at(6, 2.2),
    at(4, 4.6),
    at(2, 3.2),
    at(0, 5.2),
    at(-2, 3.4),
  ];
  ctx.beginPath();
  for (const [i, [bx, by]] of blade.entries()) {
    if (i) ctx.lineTo(bx, by);
    else ctx.moveTo(bx, by);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = NAGA.edge;
  ctx.lineWidth = 0.7 * Z;
  ctx.stroke();
  // The far arm, onto the pole behind his hand.
  ctx.strokeStyle = NAGA.dark;
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  ctx.moveTo(X(-3), Y(-11));
  ctx.lineTo(hx - ux * 5 * Z, hy - uy * 5 * Z);
  ctx.stroke();
  // His body, its belly paler, and red spines down his back.
  ctx.fillStyle = NAGA.blue;
  ctx.beginPath();
  ctx.ellipse(x, Y(-6), 4.6 * Z, 7 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = NAGA.pale;
  ctx.beginPath();
  ctx.ellipse(X(1.6), Y(-5), 2.2 * Z, 5 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = NAGA.spine;
  ctx.lineWidth = 0.8 * Z;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(X(-4), Y(-11 + i * 3));
    ctx.lineTo(X(-7.5), Y(-12.5 + i * 3));
    ctx.stroke();
  }
  // Orange shoulder plates, a red swirl on the near one.
  ctx.fillStyle = NAGA.orange;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(X(s * 4.2), Y(-11.5), 2.8 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = NAGA.spine;
  ctx.beginPath();
  ctx.arc(X(4.2), Y(-11.5), 1.2 * Z, 0, Math.PI * 2);
  ctx.fill();
  // The near arm, a grey bracer at the wrist, onto the pole.
  ctx.strokeStyle = NAGA.blue;
  ctx.lineWidth = 2.2 * Z;
  ctx.beginPath();
  ctx.moveTo(X(4.2), Y(-11));
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.strokeStyle = '#B8BEC6';
  ctx.lineWidth = 2.6 * Z;
  ctx.beginPath();
  ctx.moveTo(hx + (X(4.2) - hx) * 0.35, hy + (Y(-11) - hy) * 0.35);
  ctx.lineTo(hx + (X(4.2) - hx) * 0.15, hy + (Y(-11) - hy) * 0.15);
  ctx.stroke();
  // The orange crest behind his head, with red spines fanning back.
  ctx.fillStyle = NAGA.orange;
  ctx.beginPath();
  ctx.moveTo(X(1), Y(-21));
  ctx.lineTo(X(-6), Y(-24));
  ctx.lineTo(X(-7), Y(-16));
  ctx.lineTo(X(-1), Y(-15));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = NAGA.spine;
  ctx.lineWidth = 0.9 * Z;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(X(1.5 - i * 1.6), Y(-20.5 + i * 0.6));
    ctx.lineTo(X(-0.5 - i * 2.3), Y(-27 + i * 1.6));
    ctx.stroke();
  }
  // The fish head, its jaws open on little teeth, a yellow eye.
  ctx.fillStyle = NAGA.blue;
  ctx.beginPath();
  ctx.ellipse(X(1.5), Y(-17.5), 4.6 * Z, 4 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(X(5.5), Y(-16.5), 3 * Z, 2.3 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#16233A';
  ctx.beginPath();
  ctx.moveTo(X(8.6), Y(-16));
  ctx.lineTo(X(3.5), Y(-15.6));
  ctx.lineTo(X(8.2), Y(-14));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  for (const t of [5, 7]) {
    ctx.beginPath();
    ctx.moveTo(X(t), Y(-15.9));
    ctx.lineTo(X(t + 0.6), Y(-15.1));
    ctx.lineTo(X(t + 1.2), Y(-15.9));
    ctx.fill();
  }
  ctx.fillStyle = '#F2D04A';
  ctx.beginPath();
  ctx.arc(X(3.4), Y(-19), 1.3 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#14222A';
  ctx.beginPath();
  ctx.arc(X(3.7), Y(-19), 0.6 * Z, 0, Math.PI * 2);
  ctx.fill();
  if (inWater) ctx.restore();
}

/** The cage at the monkey camp: bamboo bars lashed with rope under a thatch, the naga in it until he is freed. */
export function drawNagaCage(
  v: DrawView,
  x: number,
  y: number,
  r: number,
  open: number,
  nagaIn: boolean,
): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const H = 36;
  v.box(x - r, y - r, r * 2, r * 2, 0, 2, '#6B5136', '#7E6040');
  const bars = (front: boolean) => {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const bx = x + Math.cos(a) * r;
      const by = y + Math.sin(a) * r;
      if (Math.cos(a) + Math.sin(a) > 0 !== front) continue;
      const lift = open * (H - 6);
      ctx.strokeStyle = '#9C7A3E';
      ctx.lineWidth = 1.8 * Z;
      ctx.beginPath();
      ctx.moveTo(px(bx, by), py(bx, by, 2 + lift));
      ctx.lineTo(px(bx, by), py(bx, by, H));
      ctx.stroke();
    }
    // Rope lashings round the bars.
    ctx.strokeStyle = '#D8C38E';
    ctx.lineWidth = 1 * Z;
    for (const z of [H * 0.35, H * 0.75]) {
      if (z < 2 + open * (H - 6)) continue;
      ctx.beginPath();
      ctx.ellipse(
        px(x, y),
        py(x, y, z),
        r * Z,
        r * Z * 0.5,
        0,
        front ? 0 : Math.PI,
        front ? Math.PI : Math.PI * 2,
      );
      ctx.stroke();
    }
  };
  bars(false);
  if (nagaIn) drawNaga(v, px(x, y), py(x, y, 2), Math.PI / 4, 0, 0, false, 0.85, false);
  bars(true);
  // A thatch over it.
  ctx.fillStyle = '#B4934F';
  ctx.beginPath();
  ctx.moveTo(px(x - r - 3, y), py(x - r - 3, y, H));
  ctx.lineTo(px(x, y - r - 3), py(x, y - r - 3, H));
  ctx.lineTo(px(x + r + 3, y), py(x + r + 3, y, H));
  ctx.lineTo(px(x, y + r + 3), py(x, y + r + 3, H));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#C9A960';
  ctx.beginPath();
  ctx.moveTo(px(x - r - 3, y), py(x - r - 3, y, H));
  ctx.lineTo(px(x, y), py(x, y, H + 9));
  ctx.lineTo(px(x + r + 3, y), py(x + r + 3, y, H));
  ctx.lineTo(px(x, y + r + 3), py(x, y + r + 3, H));
  ctx.closePath();
  ctx.fill();
}
