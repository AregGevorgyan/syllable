(function () {
  'use strict';

  const STORAGE_KEY = 'syllable-counter:text';
  // Vowel sounds (ARPAbet) in legend order, with an example word for each.
  const VOWELS = [
    ['IY', 'see'], ['IH', 'sit'], ['EY', 'day'], ['EH', 'bed'], ['AE', 'cat'],
    ['AY', 'my'], ['AA', 'hot'], ['AO', 'law'], ['OW', 'go'], ['UH', 'book'],
    ['UW', 'blue'], ['OY', 'boy'], ['AW', 'now'], ['ER', 'her'], ['AH', 'but']
  ];

  const input = document.getElementById('input');
  const output = document.getElementById('output');
  const legend = document.getElementById('legend');
  const status = document.getElementById('status');
  const totalSyl = document.getElementById('total-syllables');
  const totalWords = document.getElementById('total-words');
  const totalLines = document.getElementById('total-lines');

  // ---------- Word analysis ----------

  // word -> { parts: [...], vowels: ['UW1', ...] | null, phones: string | null }
  const wordCache = new Map();

  function analyzeWord(word) {
    let info = wordCache.get(word);
    if (info) return info;

    const ruleParts = Syllables.syllabify(word);
    const prons = Pronouncing.phonesForWord(word);
    if (prons.length === 0) {
      info = { parts: ruleParts, vowels: null, phones: null };
    } else {
      // Prefer the pronunciation whose syllable count matches the spelling rules,
      // so the boxes line up naturally ("every" as EH1 V R IY0).
      const phones = prons.find(function (p) { return Pronouncing.syllableCount(p) === ruleParts.length; }) || prons[0];
      const vowels = Pronouncing.vowels(phones);
      const parts = vowels.length === ruleParts.length ? ruleParts : Syllables.syllabifyTo(word, vowels.length);
      info = { parts: parts, vowels: vowels, phones: phones };
    }
    if (wordCache.size > 20000) wordCache.clear();
    wordCache.set(word, info);
    return info;
  }

  // ---------- Rendering ----------

  function renderLine(line, used) {
    const row = document.createElement('div');
    row.className = 'line';
    const badge = document.createElement('span');
    badge.className = 'count';
    const content = document.createElement('div');
    content.className = 'content';

    let syllables = 0;
    let words = 0;
    for (const tok of Syllables.tokenize(line)) {
      if (tok.type === 'text') {
        content.appendChild(document.createTextNode(tok.text));
        continue;
      }
      const info = analyzeWord(tok.text);
      words++;
      syllables += info.parts.length;

      const word = document.createElement('span');
      word.className = 'word';
      word.title = info.parts.join('·') + ' — ' + info.parts.length +
        (info.parts.length === 1 ? ' syllable' : ' syllables') +
        (info.phones ? '\n' + info.phones : '\nnot in dictionary');

      info.parts.forEach(function (s, i) {
        const box = document.createElement('span');
        box.textContent = s;
        if (info.vowels && info.vowels[i]) {
          const v = info.vowels[i];
          const base = v.slice(0, 2);
          const stress = v.slice(2);
          const schwa = base === 'AH' && stress === '0';
          box.className = 'syl ' + (schwa ? 'v-schwa' : 'v-' + base + (stress === '0' ? ' weak' : ''));
          used.add(schwa ? 'schwa' : base);
        } else {
          box.className = 'syl v-unknown';
          used.add('unknown');
        }
        word.appendChild(box);
      });
      content.appendChild(word);
    }

    if (line.trim() === '') {
      badge.classList.add('empty');
      content.appendChild(document.createTextNode('​'));
    } else if (syllables === 0) {
      badge.classList.add('zero');
    }
    badge.textContent = syllables;
    badge.title = syllables + (syllables === 1 ? ' syllable' : ' syllables') + ' in this line';

    row.append(badge, content);
    return { row: row, syllables: syllables, words: words };
  }

  function renderLegend(used) {
    legend.replaceChildren();
    if (!Pronouncing.isLoaded() || used.size === 0) {
      legend.hidden = true;
      return;
    }
    const items = VOWELS.filter(function (v) { return used.has(v[0]); })
      .map(function (v) { return ['v-' + v[0], v[1]]; });
    if (used.has('schwa')) items.push(['v-schwa', 'a·bout']);
    if (used.has('unknown')) items.push(['v-unknown', 'unknown']);
    for (const item of items) {
      const chip = document.createElement('span');
      chip.className = 'syl ' + item[0];
      chip.textContent = item[1];
      legend.appendChild(chip);
    }
    legend.hidden = false;
  }

  function render() {
    const text = input.value;
    const frag = document.createDocumentFragment();
    const used = new Set();
    let syllables = 0, words = 0, lines = 0;

    if (text === '') {
      const p = document.createElement('div');
      p.className = 'placeholder';
      p.textContent = 'Syllables appear here.';
      frag.appendChild(p);
    } else {
      for (const line of text.split('\n')) {
        const r = renderLine(line, used);
        frag.appendChild(r.row);
        syllables += r.syllables;
        words += r.words;
        if (line.trim() !== '') lines++;
      }
    }

    output.replaceChildren(frag);
    renderLegend(used);
    totalSyl.textContent = syllables.toLocaleString();
    totalWords.textContent = words.toLocaleString();
    totalLines.textContent = lines.toLocaleString();
  }

  let pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      render();
      try { localStorage.setItem(STORAGE_KEY, input.value); } catch (e) { /* storage unavailable */ }
    });
  }

  // ---------- Controls ----------

  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  document.getElementById('clear-key').textContent = isMac ? '⌘K' : 'Ctrl+K';

  // Clear via the editing command so the browser's undo can restore the text.
  function clearText() {
    input.focus();
    input.select();
    if (!document.execCommand('delete')) {
      input.value = '';
      schedule();
    }
  }

  // Keep the breakdown roughly aligned with where you are in the editor.
  function syncScroll() {
    const max = input.scrollHeight - input.clientHeight;
    if (max <= 0) return;
    output.scrollTop = (input.scrollTop / max) * (output.scrollHeight - output.clientHeight);
  }

  input.addEventListener('input', schedule);
  input.addEventListener('scroll', syncScroll);
  document.getElementById('clear-btn').addEventListener('click', clearText);
  document.addEventListener('keydown', function (e) {
    if ((isMac ? e.metaKey : e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      clearText();
    }
  });

  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* storage unavailable */ }
  if (saved) input.value = saved;
  render();

  // Load the pronouncing dictionary; until then, counts use spelling rules only.
  status.textContent = 'loading sounds…';
  Pronouncing.load('data/cmudict.txt').then(function () {
    status.textContent = '';
    wordCache.clear();
    render();
  }, function () {
    status.textContent = 'sounds unavailable';
  });
})();
