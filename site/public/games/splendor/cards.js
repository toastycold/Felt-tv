// Card and noble generation for Splendor.
// Costs are written as offsets from the card's own color around the color wheel,
// so each color gets the same set of card "shapes" with a different mix of gems.

export const COLORS = ['white', 'blue', 'green', 'red', 'black'];
export const GOLD = 'gold';

// [points, { offset: count }]  offset 0 = the card's own color
const SHAPES = {
  1: [
    [0, { 1: 1, 2: 1, 3: 1, 4: 1 }],
    [0, { 1: 1, 2: 2, 3: 1, 4: 1 }],
    [0, { 1: 2, 3: 2, 4: 1 }],
    [0, { 0: 1, 2: 3, 3: 1 }],
    [0, { 1: 1, 2: 2 }],
    [0, { 1: 2, 4: 2 }],
    [0, { 3: 3 }],
    [1, { 2: 4 }],
  ],
  2: [
    [1, { 1: 2, 2: 2, 3: 3 }],
    [1, { 0: 2, 2: 3, 4: 3 }],
    [2, { 1: 1, 2: 4, 3: 2 }],
    [2, { 3: 5 }],
    [2, { 1: 3, 4: 5 }],
    [3, { 0: 6 }],
  ],
  3: [
    [3, { 1: 3, 2: 3, 3: 5, 4: 3 }],
    [4, { 4: 7 }],
    [4, { 0: 3, 3: 6, 4: 3 }],
    [5, { 0: 3, 4: 7 }],
  ],
};

export function buildDecks() {
  const decks = { 1: [], 2: [], 3: [] };
  for (const tier of [1, 2, 3]) {
    COLORS.forEach((color, ci) => {
      SHAPES[tier].forEach(([points, shape], si) => {
        const cost = {};
        for (const [offset, n] of Object.entries(shape)) cost[COLORS[(ci + Number(offset)) % 5]] = n;
        decks[tier].push({ id: `t${tier}-${color}-${si}`, tier, color, points, cost });
      });
    });
  }
  return decks;
}

/** Nobles: 3 points, need either 4+4 of two colors or 3+3+3 of three colors. */
export function allNobles() {
  const nobles = [];
  for (let i = 0; i < 5; i++) {
    const a = COLORS[i], b = COLORS[(i + 1) % 5], c = COLORS[(i + 2) % 5], d = COLORS[(i + 3) % 5];
    nobles.push({ id: `n4-${i}`, points: 3, need: { [a]: 4, [b]: 4 } });
    nobles.push({ id: `n3-${i}`, points: 3, need: { [a]: 3, [c]: 3, [d]: 3 } });
  }
  return nobles;
}
