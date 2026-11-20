// Quiplash rules. Rounds 1–2: head-to-head prompts. Round 3: everyone answers one final prompt.
import { BaseGameEngine } from '../../js/engine-base.js';
import { shuffle } from '../../js/ui.js';
import { PROMPTS, FINAL_PROMPTS } from './prompts.js';

export const TIMES = { answer: 90_000, vote: 20_000, result: 7_000, finalAnswer: 60_000, finalVote: 30_000 };
const MAX_LEN = 80;

export default class QuiplashEngine extends BaseGameEngine {
  onInit() {
    this.state = {
      phase: 'lobby',  // lobby | answer | vote | matchup-result | scores | final-answer | final-vote | final-result | over
      round: 0,
      prompts: [],     // [{ text, authors: [a, b], answers: { a: '', b: '' } }]
      order: [],       // matchup order (prompt indexes)
      matchup: 0,
      votes: {},       // voterId -> authorId
      result: null,    // { points: { authorId: n }, quiplash: authorId | '' }
      final: null,     // { text, answers: { id: text }, votes: { voterId: authorId } }
      deadline: 0,
      scores: {},
      used: [],
    };
  }

  // ---------- helpers ----------
  after(ms, fn) {
    clearTimeout(this.timer);
    this.state.deadline = Date.now() + ms;
    this.timer = setTimeout(() => { this.state.deadline = 0; fn(); this.sync(); }, ms);
  }
  stopTimer() { clearTimeout(this.timer); this.state.deadline = 0; }
  destroy() { clearTimeout(this.timer); }

  drawPrompts(n) {
    const s = this.state;
    const pool = [...PROMPTS, ...this.extraItems('prompt').map((x) => x.text)];
    const fresh = shuffle(pool.filter((p) => !s.used.includes(p))).slice(0, n);
    s.used.push(...fresh);
    return fresh;
  }

  // ---------- flow ----------
  onGameStart() {
    super.onGameStart();
    const s = this.state;
    s.scores = Object.fromEntries(this.players.map((p) => [p.id, 0]));
    s.used = [];
    s.round = 0;
    this.startRound();
  }

  startRound() {
    const s = this.state;
    s.round += 1;
    s.result = null;
    if (s.round <= 2) {
      const ids = shuffle(this.players.map((p) => p.id));
      const n = ids.length;
      const texts = this.drawPrompts(n);
      // Prompt k goes to players k and k+1, so everyone answers exactly two.
      s.prompts = texts.map((text, k) => {
        const authors = [ids[k], ids[(k + 1) % n]];
        return { text, authors, answers: { [authors[0]]: '', [authors[1]]: '' } };
      });
      s.phase = 'answer';
      this.after(TIMES.answer, () => this.endAnswers());
    } else {
      s.final = { text: shuffle(FINAL_PROMPTS)[0], answers: {}, votes: {} };
      s.phase = 'final-answer';
      this.after(TIMES.finalAnswer, () => this.endFinalAnswers());
    }
    this.sync();
  }

  allAnswered() {
    const s = this.state;
    const active = new Set(this.players.filter((p) => p.connected).map((p) => p.id));
    return s.prompts.every((p) => p.authors.every((a) => !active.has(a) || p.answers[a]));
  }

  endAnswers() {
    const s = this.state;
    this.stopTimer();
    s.order = shuffle(s.prompts.map((_, i) => i));
    s.matchup = 0;
    this.startVote();
  }

  startVote() {
    const s = this.state;
    if (s.matchup >= s.order.length) {
      this.stopTimer();
      s.phase = 'scores';
      return;
    }
    s.votes = {};
    s.result = null;
    s.phase = 'vote';
    this.after(TIMES.vote, () => this.endVote());
  }

  voters(prompt) {
    return this.players.filter((p) => p.connected && !prompt.authors.includes(p.id));
  }

