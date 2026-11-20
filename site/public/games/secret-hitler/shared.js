import { injectStyles, esc, nameOf } from '../../js/ui.js';
import { powerFor } from './engine.js';

/** Painted art (see art/ folder). */
export const art = (name) => new URL(`./art/${name}.webp`, import.meta.url).href;

export const POWER_TEXT = {
  peek: 'President peeks at the top 3 policies',
  investigate: 'President investigates a player’s party',
  'special-election': 'President picks the next President',
  execute: 'President executes a player',
};
const powerIcon = (p) => `<img class="ico" src="${art(`power-${p}`)}" alt="">`;

export function shStyles() {
  injectStyles('secret-hitler', `
    .sh-tracks { display: grid; gap: .8rem; margin-bottom: 1rem; }
    .sh-track { display: grid; gap: .45rem; padding: .7rem; border-radius: 14px; }
    .sh-track.lib { background: linear-gradient(rgba(44,95,138,.82), rgba(44,95,138,.82)), url(${art('track-liberal')}) center / cover; grid-template-columns: repeat(5, 1fr); }
    .sh-track.fas { background: linear-gradient(rgba(143,47,38,.82), rgba(143,47,38,.82)), url(${art('track-fascist')}) center / cover; grid-template-columns: repeat(6, 1fr); }
    .sh-slot { aspect-ratio: 3 / 4; border-radius: 8px; border: 2px dashed rgba(255,255,255,.35); display: grid; place-items: center; text-align: center; font-size: .75rem; padding: .2rem; color: rgba(255,255,255,.8); }
    .sh-slot.on { border: 2px solid rgba(255,255,255,.8); background-size: cover; background-position: center; box-shadow: 0 3px 0 rgba(0,0,0,.35); }
    .sh-slot.on.lib-card { background-image: url(${art('policy-L')}); }
    .sh-slot.on.fas-card { background-image: url(${art('policy-F')}); }
    .sh-slot .ico { width: 70%; aspect-ratio: 1; border-radius: 50%; display: block; margin: 0 auto .25rem; object-fit: cover; }
    .sh-tracker { display: flex; gap: .5rem; align-items: center; justify-content: center; font-weight: 700; }
    .sh-dot { width: 1.1rem; height: 1.1rem; border-radius: 50%; border: 2px solid var(--cream-text); }
    .sh-dot.on { background: var(--gold); border-color: var(--gold); }
    .sh-people { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; margin: 1rem 0; }
    .sh-person { padding: .45rem .9rem; border-radius: 99px; background: var(--felt-deep); font-weight: 700; display: inline-flex; gap: .4rem; align-items: center; }
    .sh-person.dead { opacity: .4; text-decoration: line-through; }
    .sh-person .badge { font-size: .75rem; background: var(--gold); color: var(--ink); padding: 1px 7px; border-radius: 99px; }
    .sh-person.ja { background: #2e8b57; } .sh-person.nein { background: #8f2f26; }
    .sh-person.in { outline: 2px solid var(--gold); }
    .sh-layout { display: grid; grid-template-columns: 1.2fr 1fr; gap: 2rem; align-items: start; }
    .sh-role { border-radius: 16px; padding: 10rem 1.2rem 1.2rem; text-align: center; color: #fff; background-size: cover; background-position: center top; text-shadow: 0 1px 4px rgba(0,0,0,.7); }
    .sh-role.liberal { background-image: linear-gradient(to bottom, transparent 35%, rgba(20,50,80,.95) 70%), url(${art('role-liberal')}); background-color: #2c5f8a; }
    .sh-role.fascist { background-image: linear-gradient(to bottom, transparent 35%, rgba(90,20,15,.95) 70%), url(${art('role-fascist')}); background-color: #8f2f26; }
    .sh-role.hitler { background-image: linear-gradient(to bottom, transparent 35%, rgba(60,10,8,.97) 70%), url(${art('role-hitler')}); background-color: #8f2f26; }
    .sh-role h2 { font-size: 2.2rem; margin: .2rem 0; }
    .sh-cover { background: var(--felt-deep); border: 2px dashed var(--felt-line); border-radius: 16px; padding: 1rem; text-align: center; }
    .sh-cards { display: flex; gap: .6rem; justify-content: center; margin: 1rem 0; }
    .sh-policy { width: 5.8rem; aspect-ratio: 3 / 4; border-radius: 10px; border: 2px solid rgba(255,255,255,.8); font: 800 1rem var(--display); color: #fff; cursor: pointer; box-shadow: 0 4px 0 rgba(0,0,0,.35);
      background-size: cover; background-position: center; display: flex; align-items: flex-end; justify-content: center; padding-bottom: .4rem; text-shadow: 0 1px 4px #000; }
    .sh-policy.L { background-image: linear-gradient(transparent 55%, rgba(20,50,80,.9)), url(${art('policy-L')}); background-color: #2c5f8a; }
    .sh-policy.F { background-image: linear-gradient(transparent 55%, rgba(90,20,15,.9)), url(${art('policy-F')}); background-color: #8f2f26; }
    .sh-vote { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem; }
    .sh-vote button { padding: 1.4rem; font: 800 1.8rem var(--display); border-radius: 14px; border: 3px solid transparent; cursor: pointer; }
    .sh-vote .ja { background: #e9f4ec; color: #1d5c39; } .sh-vote .nein { background: #f6e3df; color: #7a2018; }
    .sh-vote button.picked { border-color: var(--gold); }
    .sh-ballots { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: .7rem; margin: 1rem 0; perspective: 800px; }
    .sh-ballot { position: relative; aspect-ratio: 3 / 4; transform-style: preserve-3d; transition: transform .6s; }
    .sh-ballot.flipped { transform: rotateY(180deg); }
    .sh-ballot .face { position: absolute; inset: 0; border-radius: 12px; backface-visibility: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .3rem; padding: .4rem; text-align: center; box-shadow: 0 5px 0 rgba(0,0,0,.3); }
    .sh-ballot .front { background: var(--felt-deep); border: 2px dashed var(--felt-line); color: var(--cream-text); }
    .sh-ballot.voted .front { background: var(--card); border: 0; color: var(--ink); }
    .sh-ballot .back { transform: rotateY(180deg); color: #fff; }
    .sh-ballot .back.ja { background: #2e8b57; } .sh-ballot .back.nein { background: #8f2f26; }
    .sh-ballot .who { font: 800 1.05rem var(--display); }
    .sh-ballot .what { font: 800 2rem var(--display); }
    .sh-ballot .small { font-size: .8rem; opacity: .8; }
    .sh-ballot.dead { opacity: .3; }
    .sh-last { background: var(--felt-deep); border-radius: 12px; padding: .7rem .9rem; margin-top: 1rem; }
    .sh-last .chips { display: flex; flex-wrap: wrap; gap: .35rem; margin-top: .4rem; }
    .sh-last .chip { padding: .2rem .6rem; border-radius: 99px; font-weight: 700; font-size: .9rem; }
    .sh-last .chip.ja { background: #2e8b57; } .sh-last .chip.nein { background: #8f2f26; }
    @media (prefers-reduced-motion: reduce) { .sh-ballot { transition: none; } }
    @media (max-width: 900px) { .sh-layout { grid-template-columns: 1fr; } }
  `);
}

