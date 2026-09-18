import { describe, expect, it } from 'vitest';
import { MAX_QUEUE, MAX_WAIT, ToastQueue } from '../../src/ui/toast';

describe('ToastQueue', () => {
  it('shows a message at once and hides it when its time is up', () => {
    const q = new ToastQueue();
    q.push('Hold full. Head for the dock.', 2600, 0, 10);
    expect(q.tick(10)).toBe('Hold full. Head for the dock.');
    expect(q.tick(12.5)).toBe('Hold full. Head for the dock.');
    expect(q.tick(12.7)).toBeNull();
  });

  it('lets danger interrupt routine, and routine wait for danger', () => {
    const q = new ToastQueue();
    q.push('Hold full. Head for the dock.', 2600, 0, 10);
    q.push('Pirates on your tail. Run for the dock.', 2600, 2, 10.5);
    expect(q.tick(10.6)).toBe('Pirates on your tail. Run for the dock.');
    q.push('Dawn. Something is sparkling out on the water.', 3200, 0, 11);
    expect(q.tick(11.1)).toBe('Pirates on your tail. Run for the dock.');
    expect(q.tick(13.2)).toBe('Dawn. Something is sparkling out on the water.');
  });

  it('plays the most urgent waiting message first', () => {
    const q = new ToastQueue();
    q.push('a', 1000, 2, 0);
    q.push('routine', 1000, 0, 0.1);
    q.push('event', 1000, 1, 0.2);
    expect(q.tick(1.1)).toBe('event');
    expect(q.tick(2.2)).toBe('routine');
  });

  it('drops a waiting message that has gone stale', () => {
    const q = new ToastQueue();
    q.push('long', 10_000, 1, 0);
    q.push('hold full', 1000, 0, 1);
    expect(q.tick(1 + MAX_WAIT + 9.5)).toBeNull();
  });

  it('never shows the same message twice in a row, and refreshes it if it is up', () => {
    const q = new ToastQueue();
    q.push('same', 1000, 0, 0);
    q.push('same', 1000, 0, 0.5);
    expect(q.tick(1.2)).toBe('same');
    expect(q.tick(1.6)).toBeNull();
    q.push('x', 3000, 1, 2);
    q.push('y', 1000, 0, 2);
    q.push('y', 1000, 0, 2.1);
    expect(q.tick(5.1)).toBe('y');
    expect(q.tick(6.2)).toBeNull();
  });

  it('caps the queue, shedding the least urgent first', () => {
    const q = new ToastQueue();
    q.push('showing', 10_000, 2, 0);
    for (let i = 0; i < MAX_QUEUE + 2; i++) q.push(`wait${i}`, 100, i === 2 ? 1 : 0, 0.1);
    q.clear();
    expect(q.tick(1)).toBeNull();
  });

  it('clears everything when asked', () => {
    const q = new ToastQueue();
    q.push('a', 1000, 2, 0);
    q.push('b', 1000, 1, 0);
    q.clear();
    expect(q.tick(0.1)).toBeNull();
  });
});
