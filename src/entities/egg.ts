/**
 * The Reaper's egg aboard, which the Reaper on land left in his nest: it rides in a coil of rope at the bow and
 * hatches at the first dawn after it was taken, once the figure is aboard and out at sea with nothing after the boat.
 * The hatching is a cutscene, the owner's: the camera comes in close on the little egg shaking on deck, then Crack!
 * Crack! Crrrrack!, and he is out: Congratulations! It's a baby Reaper! Then he hops over the side into the sea. The
 * game says when it may start, runs the scene's clock, and makes the baby.
 */

/** Seconds it must be due, with the figure aboard and the sea calm, before the scene starts: the dawn's news first. */
export const HATCH_WAIT = 2;
/** The scene's length, and when its bars and the camera have come in and start to go out. */
export const EGG_CINE = 9.6;
export const EGG_IN = 1.2;
export const EGG_OUT = 8.6;
/** When the egg cracks (Crack! Crack! Crrrrack!), when it pops and he is out, and when he hops into the sea. */
export const CRACKS = [1.6, 2.8, 4] as const;
export const POP_T = 5;
export const INTO_SEA = 8;
/** What each crack says, over the egg. */
export const CRACK_WORDS = ['Crack!', 'Crack!', 'Crrrrack!'] as const;

/** Whether the egg aboard is due to hatch: it is aboard (stage 2) and it is a later day than the one it came aboard. */
export function eggDue(egg: number, eggDay: number, day: number): boolean {
  return egg === 2 && day > eggDay;
}

/** How far round the crack has run at scene time t: a step at each crack, all the way round at the last. */
export function eggCrackAt(t: number): number {
  let n = 0;
  for (const c of CRACKS) if (t >= c) n++;
  return n / CRACKS.length;
}

/** The jolt of a crack at scene time t: 1 the moment it cracks, gone a third of a second after. */
export function crackJolt(t: number): number {
  let j = 0;
  for (const c of CRACKS) if (t >= c && t < c + 0.3) j = Math.max(j, 1 - (t - c) / 0.3);
  return j;
}

/**
 * How the egg sits at time T: tipped by wob radians, hopped up hop (0 to 1), swollen by swell (0 none), cracked crack
 * of the way round. Not hatching (t null), it gives a little wobble now and then; hatching, at scene time t, it shakes
 * harder and faster toward the pop, and jumps at each crack.
 */
export function eggLook(
  T: number,
  t: number | null,
): { wob: number; hop: number; swell: number; crack: number } {
  if (t === null) {
    const ph = T % 5.5;
    return {
      wob: ph < 0.6 ? Math.sin(ph * 26) * 0.18 * (1 - ph / 0.6) : 0,
      hop: 0,
      swell: 0,
      crack: 0,
    };
  }
  const k = Math.max(0, Math.min(1, t / POP_T));
  const j = crackJolt(t);
  return {
    wob: Math.sin(T * (14 + k * 18)) * (0.06 + k * 0.2 + j * 0.15),
    hop: j,
    swell: k * 0.3 + j * 0.15,
    crack: eggCrackAt(t),
  };
}
