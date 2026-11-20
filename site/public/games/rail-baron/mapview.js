// Draws the rail map as SVG. The base map is built once; owners, pawns and routes are layered on top.
import { NET, RR } from './rules.js';
import { esc } from '../../js/ui.js';

export const SEAT_COLORS = ['#e0574e', '#4a8ad6', '#f2c230', '#5bc26a', '#b26be0', '#f0923a'];
const UNOWNED = 'rgba(232, 222, 190, .45)';

let baseCache = '';
function baseSvg() {
  if (baseCache) return baseCache;
  const byRR = {};
  for (const e of NET.edges) {
    const a = NET.nodes[e.a], b = NET.nodes[e.b];
    (byRR[e.rr] ||= []).push(`M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
  }
  const lines = Object.entries(byRR).map(([rr, d]) => `<path class="rb-rr" data-rr="${rr}" d="${d.join('')}"/>`).join('');
  const dots = NET.nodes.filter((n) => !n.place).map((n) => `M${n.x.toFixed(1)} ${n.y.toFixed(1)}h0`).join('');
  const cities = NET.nodes.filter((n) => n.place).map((n) => `<g class="rb-city ${n.city ? '' : 'town'}" data-city="${esc(n.place)}"><circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="3.6"/>
    <text x="${(n.x + 4.5).toFixed(1)}" y="${(n.y - 3.5).toFixed(1)}">${esc(n.place)}</text></g>`).join('');
  baseCache = `<g class="rb-lines">${lines}</g><path class="rb-dots" d="${dots}"/>${cities}`;
  return baseCache;
}

export const MAP_CSS = `
  .rb-map { display: block; width: 100%; height: auto; background: #10291f; border-radius: 12px; }
  .rb-rr { fill: none; stroke: ${UNOWNED}; stroke-width: 1.6; stroke-linecap: round; }
  .rb-dots { stroke: rgba(255,255,255,.55); stroke-width: 2.1; stroke-linecap: round; }
  .rb-city.town circle { fill: #c9c0a2; r: 2.2px; stroke: none; }
  .rb-city.town text { display: none; }
  .rb-pick .rb-city { cursor: pointer; }
  .rb-pick .rb-city circle { stroke: var(--gold, #f2c230); stroke-width: 1.4; }
  .rb-city circle { fill: #f7f0dc; stroke: #10291f; stroke-width: 1; }
  .rb-city text { font: 700 8px var(--body, sans-serif); fill: #f7f0dc; paint-order: stroke; stroke: #10291f; stroke-width: 2.4px; }
  .rb-route { fill: none; stroke: #fff; stroke-width: 4.5; stroke-linecap: round; stroke-linejoin: round; opacity: .9; stroke-dasharray: 1 7; }
  .rb-route.move { stroke-dasharray: none; stroke: var(--gold, #f2c230); opacity: 1; }
  .rb-pawn circle { stroke: #fff; stroke-width: 2; }
  .rb-pawn text { font: 900 9px var(--display, sans-serif); fill: #fff; text-anchor: middle; }
  .rb-pawn.now circle { animation: rb-pulse 1.2s ease-in-out infinite; }
  @keyframes rb-pulse { 50% { stroke-width: 5; } }
  .rb-dest { font: 900 16px sans-serif; text-anchor: middle; }
  .rb-declared { fill: none; stroke: #ff4b3e; stroke-width: 2.5; stroke-dasharray: 3 3; }
`;

function pathD(from, edges) {
  let v = from, d = `M${NET.nodes[v].x.toFixed(1)} ${NET.nodes[v].y.toFixed(1)}`;
  for (const e of edges) {
    const E = NET.edges[e];
    v = E.a === v ? E.b : E.a;
    d += `L${NET.nodes[v].x.toFixed(1)} ${NET.nodes[v].y.toFixed(1)}`;
  }
  return d;
}

/** Full map HTML. route = { from, edges, steps } to highlight. */
export const VIEW = (() => {
  const xs = NET.nodes.map((n) => n.x), ys = NET.nodes.map((n) => n.y);
  const x0 = Math.min(...xs) - 12, y0 = Math.min(...ys) - 14, x1 = Math.max(...xs) + 62, y1 = Math.max(...ys) + 12;
  return { x0, y0, w: x1 - x0, h: y1 - y0 };
})();

export function mapHtml(s, players, { route = null, pickable = false, viewBox = `${VIEW.x0} ${VIEW.y0} ${VIEW.w} ${VIEW.h}` } = {}) {
  const colorOf = (id) => SEAT_COLORS[s.seats.indexOf(id)] || '#999';
  const owned = Object.entries(s.owners || {}).map(([rr, id]) => `.rb-rr[data-rr="${rr}"]{stroke:${colorOf(id)};stroke-width:2.6}`).join('');
  let overlay = '';
  if (route && route.edges?.length) {
    overlay += `<path class="rb-route" d="${pathD(route.from, route.edges)}"/>`;
    overlay += `<path class="rb-route move" d="${pathD(route.from, route.edges.slice(0, route.steps))}"/>`;
  }
  const cur = s.seats[s.turn];
  const seen = {};
  for (const id of s.seats) {
    const p = s.p?.[id];
    if (!p || p.out) continue;
    const n = NET.nodes[p.pos];
    const k = (seen[p.pos] = (seen[p.pos] || 0) + 1) - 1;
    const x = n.x + k * 7, y = n.y - k * 7;
    if (p.dest && id === cur) {
      const d = NET.nodes[NET.byPlace[p.dest]];
      overlay += `<text class="rb-dest" x="${d.x}" y="${d.y + 5}" fill="${colorOf(id)}">★</text>`;
    }
    if (p.declared) overlay += `<circle class="rb-declared" cx="${x}" cy="${y}" r="13"/>`;
    const initial = esc((players.find((q) => q.id === id)?.name || '?')[0]);
    overlay += `<g class="rb-pawn ${id === cur ? 'now' : ''}"><circle cx="${x}" cy="${y}" r="7.5" fill="${colorOf(id)}"/><text x="${x}" y="${y + 3.2}">${initial}</text></g>`;
  }
  return `<svg class="rb-map ${pickable ? 'rb-pick' : ''}" viewBox="${viewBox}" role="img" aria-label="Rail map"><style>${owned}</style>${baseSvg()}${overlay}</svg>`;
}

export const rrName = (id) => RR[id]?.name || id;
