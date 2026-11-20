// Boggle board and word rules, shared by the engine and the tests.
export const DICE = [
  'AAEEGN', 'ABBJOO', 'ACHOPS', 'AFFKPS', 'AOOTTW', 'CIMOTU', 'DEILRX', 'DELRVY',
  'DISTTY', 'EEGHNW', 'EEINSU', 'EHRTVW', 'EIOSST', 'ELRTTY', 'HIMNQU', 'HLNNRZ',
];
export const SIZE = 4;

export function rollBoard(random = Math.random) {
  const dice = [...DICE];
  for (let i = dice.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [dice[i], dice[j]] = [dice[j], dice[i]]; }
  return dice.map((d) => { const f = d[Math.floor(random() * 6)]; return f === 'Q' ? 'QU' : f; });
}

const neighbors = (i) => {
  const r = Math.floor(i / SIZE), c = i % SIZE, out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) out.push(rr * SIZE + cc);
  }
  return out;
};
const NB = Array.from({ length: SIZE * SIZE }, (_, i) => neighbors(i));

/** Can the word be traced on the board through touching cubes, using each cube once? */
export function onBoard(word, board) {
  const w = word.toUpperCase();
  const walk = (i, pos, used) => {
    const face = board[i];
    if (!w.startsWith(face, pos)) return false;
    const next = pos + face.length;
    if (next === w.length) return true;
    used.add(i);
    const ok = NB[i].some((j) => !used.has(j) && walk(j, next, used));
    used.delete(i);
    return ok;
  };
  return board.some((_, i) => walk(i, 0, new Set()));
}

export const points = (word) => { const n = word.length; return n < 3 ? 0 : n <= 4 ? 1 : n === 5 ? 2 : n === 6 ? 3 : n === 7 ? 5 : 11; };
