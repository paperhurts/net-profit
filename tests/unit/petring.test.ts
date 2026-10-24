import { describe, expect, it } from 'vitest';
import { TRAINERS, type Trainer } from '../../src/data/petfight';
import { type RingState, ribbonsHtml, ringHtml, ringReady } from '../../src/ui/petring';

const t1 = TRAINERS[0] as Trainer;

function state(over: Partial<RingState> = {}): RingState {
  return {
    trainer: t1,
    won: [],
    pets: [
      { key: 'd1', name: 'Wiggles', lv: 2, fight: null },
      {
        key: 'h1',
        name: '<Hoppy>',
        lv: 1,
        fight: { build: 'speedy', special: 'spit', name: 'Spit' },
      },
    ],
    chosen: 'h1',
    build: null,
    special: null,
    ...over,
  };
}

describe('the ring card', () => {
  it('shows the ladder: the first trainer open, the rest waiting for the one before', () => {
    const html = ringHtml(state());
    expect(html).toContain('data-ftr="t1"');
    expect(html).toContain('Beat Pip first');
    expect(html).toContain('Cora, the champion');
    expect(
      (html.match(/aria-disabled="true" data-ftr|data-ftr="[^"]+" aria-disabled="true"/g) ?? [])
        .length,
    ).toBe(5);
    const after = ringHtml(state({ won: ['t1'] }));
    expect(after).toContain('Beat Moss first');
    expect(after).not.toContain('Beat Pip first');
  });

  it('shows a ribbon for each trainer beaten, and the cup for the champion', () => {
    expect(ribbonsHtml([])).toBe('');
    const some = ribbonsHtml(['t1', 't2']);
    expect((some.match(/class="ribbon"/g) ?? []).length).toBe(2);
    expect(some).toContain('2 of 6 beaten');
    const all = ribbonsHtml(TRAINERS.map((t) => t.id));
    expect((all.match(/class="ribbon"/g) ?? []).length).toBe(5);
    expect(all).toContain('class="cup"');
  });

  it("escapes a pet's name, and needs a drawn pet's build and special before it fights", () => {
    expect(ringHtml(state())).toContain('&lt;Hoppy&gt;');
    expect(ringReady(state())).toBe(true);
    expect(ringReady(state({ chosen: 'd1' }))).toBe(false);
    expect(ringReady(state({ chosen: 'd1', build: 'tough', special: 'curl' }))).toBe(true);
  });
});
