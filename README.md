# Syllable Counter

A small web app: type or paste text and, in real time, see

- the **total syllable count** (plus words and lines) at the top,
- the **syllable count for each line** in a badge at the left of that line,
- every **word split into its syllables** as light-colored boxes,
- each syllable **colored by its vowel sound** (all the "ee" sounds share a color, all the "ay" sounds another, and so on), so rhyme and assonance stand out. Unstressed syllables are paler, and the schwa is grey. A legend lists the sounds in your text. Switch to **Plain** for alternating colors.

Live at https://areggevorgyan.github.io/syllable/

No build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000. Your text is saved in the browser's local storage.

## Pronunciations

`js/pronouncing.js` is a client-side port of [pronouncingpy](https://github.com/aparrish/pronouncingpy). It runs on the [CMU Pronouncing Dictionary](https://github.com/cmusphinx/cmudict), stored compactly in `data/cmudict.txt` (license in `data/LICENSE-cmudict.txt`):

```js
await Pronouncing.load('data/cmudict.txt');
Pronouncing.phonesForWord('permit');        // ['P ER0 M IH1 T', 'P ER1 M IH2 T']
Pronouncing.syllableCount('P ER0 M IH1 T'); // 2
Pronouncing.stresses('P ER0 M IH1 T');      // '01'
Pronouncing.rhymingPart('S L IY1 P IH0 NG'); // 'IY1 P IH0 NG'
Pronouncing.rhymes('sleeping');             // ['beeping', 'creeping', ...]
Pronouncing.search('^S K AE1');             // words whose phones match
Pronouncing.searchStresses('^000100$');     // words with that stress pattern
```

Words in the dictionary use its syllable count and vowel sounds. The spelling is re-split to match if needed. Words not in the dictionary fall back to the rules below and get an outlined box.

To rebuild the data file:

```bash
curl -L -o cmudict.dict https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict
node tools/build-cmudict.js cmudict.dict
```

## How syllables are split

`js/syllables.js` is a rule-based English syllabifier. It places the box boundaries and counts words that aren't in the dictionary. It:

1. finds vowel groups (treating `y`, `qu`, `gu` and similar by context),
2. splits groups that are spoken as two vowels (`li-on`, `qui-et`, `cry-ing`),
3. drops silent endings (`make`, `jumped`, `makes`) but keeps syllabic ones (`ta-ble`, `want-ed`, `box-es`),
4. places breaks between consonants using valid English onsets (`mon-ster`, `lan-guage`, `pick-le`),
5. handles common compounds and suffixes (`some-thing`, `love-ly`) and a short exception list.

English spelling is irregular, so some words will be off by one. Add them to `EXCEPTIONS` in `js/syllables.js`.

## Tests

```bash
node tests/syllables.test.js
node tests/pronouncing.test.js
```
