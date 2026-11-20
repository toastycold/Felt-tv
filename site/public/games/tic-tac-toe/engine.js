// Tic Tac Toe rules. Runs on the host screen and is the only thing that changes the game state.
import { BaseGameEngine } from '../../js/engine-base.js';

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];
const CPU = 'cpu';
const other = (m) => (m === 'X' ? 'O' : 'X');

export default class TicTacToeEngine extends BaseGameEngine {
  onInit() {
    this.state = {
      phase: 'lobby',             // lobby | playing | over
      cells: Array(9).fill(''),   // '' | 'X' | 'O'
      turn: 'X',
      starter: 'X',
      seats: { X: '', O: '' },    // player id, or 'cpu'
      winner: '',                 // '' | 'X' | 'O' | 'draw'
      line: [],
      scores: { X: 0, O: 0, draw: 0 },
      round: 1,
    };
  }

  onGameStart() {
    super.onGameStart();
    const [first, second] = this.players;
    this.state.seats = { X: first?.id || CPU, O: second?.id || CPU };
    this.newRound('X');
  }

  // A late joiner takes over a computer seat if there is one.
  onPlayerJoin(playerId) {
    if (!this.hasStarted) return;
    const seats = this.state.seats;
    const free = ['X', 'O'].find((m) => seats[m] === CPU);
    if (free) {
      seats[free] = playerId;
      this.sync();
    }
  }

  // If a seated player leaves, the computer takes over their side.
  onPlayerLeave(playerId) {
    const seats = this.state.seats;
    for (const m of ['X', 'O']) if (seats[m] === playerId) seats[m] = CPU;
    if (this.hasStarted) {
      this.sync();
      this.maybeCpuMove();
    }
  }

  processAction(type, payload, meta) {
    const s = this.state;
    switch (type) {
      case 'game:move':
        if (s.phase !== 'playing') return;
        if (s.seats[s.turn] !== meta.playerId) return; // not your turn
        this.place(payload.index);
        break;

      case 'game:rematch': {
        if (s.phase !== 'over') return;
        const seated = Object.values(s.seats).includes(meta.playerId);
        if (!meta.isBoard && !meta.isVip && !seated) return;
        s.round += 1;
        this.newRound(other(s.starter)); // alternate who goes first
        break;
      }

      default:
        console.warn('[tic-tac-toe] Unknown action', type);
    }
  }

  newRound(starter) {
    Object.assign(this.state, {
      phase: 'playing', cells: Array(9).fill(''), turn: starter, starter, winner: '', line: [],
    });
    this.sync();
    this.maybeCpuMove();
  }

  place(index) {
    const s = this.state;
    if (!Number.isInteger(index) || index < 0 || index > 8 || s.cells[index]) return;
    s.cells[index] = s.turn;

    const line = LINES.find((l) => l.every((i) => s.cells[i] === s.turn));
    if (line) {
      Object.assign(s, { phase: 'over', winner: s.turn, line });
      s.scores[s.turn] += 1;
    } else if (s.cells.every(Boolean)) {
      Object.assign(s, { phase: 'over', winner: 'draw' });
      s.scores.draw += 1;
    } else {
      s.turn = other(s.turn);
    }
    this.sync();
    this.maybeCpuMove();
  }

  maybeCpuMove() {
    const s = this.state;
    if (s.phase !== 'playing' || s.seats[s.turn] !== CPU) return;
    clearTimeout(this.cpuTimer);
    this.cpuTimer = setTimeout(() => {
      if (this.state.phase === 'playing' && this.state.seats[this.state.turn] === CPU) {
        this.place(this.pickCpuMove());
      }
    }, 700);
  }

  // Simple but decent: win, else block, else center, else corner, else anything.
  pickCpuMove() {
    const { cells, turn } = this.state;
    const empty = cells.map((c, i) => (c ? null : i)).filter((i) => i !== null);
    const finishing = (mark) =>
      empty.find((i) => LINES.some((l) => l.includes(i) && l.every((k) => k === i || cells[k] === mark)));
    const win = finishing(turn);
    if (win !== undefined) return win;
    const block = finishing(other(turn));
    if (block !== undefined) return block;
    if (!cells[4]) return 4;
    const corners = [0, 2, 6, 8].filter((i) => !cells[i]);
    const pool = corners.length ? corners : empty;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  destroy() {
    clearTimeout(this.cpuTimer);
  }
}
