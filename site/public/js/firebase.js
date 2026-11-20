// Firebase setup shared by every page.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js';
import {
  initializeAuth,
  browserSessionPersistence,
  inMemoryPersistence,
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js';
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  remove,
  push,
  onValue,
  onChildAdded,
  onDisconnect,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-database.js';
import { firebaseConfig, ADMIN_EMAIL } from './firebase-config.js';

export const isConfigured = !firebaseConfig.apiKey.startsWith('YOUR_');

const app = initializeApp(firebaseConfig);

// Session persistence = each browser TAB is its own anonymous user.
// That lets you test host + several players in tabs of one browser,
// and a refresh keeps the same identity (so players can reconnect).
// Test bots (play.html?bot=1) run inside the TV page, so each keeps its sign-in in memory to be its own player.
const isBot = /[?&](bot|solo)=/.test(location.search); // bots and the phone-test controller
export const auth = initializeAuth(app, { persistence: isBot ? inMemoryPersistence : browserSessionPersistence });
export const db = getDatabase(app);

export { ref, get, set, update, remove, push, onValue, onChildAdded, onDisconnect, serverTimestamp };
export { ADMIN_EMAIL };

/** Admin sign-in with Google (admin.html only). Resolves with the signed-in user. */
export async function signInAdmin() {
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  return result.user;
}
export function signOutAdmin() { return signOut(auth); }
export function watchUser(cb) { return onAuthStateChanged(auth, cb); }

/** Resolves with the signed-in (anonymous) user, signing in if needed. */
export function ensureUser() {
  return new Promise((resolve, reject) => {
    const stop = onAuthStateChanged(auth, (user) => {
      if (user) {
        stop();
        resolve(user);
      }
    });
    signInAnonymously(auth).catch((err) => {
      stop();
      reject(err);
    });
  });
}

/** Shows a banner when firebase-config.js still has placeholder values. */
export function warnIfNotConfigured() {
  if (isConfigured) return false;
  const div = document.createElement('div');
  div.className = 'banner banner-warn';
  div.innerHTML =
    '<strong>Firebase isn\'t set up yet.</strong> Paste your config into <code>public/js/firebase-config.js</code> (see README).';
  document.body.prepend(div);
  return true;
}
