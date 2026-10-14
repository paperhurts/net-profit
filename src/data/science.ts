/**
 * The crows' science problems, the kid's: "each asks a science problem, at a third grader's level, and solved, you can
 * pet it". Third-grade science: magnets and forces, life cycles, what animals and plants need and how they fit where
 * they live, weather, fossils, and a few about the sea and the sky. Each has its right answer, two wrong ones (the
 * three are shuffled when asked) and a short fact the crow tells after, right or wrong, so every question teaches
 * something. Plain words, short enough to read aloud. Add more here; nothing else needs to change.
 */

export type Question = {
  q: string;
  right: string;
  wrong: readonly [string, string];
  fact: string;
};

export const SCIENCE: readonly Question[] = [
  {
    q: 'A magnet will stick to which one?',
    right: 'A paper clip',
    wrong: ['A wooden spoon', 'A rubber duck'],
    fact: 'Magnets pull on things made of iron and steel, like paper clips.',
  },
  {
    q: 'You push the north ends of two magnets together. What happens?',
    right: 'They push apart',
    wrong: ['They stick together', 'They turn into one magnet'],
    fact: 'Two north ends push each other away. A north end and a south end pull together.',
  },
  {
    q: 'Which way does a compass needle point?',
    right: 'North',
    wrong: ['Straight up', 'At the moon'],
    fact: 'A compass needle is a little magnet, and it turns to point north. Sailors use one to find their way.',
  },
  {
    q: 'What makes a ball start rolling?',
    right: 'A push or a pull',
    wrong: ['Its color', 'Thinking about it'],
    fact: 'A push or a pull is called a force. Forces make things start, stop and change direction.',
  },
  {
    q: 'You drop your spoon. What pulls it down to the floor?',
    right: 'Gravity',
    wrong: ['The wind', 'A magnet'],
    fact: 'Gravity pulls everything down toward the ground, even you!',
  },
  {
    q: 'A frog starts its life as...',
    right: 'An egg',
    wrong: ['A bird', 'A snake'],
    fact: 'A frog goes egg, then tadpole, then froglet, then frog.',
  },
  {
    q: 'What does a caterpillar turn into?',
    right: 'A butterfly',
    wrong: ['A spider', 'A worm'],
    fact: 'Inside its chrysalis, a caterpillar changes into a butterfly.',
  },
  {
    q: 'A baby animal usually looks a lot like...',
    right: 'Its parents',
    wrong: ['A cloud', 'A rock'],
    fact: 'Living things get traits, like fur color or the shape of their ears, from their parents.',
  },
  {
    q: 'Which one is a mammal?',
    right: 'A whale',
    wrong: ['A shark', 'A tuna'],
    fact: 'Whales breathe air and feed their babies milk, like all mammals do.',
  },
  {
    q: 'How does a fish breathe underwater?',
    right: 'With its gills',
    wrong: ['With its tail', 'It holds its breath'],
    fact: 'Gills take oxygen out of the water, so a fish can breathe without coming up for air.',
  },
  {
    q: 'How many legs does an insect have?',
    right: 'Six',
    wrong: ['Eight', 'Four'],
    fact: 'Insects have six legs. Spiders have eight, so a spider is not an insect!',
  },
  {
    q: 'Which animal eats only plants?',
    right: 'A deer',
    wrong: ['A shark', 'A lion'],
    fact: 'An animal that eats only plants is called an herbivore.',
  },
  {
    q: 'Which one is a living thing?',
    right: 'A tree',
    wrong: ['A rock', 'A cloud'],
    fact: 'Living things grow, need food and water, and make more of their kind.',
  },
  {
    q: 'What do green plants need to make their food?',
    right: 'Sunlight',
    wrong: ['Moonlight', 'Sand'],
    fact: 'Plants use sunlight, air and water to make their own food in their leaves.',
  },
  {
    q: 'Why does a cactus have a thick, fat stem?',
    right: 'To store water',
    wrong: ['To look tall', 'To catch fish'],
    fact: 'Deserts get very little rain, so a cactus saves water in its stem for later.',
  },
  {
    q: "A polar bear's thick white fur helps it...",
    right: 'Stay warm and hide in snow',
    wrong: ['Swim faster than a fish', 'Fly'],
    fact: 'Thick fur keeps the cold out, and white fur is hard to see in the snow.',
  },
  {
    q: 'Why do some birds fly south when winter comes?',
    right: 'To find food and warm weather',
    wrong: ['To go to school', 'Because they got lost'],
    fact: 'Flying a long way each year to find food and warmth is called migration.',
  },
  {
    q: 'A pelican catches fish with...',
    right: 'The big pouch on its bill',
    wrong: ['Its feet', 'Its tail'],
    fact: 'A pelican scoops up fish and water in its pouch, then lets the water drain out.',
  },
  {
    q: 'Crows are very smart birds. What can some crows do?',
    right: 'Use sticks as tools',
    wrong: ['Read books', 'Drive boats'],
    fact: 'Some crows bend twigs into little hooks to fish bugs out of holes!',
  },
  {
    q: 'Where does a sea turtle lay its eggs?',
    right: 'On a sandy beach',
    wrong: ['Up a tree', 'Inside a shell on the sea floor'],
    fact: 'A mother sea turtle crawls up the beach at night and buries her eggs in the sand.',
  },
  {
    q: 'What is a fossil?',
    right: 'A sign of life from long, long ago',
    wrong: ['A shiny new rock', 'A kind of cloud'],
    fact: 'Fossils are bones, shells or footprints left in rock by living things from long ago.',
  },
  {
    q: 'Water that gets very cold turns into...',
    right: 'Ice',
    wrong: ['Steam', 'Sand'],
    fact: 'Water freezes into ice at 32 degrees Fahrenheit, which is 0 degrees Celsius.',
  },
  {
    q: 'What happens to a puddle on a hot, sunny day?',
    right: 'It dries up',
    wrong: ['It freezes', 'It gets bigger'],
    fact: 'The sun warms the water and it turns into a gas in the air. That is called evaporation.',
  },
  {
    q: 'Which tool tells you how hot or cold it is?',
    right: 'A thermometer',
    wrong: ['A ruler', 'A clock'],
    fact: 'A thermometer measures temperature, how hot or cold something is.',
  },
  {
    q: 'Where does rain come from?',
    right: 'Clouds',
    wrong: ['The ground', 'The moon'],
    fact: 'Clouds are made of tiny drops of water. When the drops get big and heavy, they fall as rain.',
  },
  {
    q: 'The sun is a...',
    right: 'Star',
    wrong: ['Planet', 'Moon'],
    fact: 'The sun is a star, the closest one to Earth. The other stars are much, much farther away.',
  },
  {
    q: 'Which season comes after winter?',
    right: 'Spring',
    wrong: ['Fall', 'Summer'],
    fact: 'The seasons go winter, spring, summer, fall, and around again.',
  },
];

/** A question's three answers in a shuffled order, from a number 0 to 1 for each pick. */
export function answers(q: Question, r: () => number): string[] {
  const out = [q.right, ...q.wrong];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j] as string, out[i] as string];
  }
  return out;
}
