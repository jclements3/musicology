/* keyboard.js — crisp high-DPI piano renderer. Shows the "shape" of a chord by
 * highlighting the keys, with note names drawn on the highlighted keys. */
(function (global) {
  'use strict';

  const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
  const isWhite = (m) => WHITE_PCS.includes(((m % 12) + 12) % 12);

  // Render `midis` (highlighted) on a keyboard spanning [low, high].
  function draw(canvas, midis, labels) {
    const lo = 48, hi = 84; // C3 .. C6
    const dpr = global.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 900;
    const cssH = canvas.clientHeight || 200;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const whites = [];
    for (let m = lo; m <= hi; m++) if (isWhite(m)) whites.push(m);
    const ww = cssW / whites.length;
    const wh = cssH;
    const bw = ww * 0.62;
    const bh = cssH * 0.62;
    const hi_set = new Set(midis || []);
    const labelMap = labels || {};

    const xOfWhite = {};
    whites.forEach((m, i) => { xOfWhite[m] = i * ww; });

    // white keys
    whites.forEach((m, i) => {
      const x = i * ww;
      const on = hi_set.has(m);
      ctx.fillStyle = on ? '#4f7cff' : '#f7f8fc';
      ctx.fillRect(x, 0, ww - 1, wh);
      ctx.strokeStyle = '#3a3f5c';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, 0, ww - 1, wh);
      if (on && labelMap[m]) {
        ctx.fillStyle = '#fff';
        ctx.font = '600 ' + Math.max(13, ww * 0.42) + 'px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labelMap[m], x + ww / 2, wh - 14);
      }
    });

    // black keys (drawn after, on top)
    for (let m = lo; m <= hi; m++) {
      if (isWhite(m)) continue;
      // black key sits to the right of the previous white key
      const prevWhite = m - 1;
      if (xOfWhite[prevWhite] === undefined) continue;
      const x = xOfWhite[prevWhite] + ww - bw / 2;
      const on = hi_set.has(m);
      ctx.fillStyle = on ? '#7da0ff' : '#15182b';
      ctx.fillRect(x, 0, bw, bh);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(x, 0, bw, bh);
      if (on && labelMap[m]) {
        ctx.fillStyle = '#fff';
        ctx.font = '600 ' + Math.max(11, bw * 0.4) + 'px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labelMap[m], x + bw / 2, bh - 10);
      }
    }
  }

  global.Keyboard = { draw };
})(window);
