/*
 * Pronouncing — a client-side port of pronouncingpy
 * (https://github.com/aparrish/pronouncingpy) on top of the CMU
 * Pronouncing Dictionary.
 *
 *   await Pronouncing.load('data/cmudict.txt');
 *   Pronouncing.phonesForWord('permit')  -> ['P ER0 M IH1 T', 'P ER1 M IH2 T']
 *   Pronouncing.syllableCount('P ER0 M IH1 T') -> 2
 *   Pronouncing.stresses('P ER0 M IH1 T')      -> '01'
 *   Pronouncing.rhymingPart('S L IY1 P IH0 NG') -> 'IY1 P IH0 NG'
 *   Pronouncing.rhymes('sleeping')             -> ['beeping', 'creeping', ...]
 *   Pronouncing.search('^S K AE1')             -> words whose phones match
 *   Pronouncing.searchStresses('^000100$')     -> words with that stress pattern
 *
 * The dictionary file is produced by tools/build-cmudict.js. Each phone is
 * stored as a single character; PHONES and ALPHABET below must match it.
 *
 * Works in the browser (window.Pronouncing) and in Node (module.exports).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Pronouncing = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VOWELS = ['AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW'];
  const CONSONANTS = ['B', 'CH', 'D', 'DH', 'F', 'G', 'HH', 'JH', 'K', 'L', 'M', 'N', 'NG', 'P', 'R', 'S', 'SH', 'T', 'TH', 'V', 'W', 'Y', 'Z', 'ZH'];
  const PHONES = [];
  VOWELS.forEach(function (v) { PHONES.push(v + '0', v + '1', v + '2'); });
  PHONES.push.apply(PHONES, CONSONANTS);
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,-./:;<=>?@[]^_{}~';
  const DECODE = {};
  PHONES.forEach(function (p, i) { DECODE[ALPHABET[i]] = p; });

  let dict = null;         // Map word -> encoded string ("code|code")
  let rhymeIndex = null;   // Map rhymingPart -> [words], built on first use
  let loading = null;

  function parse(text) {
    const map = new Map();
    let start = 0;
    const n = text.length;
    while (start < n) {
      let end = text.indexOf('\n', start);
      if (end === -1) end = n;
      const sp = text.indexOf(' ', start);
      if (sp > start && sp < end) map.set(text.slice(start, sp), text.slice(sp + 1, end));
      start = end + 1;
    }
    return map;
  }

  /** Load the dictionary. In the browser pass a URL; in Node, a file path. */
  function load(source) {
    if (dict) return Promise.resolve();
    if (loading) return loading;
    source = source || 'data/cmudict.txt';
    const inNode = typeof window === 'undefined' && typeof require === 'function';
    const p = inNode
      ? Promise.resolve(require('fs').readFileSync(source, 'utf8'))
      : fetch(source).then(function (r) {
          if (!r.ok) throw new Error('Could not load ' + source + ' (' + r.status + ')');
          return r.text();
        });
    loading = p.then(function (text) { dict = parse(text); });
    return loading;
  }

  function isLoaded() { return dict !== null; }

  function decode(code) {
    const out = [];
    for (let i = 0; i < code.length; i++) out.push(DECODE[code[i]]);
    return out.join(' ');
  }

  function normalize(word) {
    return word.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/’/g, "'").toLowerCase();
  }

  /** All pronunciations for a word, as space-separated phone strings. */
  function phonesForWord(word) {
    if (!dict) return [];
    const w = normalize(word);
    const hit = dict.get(w);
    if (hit) return hit.split('|').map(decode);
    // Fall back for possessives and plurals the dictionary doesn't list.
    const m = /^(.+?)(?:'s|s')$/.exec(w);
    if (m && dict.has(m[1])) return dict.get(m[1]).split('|').map(function (c) { return decode(c) + ' Z'; });
    return [];
  }

  function phoneList(phones) {
    return Array.isArray(phones) ? phones : phones.trim().split(/\s+/);
  }

  /** Stress digits for each vowel: "1" primary, "2" secondary, "0" none. */
  function stresses(phones) {
    return phoneList(phones).map(function (p) { return p.replace(/\D/g, ''); }).join('');
  }

  function syllableCount(phones) {
    return stresses(phones).length;
  }

  /** The vowels (with stress) in order, e.g. ['UW1', 'AH0', 'AH0']. */
  function vowels(phones) {
    return phoneList(phones).filter(function (p) { return /\d$/.test(p); });
  }

  /** Phones from the last primary-or-secondary stressed vowel to the end. */
  function rhymingPart(phones) {
    const list = phoneList(phones);
    for (let i = list.length - 1; i >= 0; i--) {
      if (/[12]$/.test(list[i])) return list.slice(i).join(' ');
    }
    return list.join(' ');
  }

  function allEntries(fn) {
    if (!dict) return;
    dict.forEach(function (codes, word) {
      codes.split('|').forEach(function (c) { fn(word, decode(c)); });
    });
  }

  /** Words that rhyme with `word` (any of its pronunciations). */
  function rhymes(word) {
    if (!dict) return [];
    if (!rhymeIndex) {
      rhymeIndex = new Map();
      allEntries(function (w, phones) {
        const part = rhymingPart(phones);
        if (!rhymeIndex.has(part)) rhymeIndex.set(part, []);
        const list = rhymeIndex.get(part);
        if (list[list.length - 1] !== w) list.push(w);
      });
    }
    const w = normalize(word);
    const out = new Set();
    phonesForWord(w).forEach(function (phones) {
      (rhymeIndex.get(rhymingPart(phones)) || []).forEach(function (r) { if (r !== w) out.add(r); });
    });
    return Array.from(out);
  }

  /** Words whose phone string matches a regular expression. */
  function search(pattern) {
    const re = pattern instanceof RegExp ? pattern : new RegExp('\\b' + pattern + '\\b');
    const out = [];
    allEntries(function (w, phones) { if (re.test(phones) && out[out.length - 1] !== w) out.push(w); });
    return out;
  }

  /** Words whose stress pattern matches a regular expression. */
  function searchStresses(pattern) {
    const re = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    const out = [];
    allEntries(function (w, phones) { if (re.test(stresses(phones)) && out[out.length - 1] !== w) out.push(w); });
    return out;
  }

  return {
    load: load,
    isLoaded: isLoaded,
    phonesForWord: phonesForWord,
    stresses: stresses,
    syllableCount: syllableCount,
    vowels: vowels,
    rhymingPart: rhymingPart,
    rhymes: rhymes,
    search: search,
    searchStresses: searchStresses
  };
});
