// The trolley scene: a tram, a forked track, a person at the lever, and a sign at the end of each branch.
// "stay" is the straight track (lower). Pulling the lever sends the trolley up the other branch.
import { esc } from '../../js/ui.js';

// Paths the trolley follows, in the SVG's own units (viewBox 1200 × 560).
const START = 'M150 452';
const TO_SWITCH = 'L470 452';
const STAY = `${START} ${TO_SWITCH} L735 452`;
const PULL = `${START} ${TO_SWITCH} C560 452 620 300 735 260`;
const STOP = `${START} L420 452`;

function rails(d, id) {
  return `<path d="${d}" fill="none" stroke="url(#tp-ties)" stroke-width="34" stroke-dasharray="7 15" class="tp-ties-${id}"/>
    <path d="${d}" fill="none" stroke="#6d6a66" stroke-width="20"/>
    <path d="${d}" fill="none" stroke="#c8c2b8" stroke-width="12"/>
    <path d="${d}" fill="none" stroke="#7a5b3f" stroke-width="5"/>`;
}

const tram = `
  <g class="tp-tram">
    <line x1="-20" y1="-128" x2="30" y2="-190" stroke="#3a3a3a" stroke-width="5"/>
    <circle cx="30" cy="-190" r="5" fill="#3a3a3a"/>
    <rect x="-95" y="-120" width="190" height="98" rx="20" fill="#d6453d"/>
    <rect x="-95" y="-120" width="190" height="22" rx="11" fill="#f2c230"/>
    <rect x="-82" y="-90" width="44" height="36" rx="7" fill="#cfe8ff" stroke="#8a2620" stroke-width="3"/>
    <rect x="-27" y="-90" width="44" height="36" rx="7" fill="#cfe8ff" stroke="#8a2620" stroke-width="3"/>
    <rect x="28" y="-90" width="44" height="36" rx="7" fill="#cfe8ff" stroke="#8a2620" stroke-width="3"/>
    <rect x="-95" y="-44" width="190" height="12" fill="#8a2620"/>
    <circle cx="88" cy="-62" r="8" fill="#fff6c9" stroke="#8a2620" stroke-width="2"/>
    <circle cx="-55" cy="-16" r="16" fill="#2d2d2d"/><circle cx="-55" cy="-16" r="6" fill="#999"/>
    <circle cx="55" cy="-16" r="16" fill="#2d2d2d"/><circle cx="55" cy="-16" r="6" fill="#999"/>
  </g>`;

/** The person at the lever, wondering. */
const thinker = `
  <g transform="translate(560 520)">
    <ellipse cx="0" cy="34" rx="34" ry="7" fill="rgba(0,0,0,.18)"/>
    <rect x="-17" y="-8" width="14" height="40" rx="7" fill="#2b4a7a"/><rect x="3" y="-8" width="14" height="40" rx="7" fill="#2b4a7a"/>
    <rect x="-22" y="-62" width="44" height="60" rx="18" fill="#3fa66a"/>
    <circle cx="0" cy="-86" r="24" fill="#f1c7a0"/>
    <path d="M-24 -92 Q0 -124 24 -92 Q12 -104 0 -102 Q-12 -104 -24 -92Z" fill="#5a3a22"/>
    <circle cx="-8" cy="-86" r="3" fill="#222"/><circle cx="8" cy="-86" r="3" fill="#222"/>
    <path d="M-7 -74 Q0 -70 7 -74" stroke="#222" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M18 -52 Q44 -50 52 -66" stroke="#f1c7a0" stroke-width="11" fill="none" stroke-linecap="round" class="tp-arm"/>
    <g class="tp-think"><circle cx="30" cy="-122" r="5" fill="#fff"/><circle cx="44" cy="-138" r="8" fill="#fff"/>
      <ellipse cx="72" cy="-166" rx="30" ry="22" fill="#fff"/><text x="72" y="-157" text-anchor="middle" font-size="28" font-weight="900" fill="#22201b">?</text></g>
  </g>`;

/** The lever: tilted left (straight track) or right (pulled). */
const lever = (pulled) => `
  <g transform="translate(470 500)">
    <rect x="-26" y="-6" width="52" height="22" rx="6" fill="#5b5b5b"/>
    <g class="tp-lever ${pulled ? 'pulled' : ''}">
      <rect x="-4" y="-70" width="8" height="70" rx="4" fill="#3a3a3a"/>
      <circle cx="0" cy="-74" r="11" fill="#d6453d"/>
    </g>
  </g>`;

/**
 * The full scene. `outcome` is '', 'stay', 'pull' or 'tie'. Cards for each branch are HTML on top of the art,
 * so long text wraps nicely.
 */
