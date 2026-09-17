/** project.md is authoritative for tuning; tests read its tables through here. */
import doc from '../../project.md?raw';

/** Rows of the markdown table whose first data row starts with `| first |`, as trimmed cells. */
export function tableRows(first: string): string[][] {
  const lines = doc.split('\n');
  const start = lines.findIndex((l) => l.startsWith(`| ${first} |`));
  if (start < 0) throw new Error(`no table row starting with "${first}"`);
  const rows: string[][] = [];
  for (let i = start; i < lines.length && lines[i]?.startsWith('|'); i++) {
    rows.push(
      (lines[i] ?? '')
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim()),
    );
  }
  return rows;
}

/** "1,200" -> 1200; a dash or blank -> NaN. */
export const num = (s: string | undefined): number => Number((s ?? '').replace(/,/g, ''));
