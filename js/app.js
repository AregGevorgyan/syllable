(function () {
  'use strict';

  const STORAGE_KEY = 'syllable-counter:text';
  const COLORS = 5;
  const SAMPLE = [
    'The morning light spills over hills,',
    'a quiet river hums along.',
    'Count every beat the meter fills,',
    'each syllable a step in song.',
    '',
    'Paste your own lyrics, haiku, or prose here —',
    'the numbers update as you type.'
  ].join('\n');

  const input = document.getElementById('input');
  const output = document.getElementById('output');
  const totalSyl = document.getElementById('total-syllables');
  const totalWords = document.getElementById('total-words');
  const totalLines = document.getElementById('total-lines');

  // Cache tokenized lines: re-rendering a long text only re-splits new lines.
  const lineCache = new Map();
  function tokenizeLine(line) {
    let tokens = lineCache.get(line);
    if (!tokens) {
      tokens = Syllables.tokenize(line);
      if (lineCache.size > 5000) lineCache.clear();
      lineCache.set(line, tokens);
    }
    return tokens;
  }

  function renderLine(line) {
    const row = document.createElement('div');
    row.className = 'line';
    const badge = document.createElement('span');
    badge.className = 'count';
    const content = document.createElement('div');
    content.className = 'content';

    let syllables = 0;
    let words = 0;
    let color = 0;
    for (const tok of tokenizeLine(line)) {
      if (tok.type === 'text') {
        content.appendChild(document.createTextNode(tok.text));
        continue;
      }
      words++;
      syllables += tok.syllables.length;
      const word = document.createElement('span');
      word.className = 'word';
      word.title = tok.syllables.join('·') + ' — ' + tok.syllables.length +
        (tok.syllables.length === 1 ? ' syllable' : ' syllables');
      for (const s of tok.syllables) {
        const box = document.createElement('span');
        box.className = 'syl c' + (color++ % COLORS);
        box.textContent = s;
        word.appendChild(box);
      }
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
    return { row, syllables, words };
  }

  function render() {
    const text = input.value;
    const frag = document.createDocumentFragment();
    let syllables = 0, words = 0, lines = 0;

    if (text === '') {
      const p = document.createElement('div');
      p.className = 'placeholder';
      p.textContent = 'Syllables appear here.';
      frag.appendChild(p);
    } else {
      for (const line of text.split('\n')) {
        const r = renderLine(line);
        frag.appendChild(r.row);
        syllables += r.syllables;
        words += r.words;
        if (line.trim() !== '') lines++;
      }
    }

    output.replaceChildren(frag);
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

  // Keep the breakdown roughly aligned with where you are in the editor.
  function syncScroll() {
    const max = input.scrollHeight - input.clientHeight;
    if (max <= 0) return;
    output.scrollTop = (input.scrollTop / max) * (output.scrollHeight - output.clientHeight);
  }

  input.addEventListener('input', schedule);
  input.addEventListener('scroll', syncScroll);
  document.getElementById('clear-btn').addEventListener('click', function () {
    input.value = '';
    schedule();
    input.focus();
  });
  document.getElementById('sample-btn').addEventListener('click', function () {
    input.value = SAMPLE;
    schedule();
    input.focus();
  });

  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* storage unavailable */ }
  input.value = saved !== null ? saved : SAMPLE;
  render();
})();
