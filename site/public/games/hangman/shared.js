import { esc, injectStyles } from '../../js/ui.js';

export function hangmanStyles() {
  injectStyles('hangman', `
    .hm { text-align: center; }
    .hm-top { display: grid; grid-template-columns: auto 1fr; gap: 1.5rem; align-items: center; }
    .hm-art svg { width: clamp(9rem, 32vh, 15rem); height: auto; display: block; }
    .hm-cat { font: 700 1rem var(--body); opacity: .85; margin-bottom: .4rem; }
    .hm-cat b { color: var(--gold); }
    .hm-word { display: flex; flex-wrap: wrap; justify-content: center; gap: .9rem 1.6rem; }
    .hm-chunk { display: flex; gap: .35rem; }
    .hm-slot { width: clamp(1.6rem, 4vw, 2.8rem); height: clamp(2.2rem, 7vh, 3.4rem); border-bottom: 4px solid var(--card);
      font: 800 clamp(1.4rem, min(4vw, 6vh), 2.6rem)/1 var(--display); color: var(--card); display: grid; place-items: end center; text-transform: uppercase; }
    .hm-slot.punct { border-color: transparent; width: auto; }
    .hm-slot.late { color: #ff9a92; }
    .hm-slot.new { animation: hm-pop .4s ease; }
    @keyframes hm-pop { from { transform: translateY(-.4em); opacity: 0; } to { transform: none; opacity: 1; } }
    .hm-used { display: flex; flex-wrap: wrap; justify-content: center; gap: .3rem; margin-top: .9rem; }
    .hm-used span { font: 800 1rem var(--display); width: 1.8rem; height: 1.8rem; border-radius: 6px; display: grid; place-items: center; text-transform: uppercase; }
    .hm-used .hit { background: #2f7a4f; color: #fff; } .hm-used .miss { background: rgba(0,0,0,.3); color: #ff9a92; text-decoration: line-through; }
    .hm-msg { font: 700 clamp(1rem, 3vh, 1.3rem) var(--body); margin: .6rem 0; }
    .hm-msg .hit { color: #8be38b; } .hm-msg .miss { color: #ff9a92; }
    .hm-big { font: 800 clamp(1.4rem, 5vh, 2.4rem)/1.15 var(--display); margin: .4rem 0; }
    .hm-actions { display: flex; flex-wrap: wrap; gap: .6rem; justify-content: center; margin-top: .8rem; }
    .hm-keys { display: grid; grid-template-columns: repeat(7, 1fr); gap: .35rem; margin: .8rem 0; }
    .hm-keys button { font: 800 1.25rem var(--display); padding: .55rem 0; border-radius: 10px; border: 0; background: var(--card); color: var(--ink);
      box-shadow: 0 3px 0 var(--card-edge, #cdbf98); text-transform: uppercase; }
    .hm-keys button:disabled { opacity: .25; box-shadow: none; }
    .hm-phone form { display: grid; gap: .6rem; margin-top: .6rem; text-align: left; }
    .hm-phone .hm-word { gap: .6rem 1rem; } .hm-phone .hm-slot { width: 1.4rem; height: 2rem; font-size: 1.3rem; border-bottom-width: 3px; }
    .hm-phone .hm-art svg { width: 7rem; margin: 0 auto; }
    .hm-score { font-weight: 700; opacity: .85; }
  `);
}

/** The drawing: gallows, then one body part per miss. */
export function artHtml(misses, max) {
  const stroke = 'stroke="var(--card)" stroke-width="6" stroke-linecap="round" fill="none"';
  const body = 'stroke="#ffd36b" stroke-width="6" stroke-linecap="round" fill="none"';
  const parts = [
    `<circle cx="140" cy="62" r="20" ${body}/>`,
    `<line x1="140" y1="82" x2="140" y2="140" ${body}/>`,
    `<line x1="140" y1="98" x2="114" y2="122" ${body}/>`,
    `<line x1="140" y1="98" x2="166" y2="122" ${body}/>`,
    `<line x1="140" y1="140" x2="118" y2="176" ${body}/>`,
    `<line x1="140" y1="140" x2="162" y2="176" ${body}/>`,
  ];
  const face = misses >= max
    ? `<g stroke="#ff4b3e" stroke-width="3" stroke-linecap="round"><line x1="128" y1="55" x2="136" y2="63"/><line x1="136" y1="55" x2="128" y2="63"/><line x1="144" y1="55" x2="152" y2="63"/><line x1="152" y1="55" x2="144" y2="63"/></g>`
    : misses ? '<g fill="#ffd36b"><circle cx="133" cy="59" r="2.5"/><circle cx="147" cy="59" r="2.5"/></g>' : '';
  return `<div class="hm-art"><svg viewBox="0 0 200 210" aria-label="${misses} of ${max} misses">
    <line x1="20" y1="200" x2="110" y2="200" ${stroke}/><line x1="50" y1="200" x2="50" y2="14" ${stroke}/>
    <line x1="50" y1="14" x2="140" y2="14" ${stroke}/><line x1="140" y1="14" x2="140" y2="42" ${stroke}/>
    ${parts.slice(0, misses).join('')}${face}</svg></div>`;
}

let lastMask = '';
/** Letter blanks, grouped by word so phrases wrap nicely. */
export function wordHtml(s, animate = false) {
  const prev = lastMask;
  if (animate) lastMask = s.mask.join('|');
  const prevArr = prev.split('|');
  const chunks = [];
  let cur = [];
  s.mask.forEach((c, i) => {
    const real = s.answer ? s.answer[i] : c;
    if (real === ' ') { chunks.push(cur); cur = []; return; }
    const punct = real && !/[a-z]/.test(real);
    const late = s.phase !== 'guess' && s.answer && !s.solvedBy && s.guessed && !s.guessed.includes(real) && !punct;
    const fresh = animate && c && prevArr.length === s.mask.length && !prevArr[i];
    cur.push(`<span class="hm-slot ${punct ? 'punct' : ''} ${late ? 'late' : ''} ${fresh ? 'new' : ''}">${esc(c || '')}</span>`);
  });
  chunks.push(cur);
  return `<div class="hm-word">${chunks.map((ch) => `<span class="hm-chunk">${ch.join('')}</span>`).join('')}</div>`;
}

export function usedHtml(s) {
  return `<div class="hm-used">${s.guessed.map((l) => `<span class="${s.mask.includes(l) || (s.answer || '').includes(l) ? 'hit' : 'miss'}">${l}</span>`).join('')}</div>`;
}
