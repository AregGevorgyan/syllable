# Syllable Counter

A small web app: type or paste text and, in real time, see

- the **total syllable count** (plus words and lines) at the top,
- the **syllable count for each line** in a badge at the left of that line,
- every **word split into its syllables** as light-colored boxes.

No build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000. Your text is saved in the browser's local storage.

## How syllables are found

`js/syllables.js` is a rule-based English syllabifier. It doesn't use a dictionary. It:

1. finds vowel groups (treating `y`, `qu`, `gu` and similar by context),
2. splits groups that are spoken as two vowels (`li-on`, `qui-et`, `cry-ing`),
3. drops silent endings (`make`, `jumped`, `makes`) but keeps syllabic ones (`ta-ble`, `want-ed`, `box-es`),
4. places breaks between consonants using valid English onsets (`mon-ster`, `lan-guage`, `pick-le`),
5. handles common compounds and suffixes (`some-thing`, `love-ly`) and a short exception list.

English spelling is irregular, so some words will be off by one. Add them to `EXCEPTIONS` in `js/syllables.js`.

## Tests

```bash
node tests/syllables.test.js
```
