// Family sign-in list and the little animated characters.
// Sprite sheets live in /people/<id>.webp: 4 columns x 5 rows of 192px cells.
// Rows: 0 idle, 1 thinking, 2 cheering, 3 eliminated, 4 waving.

export const PEOPLE = [
  'Amy', 'Becca', 'Benton', 'Bob', 'Calvin', 'Davis', 'Gabbie', 'Grace', 'Hayden',
  'Jacob', 'Kris', 'Lincoln', 'Phil', 'Rhett', 'Sarah', 'Shawn', 'Taya', 'Vera',
];

const HAS_SPRITE = new Set(PEOPLE.map((p) => p.toLowerCase()));
const ROW = { idle: 0, thinking: 1, cheering: 2, eliminated: 3, waving: 4 };

export const personId = (name) => String(name || '').trim().toLowerCase();
export const hasSprite = (person) => HAS_SPRITE.has(personId(person));

const fellAt = new Map();

/** HTML for one animated character. Returns '' when the person has no sprite. */
export function spriteHtml(person, pose = 'idle', size = 96) {
  const id = personId(person);
  if (!HAS_SPRITE.has(id)) return '';
  const row = ROW[pose] ?? 0;
  // Screens redraw often; a character who already fell over stays down instead of falling again.
  let cls = `pose-${pose}`;
  if (pose === 'eliminated') {
    const t = fellAt.get(id);
    if (t == null) fellAt.set(id, Date.now());
    else if (Date.now() - t > 800) cls = 'pose-fallen';
  } else fellAt.delete(id);
  return `<span class="sprite ${cls}" style="--s:${size}px;--row:${row};background-image:url(people/${id}.webp)" aria-hidden="true"></span>`;
}

const inList = (list, id) => (Array.isArray(list) ? list.includes(id) : !!(list && list[id]));

/** Best guess at what a player's character should be doing, from any game's public state. */
export function poseFor(s, id) {
  if (!s || !id) return 'idle';
  if (inList(s.dead, id)) return 'eliminated';

  if (s.phase === 'over' || s.phase === 'gameover') {
    const w = s.winner;
    if (Array.isArray(w) ? w.includes(id) : w === id) return 'cheering';
    // Team wins: Codenames teams, or roles revealed at the end (Mafia, Secret Hitler).
    if (s.teams?.[w]?.includes?.(id)) return 'cheering';
    const role = s.roles?.[id];
    if (role && typeof w === 'string') {
      const team = role === 'mafia' ? 'mafia' : role === 'hitler' || role === 'fascist' ? 'fascist' : w === 'town' ? 'town' : role;
      const mine = w === 'town' ? (role !== 'mafia' ? 'town' : 'mafia') : team;
      return mine === w ? 'cheering' : 'idle';
    }
    if (!w && s.scores && typeof s.scores === 'object') {
      const top = Math.max(...Object.values(s.scores).map(Number).filter((n) => !Number.isNaN(n)));
      if (Number(s.scores[id]) === top) return 'cheering';
    }
    return 'idle';
  }

  let turnId = null;
  if (Array.isArray(s.seats) && typeof s.turn === 'number') turnId = s.seats[s.turn];
  else if (typeof s.current === 'string') turnId = s.current;
  else if (typeof s.guesser === 'string') turnId = s.guesser;
  if (turnId) return turnId === id ? 'waving' : 'idle';

  if (Array.isArray(s.waiting) && s.waiting.length) return s.waiting.includes(id) ? 'thinking' : 'idle';
  // Everyone acting at once: think until you've submitted.
  const keys = ['done', 'submitted', 'nightDone'];
  if (/vote|day/.test(s.phase || '')) keys.push('votes');
  for (const key of keys) {
    if (s[key] && (!Array.isArray(s.seats) || s.seats.includes(id))) return inList(s[key], id) ? 'idle' : 'thinking';
  }
  return 'idle';
}

/** A row of characters for the TV. Players without a sprite are left out. */
export function castHtml(players, state, size = 84) {
  const withSprites = players.filter((p) => hasSprite(p.person));
  if (!withSprites.length) return '';
  return withSprites.map((p) => `
    <figure class="cast-member">
      ${spriteHtml(p.person, poseFor(state, p.id), size)}
      <figcaption>${String(p.name).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])}</figcaption>
    </figure>`).join('');
}
