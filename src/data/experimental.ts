/**
 * The Experimental switch, the kid's ("expiramental brings curintly worked on stuff to game test vers a option"): one
 * switch in the shop, off by default, that lets a player try what is still being built before it is done. Each piece
 * of work in progress is listed here and shows in the game only while the switch is on; when one is finished it comes
 * off this list and shows for everyone.
 *
 * One switch, not one per piece (my pick, hers to change): the kid asked for "a option", and a list of switches is a
 * settings page for a game that has none.
 */

export type Experiment = 'dimensions';

/** What is behind the switch now, in the order the shop names them. */
export const EXPERIMENTS: readonly Experiment[] = ['dimensions'];

export const EXPERIMENT_NAMES: Readonly<Record<Experiment, string>> = {
  dimensions: 'New Dimensions',
};

/** Whether a piece of work in progress shows: only while the switch is on, and only while it is still on the list. */
export function tryOn(on: boolean, k: Experiment): boolean {
  return on && EXPERIMENTS.includes(k);
}

/** The shop's line under the switch: what it lets you try. */
export function experimentsLine(): string {
  const names = EXPERIMENTS.map((k) => EXPERIMENT_NAMES[k]);
  return names.length
    ? `Try what is still being built: ${names.join(', ')}. It may change, or break.`
    : 'Nothing is being built just now.';
}
