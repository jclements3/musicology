/* game.js — game flow, two modes, metrics, persistence, UI wiring. */
(function () {
  'use strict';

  const T = window.Theory;
  const $ = (id) => document.getElementById(id);

  // ---------- persistent progress ----------
  const STORE_KEY = 'rnt_progress_v1';
  const blankProgress = () => ({
    totalAnswered: 0, totalCorrect: 0, score: 0, xp: 0,
    bestStreak: 0, mastery: {}, // roman -> {seen, correct}
    updated: 0,
  });
  let progress = loadProgress();

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return Object.assign(blankProgress(), JSON.parse(raw));
    } catch (e) {}
    return blankProgress();
  }
  function saveProgress() {
    progress.updated = Date.now();
    try { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch (e) {}
    // best-effort server backup (works when served by server.py)
    try {
      fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(progress),
      }).catch(() => {});
    } catch (e) {}
  }

  function levelFor(xp) { return 1 + Math.floor(xp / 200); }
  function xpIntoLevel(xp) { return xp % 200; }

  // ---------- session state ----------
  const session = { answered: 0, correct: 0, streak: 0, timeSum: 0, startTs: 0 };
  let mode = 'identify';
  let current = null; // current question

  const settings = {
    major: true, minor: false, harm: false, seventh: false, sound: true,
  };

  // ---------- question generation ----------
  function enabledKeys() {
    const keys = [];
    if (settings.major) T.MAJOR_KEYS.forEach((k) => keys.push({ tonic: k, mode: 'major' }));
    if (settings.minor) T.MINOR_KEYS.forEach((k) => keys.push({ tonic: k, mode: 'minor' }));
    if (keys.length === 0) keys.push({ tonic: 'C', mode: 'major' });
    return keys;
  }
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function newQuestion() {
    const kSpec = pick(enabledKeys());
    const key = T.makeKey(kSpec.tonic, kSpec.mode, settings.harm);
    const useSeventh = settings.seventh && Math.random() < 0.5;
    const degree = Math.floor(Math.random() * 7);
    const chord = T.buildChord(key.scale, degree, useSeventh);
    const diatonic = T.diatonicChords(key.scale, useSeventh);

    current = { key, chord, diatonic, useSeventh, answered: false, ts: performance.now() };
    session.startTs = performance.now();
    render();
  }

  // ---------- rendering ----------
  function labelMap(chord) {
    const m = {};
    chord.midis.forEach((mi, i) => { m[mi] = chord.noteNames[i]; });
    return m;
  }

  function render() {
    const { key, chord, diatonic } = current;
    $('keyChip').innerHTML = 'Key: <b>' + key.label + '</b>';

    if (mode === 'identify') {
      $('promptText').textContent = 'What is the roman numeral of this chord?';
      Keyboard.draw($('keyboard'), chord.midis, labelMap(chord));
      $('chordNotes').textContent = chord.noteNames.join('  –  ');
      renderAnswers(diatonic.map((d) => d.roman), chord);
    } else {
      // build mode: show roman numeral, choose the chord
      $('promptText').innerHTML = 'Which chord is <b class="big-roman">' + chord.roman + '</b> in this key?';
      Keyboard.draw($('keyboard'), [], {});
      $('chordNotes').textContent = '–';
      const options = buildChordOptions(diatonic, chord);
      renderChordAnswers(options, chord);
    }
    $('feedback').textContent = '';
    $('feedback').className = '';
    updateHud();
  }

  function buildChordOptions(diatonic, correct) {
    const others = diatonic.filter((d) => d.roman !== correct.roman);
    const opts = shuffle(others).slice(0, 3);
    opts.push(correct);
    return shuffle(opts);
  }

  function renderAnswers(romans, correctChord) {
    const box = $('answers');
    box.className = 'grid7';
    box.innerHTML = '';
    // the 7 diatonic numerals of the key act as the answer choices
    romans.forEach((r) => {
      const b = document.createElement('button');
      b.className = 'ans';
      b.textContent = r;
      b.onclick = () => answer(r === correctChord.roman, b, correctChord);
      box.appendChild(b);
    });
  }

  function renderChordAnswers(options, correct) {
    const box = $('answers');
    box.className = 'grid4';
    box.innerHTML = '';
    options.forEach((opt) => {
      const b = document.createElement('button');
      b.className = 'ans chord-ans';
      b.dataset.notes = opt.notes.join();
      b.innerHTML = opt.noteNames.join(' &middot; ');
      const isCorrect = opt.notes.join() === correct.notes.join();
      b.onclick = () => answer(isCorrect, b, correct, opt);
      box.appendChild(b);
    });
  }

  // ---------- answering / scoring ----------
  function answer(correct, btn, correctChord, chosenChord) {
    if (current.answered) return;
    current.answered = true;
    const elapsed = (performance.now() - session.startTs) / 1000;

    session.answered++;
    session.timeSum += elapsed;
    progress.totalAnswered++;

    const roman = current.chord.roman;
    if (!progress.mastery[roman]) progress.mastery[roman] = { seen: 0, correct: 0 };
    progress.mastery[roman].seen++;

    if (correct) {
      session.correct++;
      session.streak++;
      progress.totalCorrect++;
      progress.mastery[roman].correct++;
      const bonus = Math.min(session.streak, 10) * 2;
      const gained = 10 + bonus;
      progress.score += gained;
      progress.xp += gained;
      if (session.streak > progress.bestStreak) progress.bestStreak = session.streak;
      btn.classList.add('correct');
      flash('Correct  +' + gained, true);
      if (settings.sound) window.Audio2.blip(true);
    } else {
      session.streak = 0;
      btn.classList.add('wrong');
      // highlight the right answer
      markCorrect(correctChord);
      flash('Answer: ' + correctChord.roman + '  (' + correctChord.noteNames.join(' ') + ')', false);
      if (settings.sound) window.Audio2.blip(false);
    }

    // reveal the chord on the keyboard + play it
    if (mode === 'build') {
      Keyboard.draw($('keyboard'), correctChord.midis, labelMap(correctChord));
      $('chordNotes').textContent = correctChord.noteNames.join('  –  ');
    }
    if (settings.sound) window.Audio2.playChord(correctChord.midis);

    saveProgress();
    updateHud();
    disableAnswers();
    setTimeout(newQuestion, correct ? 850 : 1700);
  }

  function markCorrect(correctChord) {
    const target = (mode === 'identify') ? correctChord.roman : correctChord.notes.join();
    document.querySelectorAll('#answers .ans').forEach((b) => {
      const match = (mode === 'identify')
        ? b.textContent === target
        : b.dataset.notes === target;
      if (match) b.classList.add('correct');
    });
  }

  function disableAnswers() {
    document.querySelectorAll('#answers .ans').forEach((b) => { b.disabled = true; });
  }

  function flash(msg, ok) {
    const f = $('feedback');
    f.textContent = msg;
    f.className = ok ? 'ok' : 'bad';
  }

  function updateHud() {
    $('levelBadge').textContent = levelFor(progress.xp);
    $('xpBar').style.width = (xpIntoLevel(progress.xp) / 200 * 100) + '%';
    $('streakVal').textContent = session.streak;
    $('scoreVal').textContent = progress.score;
    const acc = progress.totalAnswered ? Math.round(progress.totalCorrect / progress.totalAnswered * 100) : null;
    $('accVal').textContent = acc === null ? '–' : acc + '%';
    $('sessAnswered').textContent = session.answered;
    $('bestStreak').textContent = progress.bestStreak;
    $('avgTime').textContent = session.answered ? (session.timeSum / session.answered).toFixed(1) + 's' : '–';
  }

  // ---------- stats drawer ----------
  function renderStats() {
    $('totalsBox').innerHTML =
      row('Level', levelFor(progress.xp)) +
      row('XP', progress.xp) +
      row('Score', progress.score) +
      row('Answered', progress.totalAnswered) +
      row('Correct', progress.totalCorrect) +
      row('Accuracy', progress.totalAnswered ? Math.round(progress.totalCorrect / progress.totalAnswered * 100) + '%' : '–') +
      row('Best streak', progress.bestStreak);

    const keys = Object.keys(progress.mastery).sort();
    const box = $('masteryBox');
    box.innerHTML = '';
    if (!keys.length) { box.innerHTML = '<p class="muted">No data yet — play a few rounds.</p>'; return; }
    keys.forEach((r) => {
      const m = progress.mastery[r];
      const pct = m.seen ? Math.round(m.correct / m.seen * 100) : 0;
      const el = document.createElement('div');
      el.className = 'mrow';
      el.innerHTML = '<span class="mlabel">' + r + '</span>' +
        '<div class="mbar"><div class="mfill" style="width:' + pct + '%"></div></div>' +
        '<span class="mpct">' + pct + '% <small>(' + m.correct + '/' + m.seen + ')</small></span>';
      box.appendChild(el);
    });
  }
  const row = (k, v) => '<div class="trow"><span>' + k + '</span><b>' + v + '</b></div>';

  // ---------- settings wiring ----------
  function syncSettingsFromUI() {
    settings.major = $('optMajor').checked;
    settings.minor = $('optMinor').checked;
    settings.harm = $('optHarm').checked;
    settings.seventh = $('optSeventh').checked;
    settings.sound = $('optSound').checked;
  }

  function wire() {
    document.querySelectorAll('.mode-tab').forEach((tab) => {
      tab.onclick = () => {
        document.querySelectorAll('.mode-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        mode = tab.dataset.mode;
        newQuestion();
      };
    });

    $('startBtn').onclick = () => { newQuestion(); $('startBtn').textContent = 'Skip'; };
    $('playBtn').onclick = () => { if (current) window.Audio2.playChord(current.chord.midis); };

    $('settingsBtn').onclick = () => $('settingsOverlay').classList.remove('hidden');
    $('closeSettings').onclick = () => { syncSettingsFromUI(); $('settingsOverlay').classList.add('hidden'); newQuestion(); };
    ['optMajor', 'optMinor', 'optHarm', 'optSeventh', 'optSound'].forEach((id) => {
      $(id).onchange = syncSettingsFromUI;
    });

    $('statsBtn').onclick = () => { renderStats(); $('statsOverlay').classList.remove('hidden'); };
    $('closeStats').onclick = () => $('statsOverlay').classList.add('hidden');

    $('resetBtn').onclick = () => {
      if (confirm('Erase all progress?')) {
        progress = blankProgress();
        saveProgress();
        renderStats(); updateHud();
      }
    };
    $('syncBtn').onclick = () => { saveProgress(); alert('Progress synced.'); };

    window.addEventListener('resize', () => { if (current) render(); });

    // load server progress if newer (for Android/multi-device)
    fetch('/api/progress').then((r) => r.ok ? r.json() : null).then((srv) => {
      if (srv && srv.updated && srv.updated > (progress.updated || 0)) {
        progress = Object.assign(blankProgress(), srv);
        updateHud();
      }
    }).catch(() => {});
  }

  document.addEventListener('DOMContentLoaded', () => {
    wire();
    updateHud();
    newQuestion();
    $('startBtn').textContent = 'Skip';
  });
})();
