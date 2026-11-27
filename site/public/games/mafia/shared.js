import { injectStyles, esc, nameOf } from '../../js/ui.js';
import { ROLE } from './engine.js';

// Flip to true once the painted art is in games/mafia/art/ (see ART-LIST.txt).
export const ART_READY = true;
export const art = (name) => (ART_READY ? `url(${new URL(`./art/${name}.webp`, import.meta.url).href})` : 'none');

export const ROLE_BLURB = {
  mafia: 'Each night, agree with your team on someone to eliminate. By day, blend in.',
  doctor: 'Each night, protect one person (it can be you), but not the same person two nights in a row.',
  detective: 'Each night, investigate one person to learn if they are Mafia.',
  villager: 'You have no night power. Listen closely, argue well and vote out the Mafia.',
};

export function mafiaStyles() {
  injectStyles('mafia', `
    .mf { --night: #141b2e; --day: #e9d9a8; }
    .mf-stage { border-radius: 18px; padding: 1.5rem; margin-bottom: 1rem; background-size: cover; background-position: center; text-align: center; min-height: 14rem;
      display: flex; flex-direction: column; justify-content: center; align-items: center; gap: .4rem; }
    .mf-stage.night { background-color: var(--night); background-image: linear-gradient(rgba(10,14,30,.55), rgba(10,14,30,.75)), ${art('town-night')}; color: #e8ecff; }
    .mf-stage.day { background-color: #6b4f2a; background-image: linear-gradient(rgba(60,40,10,.35), rgba(40,25,5,.65)), ${art('town-day')}; color: #fff4dc; }
    .mf-stage.death { background-color: #3a1512; background-image: linear-gradient(rgba(30,8,6,.45), rgba(30,8,6,.8)), ${art('morning-death')}; color: #ffe6e1; }
    .mf-stage.saved { background-color: #173b2c; background-image: linear-gradient(rgba(10,30,20,.4), rgba(10,30,20,.75)), ${art('morning-saved')}; color: #e5ffef; }
    .mf-stage.town-wins { background-color: #2c5f8a; background-image: linear-gradient(rgba(10,30,50,.3), rgba(10,30,50,.7)), ${art('town-wins')}; color: #fff; }
    .mf-stage.mafia-wins { background-color: #2a2724; background-image: linear-gradient(rgba(0,0,0,.3), rgba(0,0,0,.75)), ${art('mafia-wins')}; color: #fff; }
    .mf-stage h2 { font: 800 clamp(2rem, 4.5vw, 3.4rem)/1.08 var(--display); margin: 0; text-shadow: 0 2px 8px rgba(0,0,0,.6); }
    .mf-stage p { font-size: 1.25rem; margin: 0; text-shadow: 0 1px 6px rgba(0,0,0,.7); }
    .mf-people { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: .6rem; }
    .mf-person { border-radius: 12px; padding: .7rem .8rem; background: var(--card); color: var(--ink); box-shadow: 0 4px 0 var(--card-edge); position: relative; }
    .mf-person .n { font: 800 1.15rem var(--display); }
    .mf-person .s { font-size: .85rem; color: var(--ink-soft); }
    .mf-person.dead { background: #4a4540; color: #cfc6b4; box-shadow: none; }
    .mf-person.dead .n { text-decoration: line-through; }
    .mf-person.done { outline: 3px solid var(--gold); }
    .mf-person .votes { display: flex; flex-wrap: wrap; gap: .25rem; margin-top: .35rem; }
    .mf-chip { font-size: .75rem; font-weight: 700; padding: 1px 7px; border-radius: 99px; background: #d6453d; color: #fff; }
    .mf-chip.skip { background: #6b6355; }
    .mf-chip.lean { background: transparent; color: #d6453d; box-shadow: inset 0 0 0 1.5px #d6453d; opacity: .8; }
    .mf-counts { display: flex; flex-wrap: wrap; justify-content: center; gap: .5rem; margin: .3rem 0 .5rem; }
    .mf-count { padding: .3rem .8rem; border-radius: 99px; background: rgba(255,255,255,.14); font: 700 clamp(1rem, 2.6vh, 1.3rem) var(--body); }
    .mf-count b { font: 900 1.25em var(--display); margin-right: .15rem; }
    .mf-count.mafia { background: rgba(214,69,61,.85); color: #fff; }
    /* Mafia's quiet signals: a faint mark on teammates, a tiny dot per teammate pick. Easy to miss over a shoulder. */
    .mf-mate { display: inline-block; width: 5px; height: 5px; margin-left: .45rem; border-radius: 1px; transform: rotate(45deg); background: currentColor; opacity: .28; vertical-align: middle; }
    .mf-dot { display: inline-block; width: 5px; height: 5px; margin-left: .3rem; border-radius: 50%; background: currentColor; opacity: .3; vertical-align: middle; }
    .mf-lock { width: 100%; margin-top: .6rem; }
    .mf-peek { touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
    .mf-peekbox .mf-peek-card:not([hidden]) + .mf-cover { margin-top: .5rem; }
    .mf-role { border-radius: 16px; padding: 1rem; text-align: center; color: #fff; background-size: cover; background-position: center top; min-height: 15rem;
      display: flex; flex-direction: column; justify-content: flex-end; gap: .25rem; text-shadow: 0 1px 4px rgba(0,0,0,.8); }
    .mf-role h2 { font-size: 2.2rem; margin: 0; }
    .mf-role.mafia { background-color: #2a2724; background-image: linear-gradient(transparent 30%, rgba(0,0,0,.9) 75%), ${art('role-mafia')}; }
    .mf-role.villager { background-color: #6b4f2a; background-image: linear-gradient(transparent 30%, rgba(50,30,10,.92) 75%), ${art('role-villager')}; }
    .mf-role.doctor { background-color: #2c5f8a; background-image: linear-gradient(transparent 30%, rgba(15,40,70,.92) 75%), ${art('role-doctor')}; }
    .mf-role.detective { background-color: #3d3a5c; background-image: linear-gradient(transparent 30%, rgba(25,22,50,.92) 75%), ${art('role-detective')}; }
    .mf-cover { border-radius: 16px; padding: 1rem; text-align: center; background-color: #2a2724; background-image: linear-gradient(rgba(0,0,0,.35), rgba(0,0,0,.6)), ${art('card-back')}; background-size: cover; min-height: 6rem; display: grid; place-items: center; }
    .mf-pick.picked { border-color: var(--gold); }
    .mf-role.narrator { min-height: 0; background: linear-gradient(135deg, #3a2f5c, #1d1830); }
    .mf-script { text-align: left; padding-left: 1.1rem; line-height: 1.6; }
    .mf-note { background: var(--felt-deep); border-radius: 12px; padding: .6rem .8rem; margin-top: .75rem; font-size: .95rem; }
  `);
}

