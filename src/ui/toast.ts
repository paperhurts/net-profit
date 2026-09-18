/**
 * The toast queue. The prototype had one slot, so "Hold full" could stamp on
 * "Pirates on your tail". Now a message has a priority: a more urgent one
 * interrupts, an equal or lesser one waits its turn and gives up if it waits
 * too long, and the same message is never shown twice in a row. Pure: the
 * game renders whatever `tick` returns.
 */

/** 0 is routine (hold full, denials), 1 is an event (dolphins, a new tier), 2 is danger. */
export type Priority = 0 | 1 | 2;

type Showing = { msg: string; pri: Priority; until: number };
type Waiting = { msg: string; ms: number; pri: Priority; expires: number };

/** A queued message that has not been shown within this many seconds is stale and dropped. */
export const MAX_WAIT = 4;
/** No more than this many waiting; the oldest of the least urgent goes first. */
export const MAX_QUEUE = 3;

export class ToastQueue {
  private current: Showing | null = null;
  private waiting: Waiting[] = [];

  /** Ask for a message. `now` is seconds on any monotonic clock. */
  push(msg: string, ms: number, pri: Priority, now: number): void {
    if (this.current && this.current.msg === msg && now < this.current.until) {
      this.current.until = now + ms / 1000;
      return;
    }
    if (this.waiting.some((w) => w.msg === msg)) return;
    if (!this.current || now >= this.current.until || pri > this.current.pri) {
      this.current = { msg, pri, until: now + ms / 1000 };
      return;
    }
    this.waiting.push({ msg, ms, pri, expires: now + MAX_WAIT });
    if (this.waiting.length > MAX_QUEUE) {
      const lowest = Math.min(...this.waiting.map((w) => w.pri));
      const i = this.waiting.findIndex((w) => w.pri === lowest);
      this.waiting.splice(i, 1);
    }
  }

  /** The message to show right now, or null. Call once a frame. */
  tick(now: number): string | null {
    if (this.current && now >= this.current.until) this.current = null;
    if (!this.current) {
      this.waiting = this.waiting.filter((w) => now < w.expires);
      if (this.waiting.length > 0) {
        const best = this.waiting.reduce((a, b) => (b.pri > a.pri ? b : a));
        this.waiting.splice(this.waiting.indexOf(best), 1);
        this.current = { msg: best.msg, pri: best.pri, until: now + best.ms / 1000 };
      }
    }
    return this.current ? this.current.msg : null;
  }

  /** Drop everything, as when the shop opens over the toast's spot. */
  clear(): void {
    this.current = null;
    this.waiting = [];
  }
}
