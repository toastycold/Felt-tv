// Host (TV) page: creates a room, shows the code + QR, runs the game engine.
import {
  db, ref, get, set, update, remove, onValue, onChildAdded, onDisconnect, serverTimestamp,
  ensureUser, warnIfNotConfigured,
} from './firebase.js';
import { loadCatalog, loadGame, escapeHtml } from './catalog.js';
import { groupApproved } from './suggestions.js';
import { spriteHtml, castHtml } from './people.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const CODE_LETTERS = 'BCDFGHJKLMNPQRSTVWXZ'; // no vowels = no accidental words

main().catch((err) => {
  console.error(err);
  $('#app').innerHTML = `<div class="sheet"><h2>Couldn't set up the room</h2><p>${escapeHtml(err.message)}</p><a class="btn btn-primary" href="index.html">Back to games</a></div>`;
});

/**
 * TV remotes: put the cursor on the yellow (main) button so pressing OK does the obvious thing.
 * Leaves it alone if someone has already moved to another button on the screen.
 */
function focusMainButton() {
  const board = document.querySelector('#board');
  if (!board || document.querySelector('.end-ask')) return;
  const active = document.activeElement;
  if (active && active !== document.body && document.body.contains(active) && (board.contains(active) || active.id === 'end')) return;
  const main = [...board.querySelectorAll('.btn-primary:not(:disabled), button.btn-primary')].find((b) => b.offsetParent && !b.disabled);
  main?.focus({ preventScroll: true });
}

async function main() {
  if (warnIfNotConfigured()) return;
  const user = await ensureUser();

  let code = (params.get('room') || '').toUpperCase();
  let gameId = params.get('game');
  let resume = null;

  if (code) {
    const meta = (await get(ref(db, `rooms/${code}/meta`))).val();
    if (meta && meta.hostUid === user.uid && meta.status !== 'closed') {
      const [stateSnap, secretSnap, privateSnap] = await Promise.all(
        ['state', 'secret', 'private'].map((k) => get(ref(db, `rooms/${code}/${k}`)).then((x) => x.val())));
      resume = {
        meta,
        state: stateSnap ? JSON.parse(stateSnap.json) : null,
        secret: secretSnap ? JSON.parse(secretSnap.json) : {},
        private: Object.fromEntries(Object.entries(privateSnap || {}).map(([id, v]) => [id, JSON.parse(v.json)])),
      };
      gameId = meta.gameId;
    } else {
      code = '';
    }
  }

  if (!gameId) return showPicker();

  const game = await loadGame(gameId);
  if (!resume) {
    code = await createRoom(gameId, user.uid);
    history.replaceState(null, '', `?room=${code}`);
  }
  runRoom({ code, game, user, resume });
}

async function showPicker() {
  const games = await loadCatalog();
  $('#app').innerHTML = `
    <div class="picker">
      <h1>What are we playing?</h1>
      <p class="lede" style="margin-left:0">This screen becomes the game board. Players join on their phones.</p>
      <div class="shelf" style="margin-top:1.5rem">
        ${games.map((g) => `
          <a class="box" href="host.html?game=${encodeURIComponent(g.id)}">
            <div class="box-lid"><img src="${g.coverUrl}" alt=""></div>
            <div class="box-label"><h3>${escapeHtml(g.name)}</h3>
            <p class="box-facts"><span>${g.players.min}–${g.players.max} players</span><span>${g.averageDurationMinutes} min</span></p></div>
          </a>`).join('')}
      </div>
    </div>`;
}

async function createRoom(gameId, hostUid) {
  for (let attempt = 0; attempt < 15; attempt++) {
    const code = Array.from({ length: 4 }, () => CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]).join('');
    try {
      // Security rules only allow writing meta if the room doesn't exist yet (or is ours).
      const existing = (await get(ref(db, `rooms/${code}/meta`))).val();
      if (existing && existing.hostUid !== hostUid) {
        // An abandoned room from yesterday or earlier can be cleared out and its code reused.
        if (!(existing.createdAt < Date.now() - 25 * 60 * 60 * 1000)) continue;
        await remove(ref(db, `rooms/${code}`));
      }
      await set(ref(db, `rooms/${code}/meta`), {
        gameId, hostUid, status: 'lobby', hostConnected: true, createdAt: serverTimestamp(),
      });
      try {
        const cleanup = await import('./cleanup.js');
        await cleanup.indexRoom(code);
        cleanup.cleanOldRooms();   // tidy up yesterday's rooms in the background
      } catch (err) { console.warn('[cleanup]', err.message); }
      return code;
    } catch (err) {
      console.warn('Room code taken, retrying', code, err.message);
    }
  }
  throw new Error('Could not create a room. Check your Firebase rules are deployed.');
}

