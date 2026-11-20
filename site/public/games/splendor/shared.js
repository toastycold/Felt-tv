// Card, gem and noble pieces used by both the TV and the phones.
import { injectStyles } from '../../js/ui.js';
import { COLORS } from './cards.js';

/** Painted art for cards, nobles and gems (see art/ folder). */
export const art = (name) => new URL(`./art/${name}.webp`, import.meta.url).href;
const nobleArt = (noble) => {
  const [kind, i] = noble.id.replace('n', '').split('-');
  return art(`noble-${kind === '4' ? Number(i) : 5 + Number(i)}`);
};

export const GEM = {
  white: { fill: '#f5f5f0', text: '#22201b', label: 'Diamond' },
  blue: { fill: '#2f6fb5', text: '#fff', label: 'Sapphire' },
  green: { fill: '#2e8b57', text: '#fff', label: 'Emerald' },
  red: { fill: '#d6453d', text: '#fff', label: 'Ruby' },
  black: { fill: '#2a2724', text: '#fff', label: 'Onyx' },
  gold: { fill: '#f2c230', text: '#22201b', label: 'Gold' },
};

export function gem(color, count = '', extra = '') {
  if (color === 'white') extra += ' w';
  // Big tokens get the painted gem; tiny cost pips stay flat colors so they're easy to read.
  const painted = !/\b(sm|bonus)\b/.test(extra);
  const bg = painted ? `;background-image:url(${art(`gem-${color}`)})` : '';
  return `<span class="sp-gem ${extra} ${painted ? 'painted' : ''}" style="--g:${GEM[color].fill};--gt:${GEM[color].text}${bg}" title="${GEM[color].label}">${count}</span>`;
}

export function cardHtml(card, { attrs = '', cls = '' } = {}) {
  const cost = COLORS.filter((c) => card.cost[c]).map((c) => gem(c, card.cost[c], 'sm')).join('');
  const band = card.color === 'white' ? '#dcd6c6' : GEM[card.color].fill;
  return `<div class="sp-card ${cls}" style="--g:${band};background-image:url(${art(`t${card.tier}-${card.color}`)})" ${attrs}>
    <div class="sp-card-top"><span class="sp-pts">${card.points || ''}</span>${gem(card.color, '', 'bonus')}</div>
    <div class="sp-cost">${cost}</div>
  </div>`;
}

export function deckHtml(tier, count, attrs = '') {
  return `<div class="sp-card sp-deck t${tier}" style="background-image:url(${art(`back-${tier}`)})" ${attrs}><span>${'I'.repeat(tier)}</span><small>${count} left</small></div>`;
}

export function nobleHtml(noble) {
  return `<div class="sp-noble" style="background-image:url(${nobleArt(noble)})"><span class="sp-pts">3</span><div class="sp-need">${Object.entries(noble.need).map(([c, n]) => `<span class="sp-square" style="--g:${GEM[c].fill};--gt:${GEM[c].text}">${n}</span>`).join('')}</div></div>`;
}