/** Grid of everyone, showing who's dead (with their revealed role) and optionally day votes. */
export function peopleHtml(s, players, { votes = false, done = false } = {}) {
  const votedFor = {};
  if (votes) {
    for (const [voter, t] of Object.entries(s.votes || {})) (votedFor[t] ||= []).push({ voter, locked: true });
    for (const [voter, t] of Object.entries(s.leans || {})) (votedFor[t] ||= []).push({ voter, locked: false });
  }
  return `<div class="mf-people">${s.seats.map((id) => {
    const dead = s.dead.includes(id);
    const role = s.reveals?.[id] || (s.roles ? s.roles[id] : '');
    const voters = votedFor[id] || [];
    const myVote = votes ? s.votes?.[id] || s.leans?.[id] : '';
    const isLocked = votes && s.votes?.[id];
    return `<div class="mf-person ${dead ? 'dead' : ''} ${done && s.nightDone?.includes(id) ? 'done' : ''}">
      <div class="n">${esc(nameOf(id, players))}</div>
      <div class="s">${dead ? `Dead · ${ROLE[role] || ''}` : role && s.phase === 'over' ? ROLE[role] : myVote ? `${isLocked ? 'Locked:' : 'Leaning:'} ${myVote === 'skip' ? 'skip' : esc(nameOf(myVote, players))}` : ''}</div>
      ${voters.length ? `<div class="votes">${voters.map((v) => `<span class="mf-chip ${v.locked ? '' : 'lean'}">${esc(nameOf(v.voter, players))}${v.locked ? ' 🔒' : ''}</span>`).join('')}</div>` : ''}
    </div>`;
  }).join('')}</div>`;
}
