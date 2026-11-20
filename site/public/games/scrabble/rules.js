// Board layout, tiles and word scoring for Scrabble. No DOM here, so it's easy to test.
export const SIZE = 15;
export const CENTER = 7 * SIZE + 7;

export const VALUES = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3,
  N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10, '?': 0,
};
const COUNTS = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1, L: 4, M: 2,
  N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1, '?': 2,
};
export const makeBag = () => Object.entries(COUNTS).flatMap(([l, n]) => Array(n).fill(l));

// Premium squares, built from one quarter of the board by symmetry.
const QUARTER = {
  TW: [[0, 0], [0, 7]],
  DW: [[1, 1], [2, 2], [3, 3], [4, 4], [7, 7]],
  TL: [[1, 5], [5, 5]],
  DL: [[0, 3], [2, 6], [3, 7], [6, 6]],
};
export const PREMIUM = (() => {
  const map = {};
  for (const [kind, cells] of Object.entries(QUARTER)) {
    for (const [r, c] of cells) {
      for (const [rr, cc] of [[r, c], [c, r], [r, 14 - c], [14 - c, r], [14 - r, c], [c, 14 - r], [14 - r, 14 - c], [14 - c, 14 - r]]) {
        map[rr * SIZE + cc] = kind;
      }
    }
  }
  return map;
})();

const rc = (pos) => [Math.floor(pos / SIZE), pos % SIZE];

/**
 * Check a move and score it.
 * board: array of 225 (null | { l, blank })
 * placed: [{ pos, l, blank }]  (l is the letter shown, even for blanks)
 * isWord: (word) => boolean
 * Returns { ok: true, score, words: [{ word, score }] } or { ok: false, error }
 */
export function scoreMove(board, placed, isWord) {
  if (!placed.length) return { ok: false, error: 'Place at least one tile.' };
  const positions = placed.map((t) => t.pos);
  if (new Set(positions).size !== positions.length) return { ok: false, error: 'Two tiles on one square.' };
  if (positions.some((p) => p < 0 || p >= SIZE * SIZE || board[p])) return { ok: false, error: 'That square is taken.' };

  const rows = new Set(positions.map((p) => rc(p)[0]));
  const cols = new Set(positions.map((p) => rc(p)[1]));
  if (rows.size > 1 && cols.size > 1) return { ok: false, error: 'Tiles must be in one row or one column.' };

  const first = board.every((x) => !x);
  if (first && !positions.includes(CENTER)) return { ok: false, error: 'The first word must cover the center star.' };

  const tile = (pos) => board[pos] || placed.find((t) => t.pos === pos) || null;
  const isNew = (pos) => positions.includes(pos);
  // Direction of the main word: across unless tiles share a column (or a lone tile makes a longer word down).
  const across = (() => {
    if (rows.size === 1 && cols.size > 1) return true;
    if (cols.size === 1 && rows.size > 1) return false;
    const [r, c] = rc(positions[0]);
    const hasH = (c > 0 && tile(positions[0] - 1)) || (c < 14 && tile(positions[0] + 1));
    return !!hasH || !((r > 0 && tile(positions[0] - SIZE)) || (r < 14 && tile(positions[0] + SIZE)));
  })();
  const step = across ? 1 : SIZE;

  const wordAt = (pos, stepSize) => {
    const sameLine = (a, b) => (stepSize === 1 ? rc(a)[0] === rc(b)[0] : true);
    let start = pos;
    while (start - stepSize >= 0 && sameLine(start, start - stepSize) && tile(start - stepSize)) start -= stepSize;
    const cells = [];
    for (let p = start; p < SIZE * SIZE && sameLine(start, p) && tile(p); p += stepSize) cells.push(p);
    return cells;
  };

  // Gaps: every square between the outermost new tiles must be filled.
  const sorted = [...positions].sort((a, b) => a - b);
  for (let p = sorted[0]; p <= sorted[sorted.length - 1]; p += step) {
    if (!tile(p)) return { ok: false, error: 'Tiles must form one connected word, no gaps.' };
  }

  const main = wordAt(sorted[0], step);
  const words = [];
  if (main.length >= 2) words.push(main);
  for (const pos of positions) {
    const cross = wordAt(pos, across ? SIZE : 1);
    if (cross.length >= 2) words.push(cross);
  }
  if (!words.length) return { ok: false, error: 'Words must be at least two letters.' };
  if (!first && !words.some((cells) => cells.some((p) => !isNew(p)))) {
    return { ok: false, error: 'Your word must connect to tiles already on the board.' };
  }

  let total = 0;
  const scored = [];
  for (const cells of words) {
    const word = cells.map((p) => tile(p).l).join('');
    if (!isWord(word)) return { ok: false, error: `“${word}” isn't in the dictionary.` };
    let sum = 0, mult = 1;
    for (const p of cells) {
      const t = tile(p);
      let v = t.blank ? 0 : VALUES[t.l];
      if (isNew(p)) {
        const prem = PREMIUM[p];
        if (prem === 'DL') v *= 2;
        if (prem === 'TL') v *= 3;
        if (prem === 'DW') mult *= 2;
        if (prem === 'TW') mult *= 3;
      }
      sum += v;
    }
    scored.push({ word, score: sum * mult });
    total += sum * mult;
  }
  if (placed.length === 7) total += 50;
  return { ok: true, score: total, words: scored, bingo: placed.length === 7 };
}