export function splendorStyles() {
  injectStyles('splendor', `
    .sp-gem {
      display: inline-grid; place-items: center; width: 2.1rem; height: 2.1rem; border-radius: 50%;
      background: var(--g); color: var(--gt); font: 800 1rem var(--display); box-shadow: inset 0 -3px 0 rgba(0,0,0,.25), 0 0 0 2px rgba(255,255,255,.35);
    }
    .sp-gem.w { box-shadow: inset 0 0 0 2px #a99f86, inset 0 -3px 0 rgba(0,0,0,.15); }
    .sp-gem.sm { width: 1.45rem; height: 1.45rem; font-size: .8rem; }
    .sp-gem.bonus { width: 1.6rem; height: 1.6rem; border-radius: 6px; transform: rotate(45deg) scale(.8); }
    .sp-card {
      position: relative; aspect-ratio: 4 / 5; border-radius: 10px; background: var(--card); color: var(--ink);
      box-shadow: 0 4px 0 var(--card-edge); display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;
      border: 3px solid transparent; background-size: cover; background-position: center;
    }
    .sp-card-top { display: flex; justify-content: space-between; align-items: center; padding: .3rem .45rem;
      background: linear-gradient(to bottom, color-mix(in srgb, var(--g) 92%, transparent), color-mix(in srgb, var(--g) 70%, transparent)); }
    .sp-card .sp-cost { background: linear-gradient(to top, rgba(247,240,220,.92), rgba(247,240,220,0)); padding-top: 1.2rem; }
    .sp-gem.painted { background-size: 160%; background-position: center; color: #fff; text-shadow: 0 1px 3px #000, 0 0 6px #000; }
    .sp-pts { font: 800 1.5rem/1 var(--display); color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,.6); min-height: 1.5rem; }
    .sp-cost { display: flex; flex-direction: column-reverse; align-items: flex-start; gap: .2rem; padding: .35rem; }
    .sp-deck { justify-content: center; align-items: center; background-color: var(--felt-deep); background-size: cover; background-position: center; color: #fff; box-shadow: 0 4px 0 #0e2a1f; border: 2px solid #d9b85c; text-shadow: 0 1px 4px #000, 0 0 10px #000; }
    .sp-deck span { font: 800 1.8rem var(--display); letter-spacing: .1em; }
    .sp-deck small { font-size: .75rem; font-weight: 700; }
    .sp-noble { background: #e9dcb8 center / cover; color: var(--ink); border-radius: 10px; padding: .4rem; aspect-ratio: 1; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 0 var(--card-edge); border: 3px solid #d9b85c; }
    .sp-noble .sp-pts { color: #fff; }
    .sp-need { display: flex; flex-direction: column; gap: .15rem; }
    .sp-square { display: inline-grid; place-items: center; width: 1.4rem; height: 1.4rem; border-radius: 4px; background: var(--g); color: var(--gt); font: 800 .8rem var(--display); }

    /* TV layout */
    .sp-table { display: grid; grid-template-columns: 1fr 230px; gap: 1.5rem; align-items: start; }
    .sp-nobles { display: grid; grid-template-columns: repeat(5, 78px); gap: .6rem; margin-bottom: .8rem; }
    .sp-row { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .6rem; margin-bottom: .6rem; max-width: 600px; }
    .sp-table .sp-cost { flex-direction: row; flex-wrap: wrap; gap: .25rem; }
    .sp-bank { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .sp-bank .sp-gem { width: 2.8rem; height: 2.8rem; font-size: 1.2rem; }
    .sp-players { display: flex; flex-direction: column; gap: .6rem; }
    .sp-player { background: var(--felt-deep); border-radius: 12px; padding: .7rem .8rem; border: 3px solid transparent; }
    .sp-player.now { border-color: var(--gold); }
    .sp-player h4 { margin: 0 0 .4rem; display: flex; justify-content: space-between; font: 800 1.1rem var(--display); }
    .sp-line { display: flex; gap: .25rem; flex-wrap: wrap; margin-top: .25rem; align-items: center; }
    .sp-line .label { font-size: .75rem; opacity: .7; width: 3.4rem; }
    .sp-log { font-size: .9rem; opacity: .8; list-style: none; padding: 0; margin: .75rem 0 0; }
    .sp-banner { background: var(--gold); color: var(--ink); border-radius: 12px; padding: .5rem 1rem; font-weight: 700; margin-bottom: .75rem; }

    /* Phone */
    .sp-phone .sp-card { aspect-ratio: 5 / 7; }
    .sp-phone .sp-row { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .3rem; margin-bottom: .35rem; }
    .sp-phone .sp-card { border-radius: 7px; box-shadow: 0 2px 0 var(--card-edge); }
    .sp-phone .sp-pts { font-size: 1rem; min-height: 1rem; }
    .sp-phone .sp-card-top { padding: .15rem .25rem; }
    .sp-phone .sp-gem.sm { width: 1.05rem; height: 1.05rem; font-size: .62rem; box-shadow: none; }
    .sp-phone .sp-gem.bonus { width: 1.1rem; height: 1.1rem; }
    .sp-phone .sp-gem.sm.w { box-shadow: inset 0 0 0 1.5px #a99f86; }
    .sp-phone .sp-cost { padding: .2rem; gap: .12rem; flex-direction: row; flex-wrap: wrap; align-content: flex-end; }
    .sp-phone .sp-deck span { font-size: 1rem; }
    .sp-phone .sp-deck small { font-size: .55rem; }
    .sp-card.selected { border-color: var(--gold); transform: translateY(-3px); }
    .sp-card.can-buy { box-shadow: 0 2px 0 var(--card-edge), 0 0 0 2px #8be38b; }
    .sp-me { background: var(--felt-deep); border-radius: 12px; padding: .6rem .7rem; margin-bottom: .75rem; }
    .sp-me h3 { display: flex; justify-content: space-between; margin: 0 0 .3rem; font-size: 1.2rem; }
    .sp-picker { display: flex; justify-content: space-between; gap: .3rem; margin: .5rem 0; }
    .sp-picker button { position: relative; background: none; border: 0; padding: 0; cursor: pointer; }
    .sp-picker .sp-gem { width: 2.7rem; height: 2.7rem; font-size: 1.1rem; }
    .sp-picker .sel { position: absolute; top: -6px; right: -6px; background: var(--gold); color: var(--ink); border-radius: 99px; font: 800 .75rem var(--display); padding: 1px 6px; }
    .sp-picker button:disabled { opacity: .35; }
    .sp-sheet { background: var(--card); color: var(--ink); border-radius: 14px; padding: .8rem; margin: .5rem 0; display: grid; grid-template-columns: 84px 1fr; gap: .8rem; align-items: center; }
    .sp-sheet .btns { display: flex; flex-direction: column; gap: .4rem; }
    .sp-sheet .sp-card { aspect-ratio: auto; min-height: 7.5rem; }
    .sp-sheet .btn-ghost { color: var(--ink); border-color: var(--ink-soft); }
    .sp-sheet .link { color: var(--ink); }
    .sp-err { background: var(--red); color: #fff; border-radius: 10px; padding: .5rem .8rem; font-weight: 700; margin: .5rem 0; }
    .sp-section { font: 700 .85rem var(--body); opacity: .75; margin: .6rem 0 .3rem; }
    @media (max-width: 900px) { .sp-table { grid-template-columns: 1fr; } }
  `);
}
