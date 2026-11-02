// Run with: node tests/pronouncing.test.js
const path = require('path');
const assert = require('assert');
const P = require('../js/pronouncing.js');
const S = require('../js/syllables.js');

P.load(path.join(__dirname, '..', 'data', 'cmudict.txt')).then(() => {
  assert.deepStrictEqual(P.phonesForWord('permit'), ['P ER0 M IH1 T', 'P ER1 M IH2 T']);
  assert.deepStrictEqual(P.phonesForWord('Beautiful'), ['B Y UW1 T AH0 F AH0 L']);
  assert.deepStrictEqual(P.phonesForWord('naïve').length > 0, true);
  assert.deepStrictEqual(P.phonesForWord('couldn’t'), P.phonesForWord("couldn't"));
  assert.deepStrictEqual(P.phonesForWord('zzxq'), []);
  assert.strictEqual(P.syllableCount('P ER0 M IH1 T'), 2);
  assert.strictEqual(P.stresses('P ER0 M IH1 T'), '01');
  assert.deepStrictEqual(P.vowels('B Y UW1 T AH0 F AH0 L'), ['UW1', 'AH0', 'AH0']);
  assert.strictEqual(P.rhymingPart('S L IY1 P IH0 NG'), 'IY1 P IH0 NG');
  assert.ok(P.rhymes('sleeping').includes('keeping'));
  assert.ok(!P.rhymes('sleeping').includes('sleeping'));
  assert.ok(P.search('^S K AE1').includes('scab'));
  assert.ok(P.searchStresses('^000100$').includes('phytogeography'));

  // syllabifyTo re-splits spelling to match a dictionary count
  assert.deepStrictEqual(S.syllabifyTo('beautiful', 3), ['beau', 'ti', 'ful']);
  assert.deepStrictEqual(S.syllabifyTo('prism', 2), ['pris', 'm']);
  assert.deepStrictEqual(S.syllabifyTo('fire', 2), ['fi', 're']);
  assert.deepStrictEqual(S.syllabifyTo('beautiful', 2).join(''), 'beautiful');
  console.log('pronouncing: all passed');
}).catch(e => { console.error(e); process.exit(1); });
