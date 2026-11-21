// Room cleanup. The free Firebase plan has no server code, so each new room quietly deletes
// a few rooms that are more than a day old. The database rules only allow deleting old rooms.
import { db, ref, get, set, remove, query, orderByValue, orderByChild, endAt, limitToFirst, serverTimestamp } from './firebase.js';

export const DAY = 24 * 60 * 60 * 1000;
const SLACK = 15 * 60 * 1000; // in case this device's clock runs fast

/** Note when a room was made, so later hosts can find and delete it. */
export async function indexRoom(code) {
  try { await set(ref(db, `roomIndex/${code}`), serverTimestamp()); } catch (err) { console.warn('[cleanup] index', err.message); }
}

async function removeRoom(code) {
  await remove(ref(db, `rooms/${code}`)).catch((err) => console.warn('[cleanup] room', code, err.message));
  await remove(ref(db, `roomIndex/${code}`)).catch(() => {});
}

/** Delete up to 25 rooms older than a day. Safe to call often; failures are ignored. */
export async function cleanOldRooms() {
  try {
    const snap = await get(query(ref(db, 'roomIndex'), orderByValue(), endAt(Date.now() - DAY - SLACK), limitToFirst(25)));
    const codes = Object.keys(snap.val() || {});
    for (const code of codes) await removeRoom(code);
    return codes.length;
  } catch (err) {
    console.warn('[cleanup]', err.message);
    return 0;
  }
}

/** Admin only: sweep every old room, including ones made before the index existed. */
export async function sweepAllOldRooms() {
  const snap = await get(query(ref(db, 'rooms'), orderByChild('meta/createdAt'), endAt(Date.now() - DAY - SLACK), limitToFirst(200)));
  const codes = Object.keys(snap.val() || {});
  for (const code of codes) await removeRoom(code);
  return codes.length + await cleanOldRooms();
}
