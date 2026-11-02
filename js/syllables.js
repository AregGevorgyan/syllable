/*
 * Syllables — a dependency-free, heuristic English syllabifier.
 *
 * syllabify("beautiful") -> ["beau", "ti", "ful"]
 * count("beautiful")     -> 3
 *
 * English spelling is irregular, so this is rule-based with a small
 * exception list. It aims to get the *count* right for everyday words and
 * to place the breaks somewhere sensible for display.
 *
 * Works in the browser (window.Syllables) and in Node (module.exports).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Syllables = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'æ', 'ø', 'œ']);

  // Words the rules get wrong. Parts must spell the word exactly.
  const EXCEPTIONS = {};
  [
    'peo-ple', 'may-be', 'cre-ate', 'cre-at-ed', 'cre-at-ing', 'cre-a-tion',
    'cre-a-tive', 'crea-ture', 'sci-ence', 'sci-en-tist', 'sci-en-tif-ic',
    're-act', 're-ac-tion', 're-al-i-ty', 're-al-ize', 're-al-ized',
    're-al-is-tic', 'na-ive', 'rec-i-pe', 'ca-fe', 'ka-ra-te',
    'a-pos-tro-phe', 'ca-tas-tro-phe', 'ar-gue', 'ar-gued', 'ar-gu-ing',
    'tues-day', 'wednes-day', 'busi-ness', 'ev-ery', 'ev-ery-thing',
    'ev-ery-one', 'ev-ery-bod-y', 'ev-ery-where', 'eve-ning', 'an-y-one',
    'choc-o-late', 'rhy-thm', 'in-ter-est-ing', 'co-op-er-ate', 'co-or-di-nate',
    'the-a-ter', 'the-a-tre', 'li-ar', 'di-a-lect', 'ri-ot', 'vi-o-let',
    'shoe-lace', 'wom-an', 'wom-en', 'some-one', 'more-o-ver', 'wher-ev-er',
    'dan-ger', 'stran-ger', 'dan-gers', 'an-gel', 'an-gels'
  ].forEach(function (h) {
    EXCEPTIONS[h.replace(/-/g, '')] = h.split('-');
  });

  // Leading words of common compounds whose final "e" is silent
  // ("some|thing", "fire|place"), so the silent e is not miscounted.
  const COMPOUND_HEADS = [
    'some', 'there', 'where', 'home', 'fire', 'life', 'time', 'care', 'love',
    'base', 'side', 'wide', 'stone', 'more', 'house', 'whole', 'make', 'note',
    'safe', 'game', 'hope', 'sure', 'name', 'place', 'space', 'store', 'white',
    'fore', 'gate', 'wire', 'line', 'lake', 'smoke', 'bone', 'nose', 'like',
    'grave', 'shame', 'grace', 'peace', 'state', 'lone', 'tribe'
  ];

  // Suffixes that keep the silent "e" of their stem ("love|ly", "state|ment").
  const SUFFIXES = ['ments', 'ment', 'fully', 'ful', 'ness', 'less', 'ly'];

  // Endings where a preceding "y" is a vowel even though a vowel follows.
  const Y_SUFFIXES = new Set(['ing', 'ings', 'er', 'ers', 'est', 'ed', 'ish']);

  // Endings after which "ng" stays together on the left ("sing|er").
  const NG_SUFFIXES = new Set(['ing', 'ings', 'er', 'ers', 'est', 'ed', 'y', 'ly']);

  // Consonant clusters that can begin a syllable.
  const ONSETS = new Set([
    'bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'tr', 'tw',
    'sc', 'sk', 'sl', 'sm', 'sn', 'sp', 'st', 'sw', 'dw', 'thr', 'shr', 'chr',
    'phr', 'phl', 'sch', 'spl', 'spr', 'str', 'scr', 'squ', 'sph', 'thw'
  ]);
  const DIGRAPHS = new Set(['th', 'sh', 'ch', 'ph', 'wh', 'ck', 'gh', 'qu', 'gu']);
  const NO_ONSET = new Set(['ck', 'ng', 'x', 'gh', "'", '’']);
  // Single consonant units that stay with the previous syllable.
  const STAY_LEFT = new Set(['x', 'ck', 'ng', 'gh', "'", '’']);

  function baseChar(ch) {
    return ch.normalize('NFD').charAt(0).toLowerCase().charAt(0) || ch;
  }

  function isVowelLetter(c) {
    return VOWELS.has(c);
  }

  function hasVowel(s) {
    return /[aeiouyæøœ]/.test(s);
  }

  function partsToCuts(parts) {
    const cuts = [];
    let pos = 0;
    for (let i = 0; i < parts.length - 1; i++) {
      pos += parts[i].length;
      cuts.push(pos);
    }
    return cuts;
  }

  function offset(cuts, by) {
    return cuts.map(function (c) { return c + by; });
  }

  // Returns the indices at which `w` (lowercase, accent-stripped) is cut.
  function cutsFor(w) {
    if (EXCEPTIONS[w]) return partsToCuts(EXCEPTIONS[w]);
    if (w.length > 3 && w.endsWith('s') && EXCEPTIONS[w.slice(0, -1)]) {
      return partsToCuts(EXCEPTIONS[w.slice(0, -1)]);
    }

    // couldn't -> could|n't, didn't -> did|n't
    const nt = /^(.*[^aeiou'’])(n['’]t)$/.exec(w);
    if (nt && hasVowel(nt[1])) {
      return cutsFor(nt[1]).concat([nt[1].length]);
    }

    for (const head of COMPOUND_HEADS) {
      if (!w.startsWith(head)) continue;
      const rest = w.slice(head.length);
      if (rest.length >= 3 && !isVowelLetter(rest[0]) && !/^[nrvy'’]/.test(rest) && hasVowel(rest)) {
        return cutsFor(head).concat([head.length], offset(cutsFor(rest), head.length));
      }
    }

    for (const suf of SUFFIXES) {
      if (!w.endsWith(suf)) continue;
      const stem = w.slice(0, -suf.length);
      if (stem.length >= 3 && /[^aeiouy]e$/.test(stem) && hasVowel(stem.slice(0, -1))) {
        return cutsFor(stem).concat([stem.length], offset(cutsFor(suf), stem.length));
      }
    }

    return coreCuts(w);
  }

  // Should the vowel run be broken between w[j] and w[j+1]?
  function splitBetween(w, j, isV) {
    const a = w[j], b = w[j + 1];
    const prev = w[j - 1], next = w[j + 2];
    const n = w.length;
    const earlierVowel = function () {
      for (let k = 0; k < j - 1; k++) if (isV[k]) return true;
      return false;
    };

    // being, going, seeing, skiing
    const ing = /ings?$/.exec(w);
    if (ing && j + 1 === ing.index && j + 1 > 0) return true;

    if (a === 'y') return true; // cry|ing
    switch (a + b) {
      case 'ia':
        return !(prev && 'ctsgx'.includes(prev));
      case 'io':
        if (prev && 'ctsgxn'.includes(prev)) return false;
        if (prev === 'l' && w[j - 2] === 'l') return false; // million
        return true;
      case 'iu':
      case 'ua':
      case 'uo':
      case 'ii':
        return true;
      case 'eo':
        return !(next === 'u' && prev && 'gc'.includes(prev)); // gorgeous
      case 'ie': {
        if (next === 't') return true; // quiet, diet, society
        if (next === 'n' && w[j + 3] && 'tc'.includes(w[j + 3]) && !(prev && 'ctsx'.includes(prev))) {
          return true; // client, audience
        }
        const rest = w.slice(j);
        if ((rest === 'ier' || rest === 'iers' || rest === 'iest') && earlierVowel()) return true;
        return false;
      }
      case 'ea':
        return j + 2 === n && earlierVowel(); // idea, area
      case 'ue': {
        if (next === undefined || isVowelLetter(next)) return false;
        const rest = w.slice(j + 2);
        return rest !== 's' && rest !== 'd'; // fuel, fluent (but blues, glued)
      }
      case 'oe':
        return next === 'm' || next === 't'; // poem, poet
      default:
        return false;
    }
  }

  function tokenizeCluster(w, start, end) {
    const units = [];
    let i = start;
    while (i < end) {
      const pair = w.substr(i, 2);
      if (i + 1 < end && pair === 'ng' && !(w[i + 2] === 'u' && i + 2 < end)) {
        units.push('ng'); i += 2;
      } else if (i + 1 < end && DIGRAPHS.has(pair)) {
        units.push(pair); i += 2;
      } else {
        units.push(w[i]); i += 1;
      }
    }
    return units;
  }

  function validOnset(units) {
    if (units.length === 1) return !NO_ONSET.has(units[0]);
    return ONSETS.has(units.join(''));
  }

  function coreCuts(w) {
    const n = w.length;
    const isV = new Array(n).fill(false);

    for (let i = 0; i < n; i++) {
      const c = w[i];
      if (isVowelLetter(c)) {
        // "qu" and "gu" before a/e/i act as consonants: queen, guess, language
        if (c === 'u' && i > 0 && (w[i - 1] === 'q' || (w[i - 1] === 'g' && i + 1 < n && 'aei'.includes(w[i + 1])))) {
          continue;
        }
        isV[i] = true;
      } else if (c === 'y') {
        if (i === 0 || isV[i - 1]) continue; // yes, play
        if (i + 1 < n && isVowelLetter(w[i + 1])) {
          isV[i] = Y_SUFFIXES.has(w.slice(i + 1)) && w[i - 1] !== 'w'; // crying vs canyon
        } else {
          isV[i] = true; // happy, myth
        }
      }
    }

    // Runs of vowels, broken into separate nuclei where needed.
    const nuclei = [];
    let i = 0;
    while (i < n) {
      if (!isV[i]) { i++; continue; }
      let s = i;
      while (i + 1 < n && isV[i + 1]) {
        if (splitBetween(w, i, isV)) {
          nuclei.push({ start: s, end: i + 1 });
          s = i + 1;
        }
        i++;
      }
      nuclei.push({ start: s, end: i + 1 });
      i++;
    }

    // Silent final e / es / ed, and syllabic "-le" / "-re".
    let syllabicEnd = false;
    if (nuclei.length >= 2) {
      const last = nuclei[nuclei.length - 1];
      if (last.end - last.start === 1 && w[last.start] === 'e') {
        const e = last.start;
        const tail = w.slice(e + 1);
        const cons = function (k) { return k >= 0 && !isV[k] && w[k] !== "'" && w[k] !== '’'; };
        const c1 = w[e - 1], c2 = w[e - 2];
        const syllabicLR = (c1 === 'l' || c1 === 'r') && cons(e - 2) && c2 !== c1;
        let drop = false;
        if (cons(e - 1)) {
          if (tail === '') {
            if (syllabicLR) syllabicEnd = true; else drop = true;
          } else if (tail === 's') {
            if (syllabicLR) syllabicEnd = true;
            else if ('sxzcg'.includes(c1) || (c1 === 'h' && c2 && 'cs'.includes(c2))) drop = false;
            else drop = true;
          } else if (tail === 'd') {
            if (syllabicLR) syllabicEnd = true; // handled, hundred
            else if (c1 !== 't' && c1 !== 'd') drop = true;
          }
        }
        if (drop) nuclei.pop();
      }
    }

    const cuts = [];
    for (let k = 0; k < nuclei.length - 1; k++) {
      const left = nuclei[k], right = nuclei[k + 1];

      if (syllabicEnd && k + 1 === nuclei.length - 1) {
        // ta|ble, lit|tle, pick|le, a|cre
        const lr = right.start - 1;
        const units = tokenizeCluster(w, left.end, lr);
        const u = units[units.length - 1];
        cuts.push(!u || u === 'ck' ? lr : lr - u.length);
        continue;
      }

      const units = tokenizeCluster(w, left.end, right.start);
      if (units.length === 0) {
        cuts.push(right.start);
      } else if (units.length === 1) {
        const u = units[0];
        let stayLeft = STAY_LEFT.has(u);
        if (u === 'ng' && !NG_SUFFIXES.has(w.slice(right.start))) {
          cuts.push(left.end + 1); // dan|ger, fin|ger
          continue;
        }
        cuts.push(stayLeft ? right.start : left.end);
      } else {
        let cut = right.start;
        let pos = left.end + units[0].length;
        for (let x = 1; x < units.length; x++) {
          if (validOnset(units.slice(x))) { cut = pos; break; }
          pos += units[x].length;
        }
        cuts.push(cut);
      }
    }
    return cuts;
  }

  /** Split a single word into syllables, preserving the original casing. */
  function syllabify(word) {
    if (!word) return [];
    let lower = '';
    for (let i = 0; i < word.length; i++) lower += baseChar(word[i]);
    if (!/[a-zæøœß]/.test(lower)) return [word];
    const cuts = cutsFor(lower).filter(function (c) { return c > 0 && c < word.length; });
    const parts = [];
    let prev = 0;
    for (const c of cuts) {
      if (c > prev) { parts.push(word.slice(prev, c)); prev = c; }
    }
    parts.push(word.slice(prev));
    return parts;
  }

  // Best place to cut one syllable chunk in two (or -1), used by syllabifyTo.
  function splitPoint(part) {
    let s = '';
    for (let i = 0; i < part.length; i++) s += baseChar(part[i]);
    const n = s.length;
    const isV = function (k) { return /[aeiouyæøœ]/.test(s[k]) && !(k === 0 && s[k] === 'y'); };
    let best = -1, bestScore = Infinity;
    function consider(cut, penalty) {
      if (cut <= 0 || cut >= n) return;
      const score = Math.abs(cut - n / 2) + penalty;
      if (score < bestScore) { best = cut; bestScore = score; }
    }
    for (let k = 1; k < n; k++) {
      if (isV(k - 1) && !isV(k) && k + 1 < n && isV(k + 1)) consider(k, 0);           // fi|re
      if (isV(k - 1) && !isV(k) && k + 2 < n && !isV(k + 1) && isV(k + 2)) consider(k + 1, 0.5); // mid-cluster
      if (isV(k - 1) && isV(k)) consider(k, 1);                                       // ho|ur
    }
    if (best < 0) {
      // Syllabic consonant ending with no second vowel letter: pris|m
      for (let k = n - 1; k > 0; k--) if (isV(k)) { if (k < n - 2) best = n - 1; break; }
    }
    return best;
  }

  /**
   * Split a word into exactly `target` syllables when possible, starting from
   * the rule-based split. Used when a pronouncing dictionary knows the count.
   */
  function syllabifyTo(word, target) {
    const parts = syllabify(word);
    if (!target || target < 1) return parts;
    while (parts.length > target) {
      let best = 0, bestLen = Infinity;
      for (let i = 0; i < parts.length - 1; i++) {
        const len = parts[i].length + parts[i + 1].length;
        if (len < bestLen) { best = i; bestLen = len; }
      }
      parts.splice(best, 2, parts[best] + parts[best + 1]);
    }
    while (parts.length < target) {
      const order = parts.map(function (_, i) { return i; })
        .sort(function (a, b) { return parts[b].length - parts[a].length; });
      let split = false;
      for (const i of order) {
        const cut = splitPoint(parts[i]);
        if (cut > 0) {
          parts.splice(i, 1, parts[i].slice(0, cut), parts[i].slice(cut));
          split = true;
          break;
        }
      }
      if (!split) break;
    }
    return parts;
  }

  /** Number of syllables in a single word. */
  function count(word) {
    return syllabify(word).length;
  }

  // Words: letters (incl. Latin accents) with optional internal apostrophes.
  const WORD_RE = /[A-Za-zÀ-ÖØ-öø-ɏ]+(?:['’][A-Za-zÀ-ÖØ-öø-ɏ]+)*/g;

  /**
   * Split a line of text into tokens:
   *   { type: 'word', text, syllables: [...] } or { type: 'text', text }
   */
  function tokenize(line) {
    const tokens = [];
    let last = 0;
    WORD_RE.lastIndex = 0;
    let m;
    while ((m = WORD_RE.exec(line))) {
      if (m.index > last) tokens.push({ type: 'text', text: line.slice(last, m.index) });
      tokens.push({ type: 'word', text: m[0], syllables: syllabify(m[0]) });
      last = m.index + m[0].length;
    }
    if (last < line.length) tokens.push({ type: 'text', text: line.slice(last) });
    return tokens;
  }

  return { syllabify: syllabify, syllabifyTo: syllabifyTo, count: count, tokenize: tokenize };
});
