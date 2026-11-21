// Admin page: sign in with Google, then approve or deny suggestions per game.
import {
  db, ref, update, onValue, serverTimestamp,
  signInAdmin, signOutAdmin, watchUser, ADMIN_EMAIL, warnIfNotConfigured,
} from './firebase.js';
import { loadCatalog, escapeHtml } from './catalog.js';
import { kindsFor } from './suggestions.js';

const $ = (s) => document.querySelector(s);
let games = [];
let pending = {};
let approved = {};
let tab = 'pending';
let unsub = [];

main();

async function main() {
  if (warnIfNotConfigured()) return;
  games = await loadCatalog();
  watchUser((user) => {
    unsub.forEach((u) => u()); unsub = [];
    $('#signout').hidden = !user || user.isAnonymous;
    if (!user || user.isAnonymous) return showSignIn();
    if (user.email !== ADMIN_EMAIL) return showSignIn(`${user.email} isn't the admin account.`);
    unsub.push(onValue(ref(db, 'suggestions'), (snap) => { pending = snap.val() || {}; render(); }, (err) => showSignIn(err.message)));
    unsub.push(onValue(ref(db, 'content'), (snap) => { approved = snap.val() || {}; render(); }));
    import('./cleanup.js').then((c) => c.sweepAllOldRooms()).then((n) => n && console.info(`[cleanup] removed ${n} old rooms`)).catch((err) => console.warn('[cleanup]', err.message));
  });
  $('#signout').onclick = (e) => { e.preventDefault(); signOutAdmin(); };
}

function showSignIn(message = '') {
  $('#app').innerHTML = `<div class="sheet" style="max-width:420px;margin:3rem auto;text-align:center">
    <h1>Admin</h1>
    <p class="muted">Sign in to review suggestions.</p>
    ${message ? `<p class="error">${escapeHtml(message)}</p>` : ''}
    <button class="btn btn-primary btn-big" id="signin">Sign in with Google</button>
  </div>`;
  $('#signin').onclick = () => signInAdmin().catch((err) => showSignIn(err.message));
}

const gameName = (id) => games.find((g) => g.id === id)?.name || id;
const kindLabel = (gameId, kind) => kindsFor(games.find((g) => g.id === gameId) || {}).find((k) => k.kind === kind)?.label || kind;
const fieldDefs = (gameId, kind) => kindsFor(games.find((g) => g.id === gameId) || {}).find((k) => k.kind === kind)?.fields
  || [{ key: 'text', label: 'Text' }];
const when = (t) => (t ? new Date(t).toLocaleString() : '');

function render() {
  const source = tab === 'pending' ? pending : approved;
  const count = (obj) => Object.values(obj).reduce((a, g) => a + Object.keys(g || {}).length, 0);
  const gameIds = Object.keys(source).filter((g) => Object.keys(source[g] || {}).length).sort((a, b) => gameName(a).localeCompare(gameName(b)));

  $('#app').innerHTML = `
    <h1>Suggestions</h1>
    <div class="adm-tabs">
      <button data-tab="pending" class="${tab === 'pending' ? 'on' : ''}">Waiting for review (${count(pending)})</button>
      <button data-tab="approved" class="${tab === 'approved' ? 'on' : ''}">Approved (${count(approved)})</button>
    </div>
    ${gameIds.length ? '' : `<p class="muted">${tab === 'pending' ? 'Nothing to review right now.' : 'Nothing approved yet.'}</p>`}
    ${gameIds.map((gid) => `
      <section class="adm-game">
        <h2><span>${escapeHtml(gameName(gid))}</span><span class="small muted">${Object.keys(source[gid]).length}</span></h2>
        ${Object.entries(source[gid]).sort((a, b) => (a[1].at || 0) - (b[1].at || 0)).map(([id, s]) => itemHtml(gid, id, s)).join('')}
      </section>`).join('')}`;

  document.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; render(); }));
  document.querySelectorAll('[data-approve]').forEach((b) => (b.onclick = () => approve(b.dataset.game, b.dataset.approve)));
  document.querySelectorAll('[data-deny]').forEach((b) => (b.onclick = () => deny(b.dataset.game, b.dataset.deny)));
  document.querySelectorAll('[data-remove]').forEach((b) => (b.onclick = () => removeApproved(b.dataset.game, b.dataset.remove)));
}

function itemHtml(gid, id, s) {
  const defs = fieldDefs(gid, s.kind);
  if (tab === 'approved') {
    return `<div class="adm-item"><div class="meta">${escapeHtml(kindLabel(gid, s.kind))} · approved ${when(s.at)}</div>
      ${defs.map((f) => `<div><strong>${escapeHtml(s.fields?.[f.key] || '')}</strong></div>`).join('')}
      <div class="adm-actions" style="margin-top:.5rem"><button class="btn btn-ghost" data-game="${gid}" data-remove="${id}">Remove from game</button></div></div>`;
  }
  const isIdea = s.kind === 'idea';
  return `<div class="adm-item" id="item-${id}">
    <div class="meta">${escapeHtml(kindLabel(gid, s.kind))}${s.name ? ` · from ${escapeHtml(s.name)}` : ''} · ${when(s.at)}</div>
    ${defs.map((f) => `<label>${escapeHtml(f.label)}</label>${isIdea
      ? `<textarea data-field="${f.key}" rows="3">${escapeHtml(s.fields?.[f.key] || '')}</textarea>`
      : `<input data-field="${f.key}" value="${escapeHtml(s.fields?.[f.key] || '')}">`}`).join('')}
    <div class="adm-actions">
      <button class="btn btn-primary" data-game="${gid}" data-approve="${id}">${isIdea ? 'Keep it' : 'Approve and add to game'}</button>
      <button class="btn btn-ghost" data-game="${gid}" data-deny="${id}">${isIdea ? 'Dismiss' : 'Deny'}</button>
    </div></div>`;
}

async function approve(gid, id) {
  const s = pending[gid][id];
  const fields = {};
  document.querySelectorAll(`#item-${CSS.escape(id)} [data-field]`).forEach((i) => (fields[i.dataset.field] = i.value.trim().slice(0, 300)));
  if (Object.values(fields).some((v) => !v)) return alert('Fill in every field first.');
  // Move it from the queue into the game's live content in one write.
  await update(ref(db), {
    [`content/${gid}/${id}`]: { kind: s.kind, fields, at: serverTimestamp() },
    [`suggestions/${gid}/${id}`]: null,
  });
}

function deny(gid, id) {
  return update(ref(db), { [`suggestions/${gid}/${id}`]: null });
}

function removeApproved(gid, id) {
  if (!confirm('Remove this from the game?')) return;
  return update(ref(db), { [`content/${gid}/${id}`]: null });
}
