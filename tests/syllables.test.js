// Run with: node tests/syllables.test.js
const { syllabify, count, tokenize } = require('../js/syllables.js');

// word -> expected syllable count
const COUNTS = {
  a: 1, I: 1, the: 1, cat: 1, dog: 1, yes: 1, play: 1, eye: 1, boy: 1,
  happy: 2, water: 2, table: 2, little: 2, apple: 2, pickle: 2, able: 2,
  beautiful: 3, family: 3, banana: 3, computer: 3, elephant: 3, syllable: 3,
  make: 1, makes: 1, made: 1, time: 1, there: 1, where: 1, were: 1, come: 1,
  some: 1, one: 1, fire: 1, style: 1, clothes: 1, judges: 2, places: 2,
  boxes: 2, wishes: 2, changes: 2, tables: 2, wanted: 2, needed: 2,
  jumped: 1, played: 1, loved: 1, handled: 2, lovely: 2, completely: 3,
  statement: 2, careful: 2, timeless: 2, something: 2, sometimes: 2,
  someone: 2, household: 2, therefore: 2, fireplace: 2, being: 2, going: 2,
  doing: 2, seeing: 2, crying: 2, flying: 2, saying: 2, player: 2,
  canyon: 2, beyond: 2, nation: 2, action: 2, question: 2, vision: 2,
  lion: 2, radio: 3, piano: 3, idea: 3, area: 3, video: 3, usual: 3,
  usually: 4, actual: 3, quiet: 2, diet: 2, society: 4, client: 2,
  patient: 2, curious: 3, delicious: 3, million: 2, medium: 3, fuel: 2,
  blue: 1, true: 1, queue: 1, guess: 1, language: 2, league: 1,
  ambiguous: 4, poem: 2, poet: 2, shoe: 1, does: 1, goes: 1, people: 2,
  couldn: 1, "couldn't": 2, "didn't": 2, "don't": 1, "can't": 1,
  "they're": 1, "I'm": 1, singer: 2, singing: 2, danger: 2, finger: 2,
  english: 2, monster: 2, children: 2, hundred: 2, address: 2, sister: 2,
  extra: 2, pocket: 2, kitchen: 2, equal: 2, flower: 2, power: 2,
  happier: 3, easiest: 3, carried: 2, moreover: 3, everyone: 3,
  wherever: 3, orange: 2, chocolate: 3, hello: 2, world: 1, rhythm: 2,
  café: 2, naïve: 2, morning: 2, river: 2, along: 2, meter: 2, song: 1,
  syllables: 3, light: 1, spills: 1, hills: 1, every: 2, beat: 1,
};

// word -> expected split
const SPLITS = {
  beautiful: 'beau-ti-ful', table: 'ta-ble', little: 'lit-tle',
  pickle: 'pick-le', happy: 'hap-py', nation: 'na-tion', monster: 'mon-ster',
  language: 'lan-guage', something: 'some-thing', lovely: 'love-ly',
  "couldn't": "could-n't", Beautiful: 'Beau-ti-ful', crying: 'cry-ing',
  singer: 'sing-er', danger: 'dan-ger', mother: 'mo-ther', boxes: 'box-es',
};

let failed = 0, total = 0;
for (const [w, n] of Object.entries(COUNTS)) {
  total++;
  const got = count(w);
  if (got !== n) { failed++; console.log(`count  ${w}: expected ${n}, got ${got} (${syllabify(w).join('-')})`); }
}
for (const [w, s] of Object.entries(SPLITS)) {
  total++;
  const got = syllabify(w).join('-');
  if (got !== s) { failed++; console.log(`split  ${w}: expected ${s}, got ${got}`); }
}

// Splits must always rejoin to the original word.
for (const w of Object.keys(COUNTS)) {
  total++;
  if (syllabify(w).join('') !== w) { failed++; console.log(`rejoin ${w}: ${syllabify(w)}`); }
}

// tokenize keeps all text
total++;
const line = "Hello, world — it's a well-known tune!";
if (tokenize(line).map(t => t.text).join('') !== line) { failed++; console.log('tokenize lost text'); }

console.log(`${total - failed}/${total} passed`);
process.exit(failed ? 1 : 0);