export function sceneHtml(s, { outcome = '', cards = true, counts = null, names = null } = {}) {
  const path = outcome === 'pull' ? PULL : outcome === 'stay' ? STAY : outcome === 'tie' ? STOP : '';
  const motion = path
    ? `<animateMotion dur="${outcome === 'tie' ? 1.4 : 2.4}s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".5 0 .9 .6" rotate="auto" path="${path}"/>`
    : '';
  const crashAt = outcome === 'pull' ? [835, 200] : outcome === 'stay' ? [845, 390] : null;
  const card = (key, title) => {
    const n = counts?.[key];
    return `<div class="tp-sign tp-sign-${key} ${outcome === key ? 'hit' : ''}">
      <div class="tp-sign-title">${title}</div>
      <div class="tp-sign-text">${esc(s.dilemma?.[key] || '')}</div>
      ${n != null ? `<div class="tp-sign-count"><b>${n}</b> ${key === 'pull' ? 'pulled' : 'did nothing'}</div><div class="tp-sign-names">${(names?.[key] || []).map(esc).join(', ')}</div>` : ''}
    </div>`;
  };
  return `<div class="tp-scene ${outcome ? `go go-${outcome}` : ''}">
    <svg viewBox="0 0 1200 560" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <linearGradient id="tp-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd3f0"/><stop offset="1" stop-color="#e9f5f7"/></linearGradient>
        <linearGradient id="tp-ties" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a35"/><stop offset="1" stop-color="#6a4426"/></linearGradient>
      </defs>
      <rect width="1200" height="560" fill="url(#tp-sky)"/>
      <circle cx="1080" cy="80" r="42" fill="#fff4b8"/>
      <g fill="#fff" opacity=".9"><ellipse cx="220" cy="90" rx="70" ry="22"/><ellipse cx="270" cy="76" rx="50" ry="22"/><ellipse cx="700" cy="60" rx="60" ry="18"/><ellipse cx="745" cy="50" rx="40" ry="18"/></g>
      <path d="M0 300 Q160 230 330 290 T700 270 T1200 250 V560 H0Z" fill="#8cc48a"/>
      <path d="M0 340 Q260 300 520 340 T1200 320 V560 H0Z" fill="#6fae6c"/>
      <rect y="380" width="1200" height="180" fill="#5d9c5a"/>
      ${rails(`M0 452 ${TO_SWITCH} C560 452 620 300 760 252 L1200 186`, 'pull')}
      ${rails('M0 452 L1200 452', 'stay')}
      <g class="tp-signposts"><rect x="1016" y="170" width="10" height="70" fill="#6a4426"/><rect x="1016" y="404" width="10" height="70" fill="#6a4426"/></g>
      ${lever(outcome === 'pull')}
      ${thinker}
      ${motion ? `<g>${tram}${motion}</g>` : `<g transform="translate(150 452)">${tram}</g>`}
    </svg>
    ${cards ? `${card('pull', 'Pull the lever: it hits')}${card('stay', 'Do nothing: it hits')}` : ''}
    <svg class="tp-fx" viewBox="0 0 1200 560" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      ${crashAt ? `<g class="tp-boom" transform="translate(${crashAt[0]} ${crashAt[1]})">
        <path d="M0 -60 L16 -22 L58 -36 L30 -4 L66 22 L22 22 L18 64 L0 30 L-20 62 L-22 22 L-64 24 L-30 -4 L-58 -38 L-16 -22Z" fill="#ffd34d" stroke="#d6453d" stroke-width="6"/>
        <text y="12" text-anchor="middle" font-size="30" font-weight="900" fill="#d6453d">BONK</text></g>` : ''}
      ${outcome === 'tie' ? '<g class="tp-boom" transform="translate(560 380)"><text text-anchor="middle" font-size="44" font-weight="900" fill="#d6453d">SCREECH!</text></g>' : ''}
    </svg>
  </div>`;
}

export const sceneCss = `
  .tp-scene { position: relative; width: 100%; max-width: min(1200px, 118vh); margin: 0 auto; aspect-ratio: 1200 / 560; border-radius: 22px; overflow: hidden;
    box-shadow: 0 8px 0 rgba(0,0,0,.18), 0 16px 40px rgba(0,0,0,.25); container-type: inline-size; }
  .tp-scene svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .tp-scene .tp-fx { z-index: 2; pointer-events: none; }
  .tp-scene:not(.go) .tp-tram { animation: tp-idle 1.6s ease-in-out infinite; }
  @keyframes tp-idle { 50% { transform: translateY(-2px); } }
  .tp-lever { transform-origin: 0 0; transform: rotate(-28deg); transition: transform .5s cubic-bezier(.3,1.6,.5,1); }
  .tp-lever.pulled { transform: rotate(28deg); }
  .go .tp-think { display: none; }
  .tp-boom { opacity: 0; animation: tp-boom .5s 2.2s ease-out forwards; transform-box: fill-box; transform-origin: center; }
  .go-tie .tp-boom { animation-delay: 1.1s; }
  @keyframes tp-boom { 0% { opacity: 0; scale: .3; } 70% { opacity: 1; scale: 1.15; } 100% { opacity: 1; scale: 1; } }
  .tp-sign { position: absolute; right: 2%; width: 27%; z-index: 0; background: #fbf3dc; color: var(--ink); border: 4px solid #8a5a35; border-radius: 14px; padding: .55rem .8rem;
    box-shadow: 0 5px 0 #6a4426; text-align: left; }
  .tp-sign { max-height: 43%; overflow: hidden; padding: 1.1cqw 1.4cqw; border-width: .35cqw; }
  .tp-sign-pull { top: 3%; }
  .tp-sign-stay { top: 52%; }
  .tp-sign-title { font: 800 max(.6rem, 1.35cqw) var(--body); color: #8a5a35; }
  .tp-sign-text { font: 800 max(.75rem, 2.35cqw)/1.12 var(--display); }
  .tp-sign-count { margin-top: .4cqw; font: 700 max(.65rem, 1.4cqw) var(--body); }
  .tp-sign-count b { font: 900 max(1rem, 2.6cqw) var(--display); }
  .tp-sign-names { font-size: max(.6rem, 1.1cqw); color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tp-sign.hit { animation: tp-shake .45s 2.3s; border-color: var(--red); box-shadow: 0 5px 0 #8c2a23; }
  @keyframes tp-shake { 25% { transform: translate(-6px, 2px) rotate(-1.5deg); } 50% { transform: translate(5px, -2px) rotate(1deg); } 75% { transform: translate(-3px, 1px); } }
  @media (prefers-reduced-motion: reduce) { .tp-scene *, .tp-scene { animation: none !important; transition: none !important; } .tp-boom { opacity: 1; } }
`;
