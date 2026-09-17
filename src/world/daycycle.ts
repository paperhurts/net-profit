/**
 * The day cycle, moved verbatim from the prototype script. The clock runs
 * 0..1 over DAY_LEN seconds: dawn for 12% of it, day 43%, dusk 12%, night 33%.
 */
import { smoothstep } from '../core/math';

export type Phase = 'Dawn' | 'Day' | 'Dusk' | 'Night';

export const DAWN_END = 0.12;
export const DAY_END = 0.55;
export const DUSK_END = 0.67;
/** Written as a literal, not DUSK_END - DAY_END, so the maths matches legacy bit for bit. */
const DUSK_LEN = 0.12;

/** HUD swatch per phase. */
export const PHASE_COLOR: Record<Phase, string> = {
  Dawn: '#FFB36B',
  Day: '#FFD24A',
  Dusk: '#E58CFF',
  Night: '#AFC0FF',
};

export type DayState = {
  phase: Phase;
  /** 0 in daylight, 1 at night; the night mask's strength. */
  dark: number;
  /** 0..1, peaking mid dawn and mid dusk; the warm tint's strength. */
  warm: number;
};

/** Phase, darkness and warmth for a clock value in 0..1. */
export function dayState(clock: number): DayState {
  if (clock < DAWN_END) {
    const k = clock / DAWN_END;
    return { phase: 'Dawn', dark: 1 - smoothstep(k), warm: Math.sin(Math.PI * k) };
  }
  if (clock < DAY_END) return { phase: 'Day', dark: 0, warm: 0 };
  if (clock < DUSK_END) {
    const k = (clock - DAY_END) / DUSK_LEN;
    return { phase: 'Dusk', dark: smoothstep(k), warm: Math.sin(Math.PI * k) };
  }
  return { phase: 'Night', dark: 1, warm: 0 };
}

/** The clock after dt seconds, wrapping at the end of the day. */
export function advanceClock(clock: number, dt: number, dayLength: number): number {
  return (clock + dt / dayLength) % 1;
}
