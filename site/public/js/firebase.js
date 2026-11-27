// Firebase setup shared by every page.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js';
import {
  initializeAuth,
  browserSessionPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  browserPopupRedirectResolver,
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
  query,
  orderByValue,
  orderByChild,
  endAt,
  limitToFirst,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-database.js';
import { firebaseConfig, ADMIN_EMAIL } from './firebase-config.js';

export const isConfigured = !firebaseConfig.apiKey.startsWith('YOUR_');

const app = initializeApp(firebaseConfig);

// Session persistence = each browser TAB is its own anonymous user.
// That lets you test host + several players in tabs of one browser,
// and a refresh keeps the same identity (so players can reconnect).
// Test bots (play.html?bot=1) run inside the TV page, so each keeps its sign-in in memory to be its own player.
const isBot = /[?&](bot|solo)=/.test(location.search); // bots and the phone-test controller
// Phones remember who you are even after the app closes, so you can jump back into the same game.
// (The TV and admin page keep using one sign-in per tab.)
const isPlayer = /\/play\.html$/.test(location.pathname) || /\/suggest\.html$/.test(location.pathname);
export const auth = initializeAuth(app, { persistence: isBot ? inMemoryPersistence : isPlayer ? browserLocalPersistence : browserSessionPersistence });
export const db = getDatabase(app);

export { ref, get, set, update, remove, push, onValue, onChildAdded, onDisconnect, serverTimestamp };
export { query, orderByValue, orderByChild, endAt, limitToFirst };
export { ADMIN_EMAIL };

/** Admin sign-in with Google (admin.html only). Resolves with the signed-in user. */
// initializeAuth leaves out the pop-up/redirect helper, so it's passed in here.
export async function signInAdmin() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    return result.user;
  } catch (err) {
    // Installed apps and some phone browsers can't open pop-ups: sign in on a full page instead.
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(err.code)) {
      await signInWithRedirect(auth, provider, browserPopupRedirectResolver);
      return null;
    }
    throw err;
  }
}
/** Finishes a full-page Google sign-in after coming back to admin.html. */
export function finishAdminRedirect() { return getRedirectResult(auth, browserPopupRedirectResolver).catch((err) => { throw err; }); }

/** Plain-English versions of the sign-in errors you're likely to hit. */
export function signInHelp(err) {
  const code = err?.code || '';
  if (code === 'auth/operation-not-allowed') return 'Google sign-in is turned off for this Firebase project. In the Firebase console, go to Authentication → Sign-in method → Google and turn it on.';
  if (code === 'auth/unauthorized-domain') return `This web address isn't allowed to sign in yet. In the Firebase console, go to Authentication → Settings → Authorized domains and add ${location.hostname}.`;
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'The sign-in window was closed before finishing. Try again.';
  if (code === 'auth/network-request-failed') return 'No connection to Google. Check your internet and try again.';
  return `${err?.message || 'Sign-in failed.'}${code ? ` (${code})` : ''}`;
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
