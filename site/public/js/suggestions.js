// Player suggestions: submitted to a per-game queue, approved by the admin, then used by the games.
import { db, ref, update, push, serverTimestamp } from './firebase.js';

export const MAX_LEN = 300;

/** Every game also accepts general ideas / bug reports. */
export const IDEA_KIND = {
  kind: 'idea', label: 'An idea or a bug report',
  fields: [{ key: 'text', label: 'Your idea', placeholder: 'It would be fun if…', long: true }],
};

export function kindsFor(config) {
  return [...(config.suggestions || []), IDEA_KIND];
}

/**
 * Save a suggestion. Also stamps suggestRate/<uid> in the same write, which the
 * database rules use to allow at most one suggestion every 15 seconds per player.
 */
export async function submitSuggestion(user, gameId, kind, fields, name = '') {
  const id = push(ref(db, `suggestions/${gameId}`)).key;
  await update(ref(db), {
    [`suggestions/${gameId}/${id}`]: { kind, fields, name: name.slice(0, 16), uid: user.uid, at: serverTimestamp() },
    [`suggestRate/${user.uid}`]: serverTimestamp(),
  });
}

/** Approved items for one game, grouped by kind: { prompt: [{ text }], ... } */
export function groupApproved(content) {
  const out = {};
  for (const item of Object.values(content || {})) {
    if (!item?.kind || !item.fields) continue;
    (out[item.kind] ||= []).push(item.fields);
  }
  return out;
}