  endVote() {
    const s = this.state;
    const prompt = s.prompts[s.order[s.matchup]];
    const mult = 100 * s.round;
    const counts = Object.fromEntries(prompt.authors.map((a) => [a, 0]));
    for (const choice of Object.values(s.votes)) if (choice in counts) counts[choice] += 1;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const points = {};
    let quiplash = '';
    for (const a of prompt.authors) {
      points[a] = counts[a] * mult;
      if (total >= 2 && counts[a] === total && prompt.answers[a]) { points[a] += mult; quiplash = a; }
      s.scores[a] = (s.scores[a] || 0) + points[a];
    }
    s.result = { counts, points, quiplash };
    s.phase = 'matchup-result';
    this.after(TIMES.result, () => { s.matchup += 1; this.startVote(); });
  }

  endFinalAnswers() {
    const s = this.state;
    this.stopTimer();
    s.phase = 'final-vote';
    this.after(TIMES.finalVote, () => this.endFinalVote());
  }

  endFinalVote() {
    const s = this.state;
    this.stopTimer();
    const counts = {};
    for (const choice of Object.values(s.final.votes)) counts[choice] = (counts[choice] || 0) + 1;
    for (const [id, c] of Object.entries(counts)) s.scores[id] = (s.scores[id] || 0) + c * 300;
    s.final.counts = counts;
    s.phase = 'final-result';
  }

  onPlayerJoin(id) {
    if (!this.hasStarted) return;
    this.state.scores[id] ??= 0;
    this.sync();
  }

  onPlayerLeave() {
    const s = this.state;
    if (s.phase === 'answer' && this.allAnswered()) this.endAnswers();
    this.sync();
  }

  // ---------- actions ----------
  processAction(type, p, meta) {
    const s = this.state;
    const me = meta.playerId;
    const clean = (t) => String(t || '').trim().replace(/\s+/g, ' ').slice(0, MAX_LEN);
    const host = meta.isBoard || meta.isVip;

    switch (type) {
      case 'game:answer': {
        if (s.phase !== 'answer') return;
        const prompt = s.prompts[p.index];
        const text = clean(p.text);
        if (!prompt || !prompt.authors.includes(me) || !text) return;
        prompt.answers[me] = text;
        if (this.allAnswered()) this.endAnswers();
        break;
      }
      case 'game:vote': {
        if (s.phase !== 'vote') return;
        const prompt = s.prompts[s.order[s.matchup]];
        if (prompt.authors.includes(me) || !prompt.authors.includes(p.choice) || meta.isBoard) return;
        s.votes[me] = p.choice;
        if (this.voters(prompt).every((v) => s.votes[v.id])) this.endVote();
        break;
      }
      case 'game:final-answer': {
        const text = clean(p.text);
        if (s.phase !== 'final-answer' || !text || meta.isBoard) return;
        s.final.answers[me] = text;
        if (this.players.filter((x) => x.connected).every((x) => s.final.answers[x.id])) this.endFinalAnswers();
        break;
      }
      case 'game:final-vote': {
        if (s.phase !== 'final-vote' || meta.isBoard || p.choice === me || !s.final.answers[p.choice]) return;
        s.final.votes[me] = p.choice;
        const voters = this.players.filter((x) => x.connected && Object.keys(s.final.answers).some((a) => a !== x.id));
        if (voters.every((v) => s.final.votes[v.id])) this.endFinalVote();
        break;
      }
      case 'game:skip-wait':
        if (!host) return;
        if (s.phase === 'answer') this.endAnswers();
        else if (s.phase === 'vote') this.endVote();
        else if (s.phase === 'final-answer') this.endFinalAnswers();
        else if (s.phase === 'final-vote') this.endFinalVote();
        else return;
        break;
      case 'game:next':
        if (!host) return;
        if (s.phase === 'matchup-result') { s.matchup += 1; this.startVote(); }
        else if (s.phase === 'scores') { this.startRound(); return; }
        else if (s.phase === 'final-result') { s.phase = 'over'; }
        else return;
        break;
      case 'game:play-again':
        if (s.phase !== 'over' || !host) return;
        this.onGameStart();
        return;
      default:
        return;
    }
    this.sync();
  }
}
