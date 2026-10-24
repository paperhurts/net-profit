import { describe, expect, it } from 'vitest';
import main from '../../src/main.js?raw';

/**
 * src/main.js is the prototype's script, still one big function inside its imports. A name it declares at the top of
 * that function silently wins over an import of the same name: tsc does not check main.js and the build does not
 * mind, so the import is just never used. Twice in one day (2026-10-18) a new import met an old name that way
 * (`drawTower`, `TOWER_AT`) and the bigger tower drew nothing. This keeps the two apart.
 */

/** Every name main.js imports, under the name it is used by. */
function imported(src: string): Set<string> {
  const out = new Set<string>();
  for (const m of src.matchAll(/^import\s*\{([^}]*)\}\s*from/gm))
    for (const part of (m[1] ?? '').split(',')) {
      const name = part.replace(/^\s*type\s+/, '').trim();
      if (name) out.add(name.includes(' as ') ? (name.split(' as ')[1] ?? '').trim() : name);
    }
  for (const m of src.matchAll(/^import\s+([\w$]+)\s*(?:,|from)/gm)) if (m[1]) out.add(m[1]);
  return out;
}

/** Every name declared at the top of the big function (at the start of a line), with the line it is on. */
function declared(src: string): [string, number][] {
  const out: [string, number][] = [];
  src.split('\n').forEach((line, i) => {
    const names: string[] = [];
    const fn = /^(?:async\s+)?function\*?\s+([\w$]+)/.exec(line) ?? /^class\s+([\w$]+)/.exec(line);
    if (fn?.[1]) names.push(fn[1]);
    const decl = /^(?:const|let|var)\s+(.*)/.exec(line)?.[1];
    if (decl) {
      const first = /^([\w$]+)\s*=/.exec(decl)?.[1];
      if (first) names.push(first);
      const destructured = /^[{[]([^=]*)[}\]]\s*=/.exec(decl)?.[1];
      if (destructured) names.push(...(destructured.match(/[\w$]+/g) ?? []));
      for (const m of decl.matchAll(/,\s*([\w$]+)\s*=(?![=>])/g)) if (m[1]) names.push(m[1]);
    }
    for (const n of names) out.push([n, i + 1]);
  });
  return out;
}

/**
 * Names declared twice at the top of the big function. It is one function, not a module, so a second function of the
 * same name is no error: the later one silently wins. The drawing pad's `padAt` (2026-10-24) replaced the Treehouse
 * Climb's arrows' own, and the arrows stopped walking the climber.
 */
function twice(src: string): string[] {
  const first = new Map<string, number>();
  const out: string[] = [];
  for (const [n, line] of declared(src)) {
    const was = first.get(n);
    if (was === undefined) first.set(n, line);
    else out.push(`${n} (lines ${was} and ${line})`);
  }
  return out;
}

function clashes(src: string): string[] {
  const names = imported(src);
  return declared(src)
    .filter(([n]) => names.has(n))
    .map(([n, line]) => `${n} (line ${line})`);
}

describe('the game script, src/main.js', () => {
  it('never declares a name it also imports, which would silently hide the import', () => {
    expect(imported(main).size).toBeGreaterThan(100);
    expect(clashes(main)).toEqual([]);
  });

  it('never declares the same name twice, which would silently replace the first', () => {
    expect(twice(main)).toEqual([]);
    expect(twice('function a(){}\nconst b = 1;\nfunction a(e){}')).toEqual(['a (lines 1 and 3)']);
    expect(twice('function a(){\n  const b = 1;\n}\nfunction c(){\n  const b = 2;\n}')).toEqual([]);
  });

  it('would catch one: a function, a const among others, or one renamed on import', () => {
    expect(clashes("import { a } from 'x';\n(() => {\nfunction a(){}\n})();")).toEqual([
      'a (line 3)',
    ]);
    expect(clashes("import { b, c } from 'x';\nconst q = 1, c = 2;")).toEqual(['c (line 2)']);
    expect(clashes("import { d as e } from 'x';\nlet e = 0;")).toEqual(['e (line 2)']);
    // Inside a function, indented, a local of the same name is that function's own business.
    expect(clashes("import { f } from 'x';\nfunction g(){\n  const f = 1;\n}")).toEqual([]);
  });
});
