// Builds data/cmudict.txt, a compact copy of the CMU Pronouncing Dictionary.
//
//   curl -L -o cmudict.dict https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict
//   node tools/build-cmudict.js cmudict.dict
//
// Output format, one word per line:  word<space>code[|code...]
// Each phone (with stress digit) is encoded as one character (see
// js/pronouncing.js PHONE_CODES, which must match PHONES below).
const fs = require('fs');
const path = require('path');

const VOWELS = ['AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW'];
const CONSONANTS = ['B', 'CH', 'D', 'DH', 'F', 'G', 'HH', 'JH', 'K', 'L', 'M', 'N', 'NG', 'P', 'R', 'S', 'SH', 'T', 'TH', 'V', 'W', 'Y', 'Z', 'ZH'];
const PHONES = [];
for (const v of VOWELS) for (const s of ['0', '1', '2']) PHONES.push(v + s);
PHONES.push(...CONSONANTS);
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,-./:;<=>?@[]^_{}~';
if (ALPHABET.length < PHONES.length) throw new Error('alphabet too small');
const code = new Map(PHONES.map((p, i) => [p, ALPHABET[i]]));

const src = fs.readFileSync(process.argv[2] || 'cmudict.dict', 'utf8');
const entries = new Map();
for (let line of src.split('\n')) {
  line = line.replace(/#.*/, '').trim();
  if (!line) continue;
  const [rawWord, ...phones] = line.split(/\s+/);
  const word = rawWord.replace(/\(\d+\)$/, '');
  const enc = phones.map(p => {
    if (!code.has(p)) throw new Error('unknown phone ' + p + ' in ' + line);
    return code.get(p);
  }).join('');
  if (!entries.has(word)) entries.set(word, []);
  entries.get(word).push(enc);
}

const out = [...entries].map(([w, codes]) => w + ' ' + codes.join('|')).join('\n') + '\n';
const dest = path.join(__dirname, '..', 'data', 'cmudict.txt');
fs.writeFileSync(dest, out);
console.log(`${entries.size} words -> ${dest} (${out.length} bytes)`);
console.log('PHONE_CODES alphabet:', ALPHABET.slice(0, PHONES.length));
