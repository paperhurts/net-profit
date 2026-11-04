/**
 * Sir Bucksworth XIV, the goat king of Goat Isle (part three of the owner's plan): his jokes, and the plaques on the
 * portraits in his Hall of Portraits. The owner saw all of these before they shipped (2026-11-04, "Omg I love the
 * portrait gallery", and asked for more: the court's six portraits are hers). Change a line here and it changes in
 * the game; the order of the jokes is shuffled once, the same for everyone.
 *
 * He greets you with his first line each visit; ask and he tells the rest in turn, never repeating one until he has
 * told them all, then says so and starts again. A joke marked faint has him faint on his throne after it.
 */

export type Joke = { text: string; faint?: boolean };

/** What he says when you come into his throne room. */
export const GREETING =
  "Welcome, welcome! You've got to be kidding me, a visitor! Do come in, the cheese is GOAT-ed.";

export const JOKES: readonly Joke[] = [
  { text: 'Why did the goat cross the sea? To get to the udder side!' },
  { text: "I'd tell you a milk joke, but it's past its sell-by date. That's the whey it goes." },
  { text: "We are not amused. We are a-moos-ed. No, wait, that's the cows. We're a-BAAAH-sed." },
  { text: "What do you call a goat on a roof? The ceiling's biggest fan." },
  { text: 'Feta late than never, I always say. Then I faint.', faint: true },
  { text: 'Why did the goat stand on the roof? He heard the drinks were on the house.' },
  { text: 'What does a goat king wear to bed? His royal PJ-baaas.' },
  { text: 'Where do goats go on holiday? The Baa-hamas.' },
  { text: 'What kind of music do goats like? Anything with a good baaa-ss line.' },
  { text: "Knock knock. Who's there? Goat. Goat who? Goat to the door and find out!" },
  { text: 'What did the baby goat say to its mum? "I\'m only kidding!"' },
  { text: 'Why was the goat so good at maths? He could always bleat the odds.' },
  { text: "What do you call cheese that isn't yours? Nacho cheese!" },
  { text: "My castle is made of cheese. Everyone says it's very grate." },
  { text: 'I asked the cheese for a joke. It said it was far too mature for that.' },
  { text: "What's a goat's favourite cheese? Yours. (He looks at your sandwich.)" },
  {
    text: 'People say goats will eat anything. Nonsense! I have never once eaten a tin can. A deckchair, yes. Twice.',
  },
  {
    text: 'My great-grandfather fainted at his own crowning. We call him Bucksworth the Horizontal.',
  },
  {
    text: 'Royal decree: anyone who startles a goat must help it back up. ... Only joking. They always get up by themselves. Show-offs.',
  },
  {
    text: "The fourteenth Bucksworth! Fourteen! That's more than ten, you know. I counted. On my hooves. Twice.",
  },
  { text: "Why don't goats ever get lost? They always know the baaa-sics of where they're going." },
  {
    text: "What do you call a goat who's a wizard? A baaa-bracadabra. (He waves a hoof. Nothing happens.)",
  },
  {
    text: "I wanted to tell you a joke about the moon, but it was too cheesy. Ha! Cheese! I'm the king of cheese! Ha!",
  },
];

/** What he says when he has told them all, before he starts again. */
export const OUT_OF_JOKES = "That's every joke I know. Shall I start again? I shall start again.";

/** A shuffle of the jokes, the same for everyone: the order he tells them in. */
export const JOKE_ORDER: readonly number[] = (() => {
  const order = JOKES.map((_, i) => i);
  let s = 14;
  for (let i = order.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j] as number, order[i] as number];
  }
  return order;
})();

/**
 * The next thing he says, asked for a joke, and how many he has told after it. told counts round the book: once it
 * reaches the end he says he is out and goes back to the start.
 */
export function nextJoke(told: number): { joke: Joke | null; line: string; told: number } {
  const t = Math.max(0, Math.floor(told) || 0);
  if (t >= JOKES.length) return { joke: null, line: OUT_OF_JOKES, told: 0 };
  const joke = JOKES[JOKE_ORDER[t] ?? 0] as Joke;
  return { joke, line: joke.text, told: t + 1 };
}

/** A portrait in the hall: who is in it, and its plaque. */
export type Portrait = { who: string; plaque: string; crown: boolean };

/** The thirteen Bucksworths before him, oldest first, and then the court. */
export const PORTRAITS: readonly Portrait[] = [
  {
    who: 'I',
    plaque: 'Sir Bucksworth the First, Who Started It All (and Then Fainted)',
    crown: true,
  },
  { who: 'II', plaque: 'Bucksworth the Brie-ve', crown: true },
  { who: 'III', plaque: 'Bucksworth Who Ate the Original Crown', crown: false },
  { who: 'IV', plaque: 'Bucksworth the Gouda-Looking', crown: true },
  { who: 'V', plaque: 'Bucksworth the Udderly Magnificent', crown: true },
  { who: 'VI', plaque: 'Bucksworth the Baa-rbarian', crown: true },
  {
    who: 'VII',
    plaque: 'Bucksworth Who Climbed Every Roof (and the Lighthouse, Once)',
    crown: true,
  },
  { who: 'VIII', plaque: 'Bucksworth the Whey-ward', crown: true },
  { who: 'IX', plaque: 'Bucksworth, Feta Than Most', crown: true },
  { who: 'X', plaque: 'Bucksworth the Kid, Crowned Aged Two Days', crown: true },
  { who: 'XI', plaque: 'Bucksworth the Horizontal, Who Fainted at His Own Crowning', crown: true },
  { who: 'XII', plaque: 'Bucksworth the Grate', crown: true },
  {
    who: 'XIII',
    plaque: 'Bucksworth the Thirteenth, Unlucky for Some, Lucky for Cheese',
    crown: true,
  },
  {
    who: 'Queen',
    plaque: 'Lady Nannette the Magnifi-scent, Who Smelled Like a Goat and Was Proud of It',
    crown: true,
  },
  {
    who: 'Jester',
    plaque: 'Sir Chuckles, Royal Jester, Who Laughed So Hard He Fainted (Daily)',
    crown: false,
  },
  {
    who: 'Taster',
    plaque: 'Old Munch, Royal Cheese Taster, Retired After Tasting the Throne',
    crown: false,
  },
  {
    who: 'Knight',
    plaque: 'Sir Ramsalot, Who Charged Every Door, Including the Open Ones',
    crown: false,
  },
  {
    who: 'Wizard',
    plaque: 'Merlin the Baa-rbaric, Who Turned Himself Into a Goat (He Already Was One)',
    crown: false,
  },
  {
    who: 'Dog',
    plaque: 'Biscuit, Royal Dog, Who Thought He Was a Goat. Nobody Told Him.',
    crown: false,
  },
];