function runRoom({ code, game, user, resume }) {
  const roomPath = `rooms/${code}`;
  let status = resume?.meta.status || 'lobby';
  let players = [];

  // Only write what changed: secret/private data can be sizable.
  const lastWritten = {};
  const writeIfChanged = (path, value) => {
    const json = JSON.stringify(value ?? null);
    if (lastWritten[path] === json) return;
    lastWritten[path] = json;
    set(ref(db, `${roomPath}/${path}`), value == null ? null : { json, at: Date.now() });
  };
  // Phones' fast-lane updates (see setLive in play.js). One listener, shared by whoever asks.
  let liveCb = null, liveOn = false;
  const onLive = (cb) => {
    liveCb = cb;
    if (!liveOn) { liveOn = true; onValue(ref(db, `${roomPath}/live`), (snap) => liveCb?.(snap.val() || {})); }
  };
  const mediaCache = {};
  const media = (id) => {
    if (id in mediaCache) return mediaCache[id];
    mediaCache[id] = null;
    get(ref(db, `${roomPath}/media/${id}`)).then((snap) => { mediaCache[id] = snap.val(); render(); });
    return null;
  };

  const engine = new game.Engine({
    getPlayers: () => players,
    sync: (state, secret, priv) => {
      writeIfChanged('state', state);
      writeIfChanged('secret', secret && Object.keys(secret).length ? secret : null);
      for (const [id, data] of Object.entries(priv || {})) writeIfChanged(`private/${id}`, data);
      render();
    },
    putMedia: (id, data) => {
      mediaCache[id] = data;
      set(ref(db, `${roomPath}/media/${id}`), data);
    },
  });

  // Approved player suggestions (extra prompts, words, …) stay up to date while the room is open.
  onValue(ref(db, `content/${game.config.id}`), (snap) => { engine.extras = groupApproved(snap.val()); }, () => {});

  if (resume?.state) {
    engine.secret = resume.secret || {};
    engine.private = resume.private || {};
    engine.state = resume.state;
    engine.hasStarted = status === 'playing';
  } else {
    engine.onInit();
    engine.sync();
  }

  // Let phones know if the host screen drops.
  const hostConnRef = ref(db, `${roomPath}/meta/hostConnected`);
  set(hostConnRef, true);
  onDisconnect(hostConnRef).set(false);

  // Players joining / leaving
  let firstSnapshot = true;
  onValue(ref(db, `${roomPath}/players`), (snap) => {
    const val = snap.val() || {};
    const next = Object.entries(val)
      .map(([id, p]) => ({ id, name: p.name, person: p.person || '', connected: p.connected !== false, joinedAt: p.joinedAt || 0 }))
      .sort((a, b) => a.joinedAt - b.joinedAt);
    next.forEach((p, i) => (p.isVip = i === 0));

    const prevIds = new Set(players.map((p) => p.id));
    const nextIds = new Set(next.map((p) => p.id));
    const joined = next.filter((p) => !prevIds.has(p.id));
    const left = players.filter((p) => !nextIds.has(p.id));
    players = next;

    if (!(firstSnapshot && resume)) {
      joined.forEach((p) => safely(() => engine.onPlayerJoin(p.id, p.name, engine.hasStarted)));
      left.forEach((p) => safely(() => engine.onPlayerLeave(p.id)));
    }
    firstSnapshot = false;
    render();
  });

  // Actions from phones: process, then delete from the queue.
  onChildAdded(ref(db, `${roomPath}/actions`), (snap) => {
    const a = snap.val();
    remove(snap.ref);
    const player = players.find((p) => p.id === a.uid);
    if (!player || typeof a.type !== 'string') return;
    safely(() => engine.processAction(a.type, a.payload || {}, {
      playerId: a.uid, isBoard: false, isVip: !!player.isVip, timestamp: a.ts || Date.now(),
    }));
  });

  const boardSendAction = (type, payload = {}) =>
    safely(() => engine.processAction(type, payload, { playerId: 'board', isBoard: true, isVip: false, timestamp: Date.now() }));

  const joinUrl = new URL(`play.html?code=${code}`, location.href).href;
  const shortJoinUrl = new URL('play.html', location.href).href.replace(/^https?:\/\//, '');

  $('#app').innerHTML = `
    <section id="lobby" class="lobby" hidden>
      <div class="lobby-join">
        <p class="how">On your phone, go to</p>
        <p class="join-url">${escapeHtml(shortJoinUrl)}</p>
        <div class="code-tiles" aria-label="Room code ${code}">${code.split('').map((c) => `<span>${c}</span>`).join('')}</div>
        <div class="qr-wrap"><canvas id="qr" width="180" height="180"></canvas><span class="muted small">or scan to join</span></div>
      </div>
      <div class="lobby-side">
        <h1>${escapeHtml(game.config.name)}</h1>
        <p class="muted">${escapeHtml(game.config.subtitle || '')}</p>
        <h3>At the table <span id="count" class="muted"></span></h3>
        <ul id="player-list" class="player-list"></ul>
        <button id="start" class="btn btn-primary btn-big">Start the game</button>
        <div class="bot-tools"><span class="muted small">Test mode:</span>
          <button id="add-bot" class="btn btn-ghost">Add a bot</button>
          <button id="clear-bots" class="btn btn-ghost" hidden>Remove bots</button>
          <button id="phone-test" class="btn btn-ghost">Test on this phone</button></div>
        <p id="start-hint" class="muted small" style="margin-top:.75rem"></p>
      </div>
    </section>
    <section id="game" hidden>
      <div class="game-bar">
        <span>${escapeHtml(game.config.name)} · room <strong>${code}</strong></span>
        <button id="end" class="btn btn-ghost">End game</button>
      </div>
      <div id="board"></div>
      <div id="cast" class="cast"></div>
    </section>`;

  drawQr($('#qr'), joinUrl);

  $('#start').onclick = async () => {
    status = 'playing';
    await update(ref(db, `${roomPath}/meta`), { status: 'playing' });
    safely(() => engine.onGameStart());
    render();
  };
  // End game: ask on the page itself (TV apps handle pop-up dialogs badly), then go back to picking a game.
  $('#end').onclick = () => {
    if (document.querySelector('.end-ask')) return;
    const ask = document.createElement('div');
    ask.className = 'end-ask';
    ask.innerHTML = `<div class="end-card"><h2>End this game for everyone?</h2>
      <div class="row-center"><button class="btn btn-ghost" id="end-no">Keep playing</button><button class="btn btn-primary" id="end-yes">End game</button></div></div>`;
    document.body.appendChild(ask);
    ask.querySelector('#end-no').onclick = () => ask.remove();
    ask.querySelector('#end-yes').onclick = async () => {
      engine.destroy();
      await update(ref(db, `${roomPath}/meta`), { status: 'closed' }).catch(() => {});
      location.replace('index.html#games');
    };
    ask.querySelector('#end-no').focus();
  };
  // Test bots: hidden phones that join and tap around, so one person can try any game.
  const BOT_NAMES = ['Bot Ada', 'Bot Max', 'Bot Pip', 'Bot Zed', 'Bot Lou', 'Bot Ivy', 'Bot Gus', 'Bot Bea', 'Bot Rex', 'Bot Kit', 'Bot Moe', 'Bot Dot'];
  let botHolder = document.querySelector('#bots');
  if (!botHolder) { botHolder = document.createElement('div'); botHolder.id = 'bots'; document.body.appendChild(botHolder); }
  $('#add-bot').onclick = () => {
    const used = new Set(players.map((p) => p.name));
    const name = BOT_NAMES.find((n) => !used.has(n) && !botHolder.querySelector(`[data-bot="${n}"]`));
    if (!name || players.length >= game.config.players.max) return;
    const f = document.createElement('iframe');
    f.dataset.bot = name;
    f.title = name;
    f.src = `play.html?bot=1&code=${code}&name=${encodeURIComponent(name)}`;
    botHolder.appendChild(f);
  };
  $('#clear-bots').onclick = () => {
    for (const p of players) if (botHolder.querySelector(`[data-bot="${p.name}"]`)) remove(ref(db, `${roomPath}/players/${p.id}`));
    botHolder.innerHTML = '';
  };
  $('#phone-test').onclick = () => startPhoneTest(code);
  $('#player-list').onclick = (e) => {
    const id = e.target.closest('[data-kick]')?.dataset.kick;
    if (id) remove(ref(db, `${roomPath}/players/${id}`));
  };

  function render() {
    const lobby = $('#lobby');
    if (!lobby) return;
    lobby.hidden = status !== 'lobby';
    document.body.classList.toggle('in-game', status !== 'lobby');
    $('#game').hidden = status === 'lobby';

    if (status === 'lobby') {
      const { min, max } = game.config.players;
      $('#count').textContent = `(${players.length}/${max})`;
      $('#player-list').innerHTML = players.length
        ? players.map((p) => `
            <li class="${p.connected ? '' : 'offline'}">
              ${spriteHtml(p.person, 'idle', 56)}<span>${escapeHtml(p.name)}</span>${p.isVip ? '<span class="vip">VIP</span>' : ''}
              <button class="link" data-kick="${p.id}" aria-label="Remove ${escapeHtml(p.name)}">✕</button>
            </li>`).join('')
        : '<li class="waiting">Nobody yet. Scan the code to join.</li>';
      $('#clear-bots').hidden = !botHolder.children.length;
      $('#add-bot').disabled = players.length >= max;
      const enough = players.length >= min;
      $('#start').disabled = !enough;
      $('#start-hint').textContent = enough ? '' : `${game.config.name} needs at least ${min} player${min > 1 ? 's' : ''}.`;
    } else {
      game.renderBoard($('#board'), { state: engine.state, players, sendAction: boardSendAction, media, onLive });
      const cast = game.config.cast === false ? '' : castHtml(players, engine.state);
      if ($('#cast').dataset.html !== cast) { $('#cast').innerHTML = cast; $('#cast').dataset.html = cast; }
      fitToScreen();
      focusMainButton();
    }
  }
  render();
}

/**
 * Phone test mode: this page becomes a pretend TV (laid out 1280px wide and shrunk to the screen),
 * and your own controller lives in a panel on top. A button flips between the two.
 */
function startPhoneTest(code) {
  if (document.querySelector('#me-frame')) return;
  document.querySelector('meta[name=viewport]').content = 'width=1280';
  document.body.classList.add('phone-test');
  const wrap = document.createElement('div');
  wrap.id = 'me-wrap';
  wrap.innerHTML = `<iframe id="me-frame" title="Your phone" src="play.html?solo=1&code=${code}"></iframe>`;
  const flip = document.createElement('button');
  flip.id = 'me-flip';
  document.body.append(wrap, flip);
  const show = (mine) => {
    document.body.classList.toggle('show-me', mine);
    flip.textContent = mine ? '📺 See the TV' : '📱 My phone';
  };
  flip.onclick = () => show(!document.body.classList.contains('show-me'));
  // Size the controller at the phone's real width (in either orientation), then scale it to the pretend-TV layout.
  const size = () => {
    const f = wrap.querySelector('iframe');
    const a = Math.min(screen.width, screen.height), b = Math.max(screen.width, screen.height);
    const realW = innerWidth > innerHeight ? b : a;
    const scale = innerWidth / realW;
    f.style.width = `${realW}px`;
    f.style.height = `${innerHeight / scale}px`;
    f.style.transform = `scale(${scale})`;
    flip.style.fontSize = `${14 * scale}px`;
  };
  addEventListener('resize', size);
  setTimeout(size, 50);
  size();
  show(true);
}

/**
 * TVs show the page at a small size (often 960×540), so shrink the whole game view until it fits
 * the screen without scrolling. Only ever shrinks, never grows.
 */
let fitQueued = false;
function fitToScreen() {
  if (fitQueued) return;
  fitQueued = true;
  requestAnimationFrame(() => {
    fitQueued = false;
    const game = document.querySelector('#game');
    if (!game || game.hidden) return;
    game.style.zoom = 1;
    const top = game.getBoundingClientRect().top + window.scrollY;
    const room = window.innerHeight - top - 8;
    const need = game.scrollHeight;
    const z = need > room ? Math.max(0.5, room / need) : 1;
    game.style.zoom = z;
  });
}
addEventListener('resize', fitToScreen);
new MutationObserver(fitToScreen).observe(document.documentElement, { subtree: true, childList: true });
document.addEventListener('load', fitToScreen, true); // images finishing can change the height

function safely(fn) {
  try {
    fn();
  } catch (err) {
    console.error('[engine]', err);
  }
}

async function drawQr(canvas, text) {
  try {
    const QRCode = (await import('https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm')).default;
    await QRCode.toCanvas(canvas, text, { width: 180, margin: 1, color: { dark: '#22201b', light: '#ffffff' } });
  } catch (err) {
    console.warn('QR code failed to load', err);
    canvas.parentElement.remove();
  }
}
