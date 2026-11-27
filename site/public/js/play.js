// Player (phone) page: join a room by code, then show the game's controller UI.
import {
  db, ref, get, set, update, push, onValue, onDisconnect, serverTimestamp,
  ensureUser, warnIfNotConfigured,
} from './firebase.js';
import { buildRoster } from './roster.js';
import { loadGame, escapeHtml } from './catalog.js';
import { wireTileInput, tileInputHtml } from './ui.js';
import { PEOPLE, spriteHtml } from './people.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const BOT = params.has('bot');
const SOLO = params.has('solo'); // your own controller inside the TV page (phone test mode)
let person = BOT ? '' : localStorage.getItem('tt-person') || '';

main().catch((err) => {
  console.error(err);
  showJoinForm(err.message);
});

async function main() {
  if (warnIfNotConfigured()) return;
  const user = await ensureUser();
  if (BOT) {
    await join(user, (params.get('code') || '').toUpperCase(), params.get('name') || 'Bot');
    (await import('./bot.js')).startBot();
    return;
  }

  // Rejoin automatically after a refresh in the same tab.
  let saved = null;
  try { saved = SOLO ? null : JSON.parse(localStorage.getItem('tt-room') || 'null'); } catch { /* none */ }
  if (saved && Date.now() - (saved.at || 0) > 12 * 3600 * 1000) saved = null;   // only rejoin games from today
  const urlCode = (params.get('code') || '').toUpperCase();
  if (saved && (!urlCode || urlCode === saved.code)) {
    try {
      return await join(user, saved.code, saved.name);
    } catch {
      localStorage.removeItem('tt-room');
    }
  }
  showJoinForm();
}

function showJoinForm(error = '') {
  $('#app').innerHTML = `
    <form id="join" class="sheet join-form">
      <h1>Join the game</h1>
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}
      <label>Room code</label>
      <div id="tiles">${tileInputHtml()}</div>
      ${navigator.mediaDevices?.getUserMedia ? '<button type="button" class="btn btn-ghost qr-btn" id="scan-qr">📷 Scan the code on the TV</button>' : ''}
      <label>Who are you?</label>
      <div class="who-grid" id="who">
        ${PEOPLE.map((p) => `<button type="button" data-person="${p}" aria-pressed="${person === p}">${p}</button>`).join('')}
        <button type="button" data-person="" aria-pressed="${!person}">Guest</button>
      </div>
      <label for="name">Name on the TV</label>
      <div class="who-me"><span id="me-sprite">${spriteHtml(person, 'waving', 56)}</span>
      <input id="name" class="name-input" maxlength="16" required autocomplete="nickname"
             value="${escapeHtml(localStorage.getItem('tt-name') || person || '')}" placeholder="What should we call you?"></div>
      <button class="btn btn-primary btn-big" id="join-btn">Join</button>
    </form>`;
  const getCode = wireTileInput($('#tiles'), (params.get('code') || '').toUpperCase());
  $('#scan-qr')?.addEventListener('click', async () => {
    const { scanForCode } = await import('./qr-scan.js');
    const code = await scanForCode();
    if (!code) return;
    [...$('#tiles').querySelectorAll('input')].forEach((input, i) => { input.value = code[i] || ''; });
    $('#name').focus();
  });
  const first = [...$('#tiles').querySelectorAll('input')].find((i) => !i.value);
  (first || $('#name')).focus();
  $('#who').onclick = (e) => {
    const btn = e.target.closest('[data-person]');
    if (!btn) return;
    const prev = person;
    person = btn.dataset.person;
    localStorage.setItem('tt-person', person);
    $('#who').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    const nameEl = $('#name');
    if (!nameEl.value.trim() || nameEl.value.trim() === prev) nameEl.value = person;
    $('#me-sprite').innerHTML = spriteHtml(person, 'waving', 56);
  };
  $('#join').onsubmit = async (e) => {
    e.preventDefault();
    const code = getCode();
    const name = $('#name').value.trim();
    if (code.length !== 4) return showJoinForm('Room codes are 4 letters. Check the TV.');
    if (!name) return;
    localStorage.setItem('tt-name', name);
    $('#join-btn').disabled = true;
    try {
      await join(await ensureUser(), code, name);
    } catch (err) {
      showJoinForm(err.message);
    }
  };
}

