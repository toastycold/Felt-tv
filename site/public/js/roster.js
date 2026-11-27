// The player list, shared by the TV and phones. Handles rejoining: if someone's phone drops out and they
// come back as a new sign-in (new phone, cleared browser), the TV links the new sign-in to their old seat
// (rooms/{code}/aliases/{newUid} = oldId), so they keep their role, cards and score.

const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

/** raw: rooms/{code}/players; aliases: newUid -> oldId. Returns the list games see, oldest first. */
export function buildRoster(raw = {}, aliases = {}) {
  const list = Object.entries(raw)
    .filter(([id]) => !aliases[id])
    .map(([id, p]) => ({ id, name: p.name, person: p.person || '', connected: p.connected !== false, joinedAt: p.joinedAt || 0 }));
  // A linked sign-in keeps its old seat "connected" while it's online.
  for (const [uid, oldId] of Object.entries(aliases)) {
    const seat = list.find((p) => p.id === oldId);
    if (seat && raw[uid]) seat.connected = seat.connected || raw[uid].connected !== false;
  }
  list.sort((a, b) => a.joinedAt - b.joinedAt);
  list.forEach((p, i) => (p.isVip = i === 0));
  return list;
}

/** A new sign-in whose name matches someone who dropped out: the seat they should take back, or null. */
export function seatToReclaim(raw, aliases, uid, current) {
  const me = raw[uid];
  if (!me || aliases[uid]) return null;
  const taken = new Set(Object.values(aliases));
  return current.find((p) => p.id !== uid && !p.connected && !taken.has(p.id) && same(p.name, me.name)) || null;
}