export function tracksHtml(s) {
  const n = s.seats.length;
  const lib = Array.from({ length: 5 }, (_, i) => `<div class="sh-slot ${i < s.liberal ? 'on lib-card' : ''}">${i < s.liberal ? '' : i === 4 ? 'Liberals win' : ''}</div>`).join('');
  const fas = Array.from({ length: 6 }, (_, i) => {
    const on = i < s.fascist;
    const power = powerFor(n, i + 1);
    const label = i === 5 ? 'Fascists win' : power ? `${powerIcon(power)}${POWER_TEXT[power].replace('President ', '')}` : '';
    return `<div class="sh-slot ${on ? 'on fas-card' : ''}">${on ? '' : label}</div>`;
  }).join('');
  return `<div class="sh-tracks"><div class="sh-track lib">${lib}</div><div class="sh-track fas">${fas}</div>
    <div class="sh-tracker">Failed elections ${[0, 1, 2].map((i) => `<span class="sh-dot ${i < s.tracker ? 'on' : ''}"></span>`).join('')}
    <span class="muted" style="margin-left:1rem">Deck ${s.deckCount} · Discard ${s.discardCount}</span></div></div>`;
}

export function peopleHtml(s, players, { showVotes = false } = {}) {
  return `<div class="sh-people">${s.seats.map((id) => {
    const dead = s.dead.includes(id);
    const badges = [id === s.president ? 'President' : '', id === s.chancellor ? 'Chancellor' : ''].filter(Boolean)
      .map((b) => `<span class="badge">${b}</span>`).join('');
    const vote = showVotes && s.votes ? s.votes[id] : '';
    const role = s.roles ? ` (${s.roles[id]})` : '';
    const waiting = s.phase === 'vote' && s.voted.includes(id) ? 'in' : '';
    return `<span class="sh-person ${dead ? 'dead' : ''} ${vote} ${waiting}">${esc(nameOf(id, players))}${role}${vote ? ` · ${vote === 'ja' ? 'Ja!' : 'Nein'}` : ''}${badges}</span>`;
  }).join('')}</div>`;
}

/** One card per living player: blank -> "Voted" the moment they vote -> flips to Ja!/Nein when everyone has. */
export function ballotsHtml(s, players) {
  const revealed = s.phase === 'vote-result';
  return `<div class="sh-ballots">${s.seats.map((id) => {
    const dead = s.dead.includes(id);
    const voted = s.voted.includes(id);
    const vote = revealed && s.votes ? s.votes[id] : '';
    return `<div class="sh-ballot ${dead ? 'dead' : ''} ${voted ? 'voted' : ''} ${vote ? 'flipped' : ''}">
      <div class="face front"><div class="who">${esc(nameOf(id, players))}</div><div class="small">${dead ? 'Dead' : voted ? 'Voted' : 'Thinking…'}</div></div>
      <div class="face back ${vote}"><div class="who">${esc(nameOf(id, players))}</div><div class="what">${vote === 'ja' ? 'Ja!' : 'Nein'}</div></div>
    </div>`;
  }).join('')}</div>`;
}

/** The most recent vote, kept on screen so everyone can refer back to it. */
export function lastVoteHtml(s, players) {
  const v = s.lastVote;
  if (!v) return '';
  const tally = (x) => Object.values(v.votes).filter((y) => y === x).length;
  return `<div class="sh-last"><strong>Last vote:</strong> ${esc(nameOf(v.president, players))} + ${esc(nameOf(v.chancellor, players))}
    ${v.result === 'passed' ? 'passed' : 'failed'} (${tally('ja')} Ja, ${tally('nein')} Nein)
    <div class="chips">${Object.entries(v.votes).map(([id, x]) => `<span class="chip ${x}">${esc(nameOf(id, players))}: ${x === 'ja' ? 'Ja!' : 'Nein'}</span>`).join('')}</div></div>`;
}