async function join(user, code, name) {
  const roomPath = `rooms/${code}`;
  const meta = (await get(ref(db, `${roomPath}/meta`))).val();
  if (!meta || meta.status === 'closed') throw new Error(`There's no game with code ${code} right now. Check the TV and try again.`);

  const game = await loadGame(meta.gameId);
  const meRef = ref(db, `${roomPath}/players/${user.uid}`);
  const existing = (await get(meRef)).val();
  if (existing) await update(meRef, { name, person: person || '', connected: true });
  else await set(meRef, { name, person: person || '', connected: true, joinedAt: serverTimestamp() });
  onDisconnect(ref(db, `${roomPath}/players/${user.uid}/connected`)).set(false);
  if (!BOT && !SOLO) localStorage.setItem('tt-room', JSON.stringify({ code, name, at: Date.now() }));

  let roomMeta = meta;
  let players = [];
  let state = {};
  let priv = {};
  // A fast lane for games that stream lots of small updates (Tetris boards): straight to the TV, skipping the game logic.
  const setLive = (data) => set(ref(db, `${roomPath}/live/${user.uid}`), data).catch(() => {});
  const mediaCache = {};
  const media = (id) => {
    if (id in mediaCache) return mediaCache[id];
    mediaCache[id] = null;
    get(ref(db, `${roomPath}/media/${id}`)).then((snap) => { mediaCache[id] = snap.val(); render(); });
    return null;
  };
  let removed = false;

  const sendAction = (type, payload = {}) =>
    push(ref(db, `${roomPath}/actions`), { uid: user.uid, type, payload, ts: serverTimestamp() });

  $('#app').innerHTML = `
    <div class="phone-bar"><span>${escapeHtml(name)}</span><span>${escapeHtml(game.config.name)} <span class="room">${code}</span></span></div>
    <div id="notice" class="banner" hidden></div>
    <div id="controller" class="controller"></div>
    <a class="suggest-link" href="suggest.html?game=${encodeURIComponent(meta.gameId)}" target="_blank">Suggest something for ${escapeHtml(game.config.name)}</a>`;

  onValue(ref(db, `${roomPath}/meta`), (snap) => {
    roomMeta = snap.val() || { status: 'closed' };
    render();
  });
  // If the TV linked this phone to an old seat (rejoining), play as that seat.
  let rawPlayers = {}, aliases = {}, me = user.uid, privOff = null;
  const watchPrivate = () => {
    privOff?.();
    privOff = onValue(ref(db, `${roomPath}/private/${me}`), (snap) => {
      const v = snap.val();
      priv = v ? JSON.parse(v.json) : {};
      render();
    });
  };
  const applyRoster = () => {
    players = buildRoster(rawPlayers, aliases);
    removed = !rawPlayers[user.uid];
    const seat = aliases[user.uid] || user.uid;
    if (seat !== me) { me = seat; watchPrivate(); }
    render();
  };
  onValue(ref(db, `${roomPath}/aliases`), (snap) => { aliases = snap.val() || {}; applyRoster(); });
  onValue(ref(db, `${roomPath}/players`), (snap) => { rawPlayers = snap.val() || {}; applyRoster(); });
  onValue(ref(db, `${roomPath}/state`), (snap) => {
    const v = snap.val();
    state = v ? JSON.parse(v.json) : {};
    render();
  });
  watchPrivate();

  function render() {
    const el = $('#controller');
    const notice = $('#notice');
    if (!el) return;

    if (roomMeta.status === 'closed' || removed) {
      localStorage.removeItem('tt-room');
      el.innerHTML = `<div class="sheet center"><h2>${removed ? 'The host removed you from this game.' : 'The host ended the game.'}</h2>
        <a class="btn btn-primary btn-big" href="play.html">Join another game</a></div>`;
      notice.hidden = true;
      return;
    }

    notice.hidden = roomMeta.hostConnected !== false;
    notice.textContent = 'The host screen disconnected. Waiting for it to come back…';

    if (roomMeta.status === 'lobby') {
      const mine = players.find((p) => p.id === me);
      el.innerHTML = `<div class="waiting-room">
        <h2>You're in!</h2>
        <p class="muted">${mine?.isVip ? "You're the VIP, so you can start rounds from your phone. " : ''}Waiting for the host to start.</p>
        <ul class="player-list">${players.map((p) => `<li>${escapeHtml(p.name)}${p.isVip ? '<span class="vip">VIP</span>' : ''}</li>`).join('')}</ul>
      </div>`;
      return;
    }
    game.renderPlayer(el, { state, priv, me, players, sendAction, media, setLive });
  }
}
