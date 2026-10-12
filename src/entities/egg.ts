/**
 * The Reaper's egg aboard, which the Reaper on land left in his nest: it rides in a coil of rope at the bow and
 * hatches at the first dawn after it was taken, once the figure is aboard to see it. A moment after that dawn it
 * starts to rock, harder and harder, a crack runs round it, and the baby Reaper is out. The game says when the
 * figure is aboard, and makes the baby.
 */

/** Seconds after it is due (and the figure aboard) before it starts to rock, so the dawn's own news goes first. */
export const HATCH_WAIT = 3.5;
/** Seconds it rocks and cracks before the baby is out. */
export const HATCH_T = 4;

/** Whether the egg aboard is due to hatch: it is aboard (stage 2) and it is a later day than the one it came aboard. */
export function eggDue(egg: number, eggDay: number, day: number): boolean {
  return egg === 2 && day > eggDay;
}

/**
 * How the egg sits at time T, hatching k of the way (0 not yet, 1 out): tipped by wob radians, hopped up hop (0 to 1),
 * cracked crack of the way round. Not hatching, it gives a little wobble now and then.
 */
export function eggRock(T: number, k: number): { wob: number; hop: number; crack: number } {
  if (k <= 0) {
    const ph = T % 5.5;
    return { wob: ph < 0.6 ? Math.sin(ph * 26) * 0.18 * (1 - ph / 0.6) : 0, hop: 0, crack: 0 };
  }
  const f = Math.min(1, k);
  return {
    wob: Math.sin(T * (16 + f * 18)) * (0.12 + f * 0.22),
    hop: f > 0.6 ? Math.abs(Math.sin(T * 17)) * ((f - 0.6) / 0.4) : 0,
    crack: Math.min(1, f * 1.4),
  };
}
