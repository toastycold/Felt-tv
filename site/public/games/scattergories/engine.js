// Scattergories rules. Answers stay hidden (this.secret) until review so nobody can copy.
import { BaseGameEngine } from '../../js/engine-base.js';
import { shuffle } from '../../js/ui.js';
import { CATEGORIES, LETTERS } from './categories.js';

export const ROUNDS = 3;
export const PER_ROUND = 12;
export const ANSWER_MS = 150_000;

/** Lowercase letters only, ignoring a leading "a/an/the". */
export function normalize(text) {
  return String(text || '').toLowerCase().replace(/^\s*(the|an|a)\s+/, '').replace(/[^a-z0-9]/g, '');
}

export default class ScattergoriesEngine extends BaseGameEngine {
  onInit() {
    this.state = {
      phase: 'lobby',     // lobby | answer | review | round-over | over
      round: 0, letter: '', categories: [],
      deadline: 0,
      submitted: {},      // id -> true when they pressed Done
      review: 0,          // category index being reviewed
      answers: {},        // during review: id -> [12 answers]
      auto: {},           // during review: `${k}:${id}` -> 'empty' | 'letter' | 'duplicate'
      challenges: {},     // `${k}:${id}` -> [voter ids]
      roundPoints: {}, scores: {},
      usedLetters: [],
    };
  }

  destroy() { clearTimeout(this.timer); }

  onGameStart() {
    super.onGameStart();
    const s = this.state;
    s.scores = Object.fromEntries(this.players.map((p) => [p.id, 0]));
    s.round = 0;
    s.usedLetters = [];
    this.startRound();
  }

  startRound() {
    const s = this.state;
    const letter = shuffle(LETTERS.filter((l) => !s.usedLetters.includes(l)))[0];
    s.usedLetters.push(letter);
    this.secret.answers = {};
    this.private = {};
    Object.assign(s, {
      phase: 'answer', round: s.round + 1, letter,
      categories: shuffle([...CATEGORIES, ...this.extraItems('category').map((x) => x.text)]).slice(0, PER_ROUND),
      submitted: {}, review: 0, answers: {}, auto: {}, challenges: {}, roundPoints: {},
      deadline: Date.now() + ANSWER_MS,
    });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.startReview(); this.sync(); }, ANSWER_MS);
    this.sync();
  }

  startReview() {
    const s = this.state;
    if (s.phase !== 'answer') return;
    clearTimeout(this.timer);
    s.deadline = 0;
    const ids = this.players.map((p) => p.id).filter((id) => this.secret.answers[id]);
    s.answers = Object.fromEntries(ids.map((id) => [id, this.secret.answers[id]]));
    // Automatic checks: blank, wrong letter, or the same as someone else's answer.
    for (let k = 0; k < PER_ROUND; k++) {
      for (const id of ids) {
        const raw = s.answers[id][k] || '';
        const n = normalize(raw);
        if (!n) s.auto[`${k}:${id}`] = 'empty';
        else if (n[0] !== s.letter.toLowerCase()) s.auto[`${k}:${id}`] = 'letter';
        else if (ids.some((o) => o !== id && normalize(s.answers[o][k]) === n)) s.auto[`${k}:${id}`] = 'duplicate';
      }
    }
    s.phase = 'review';
    s.review = 0;
  }

  /** An answer is thrown out if it failed a check or at least half of the other players challenged it. */
  isOut(k, id) {
    const s = this.state;
    if (s.auto[`${k}:${id}`]) return true;
    const others = Object.keys(s.answers).length - 1;
    const votes = (s.challenges[`${k}:${id}`] || []).length;
    return others > 0 && votes >= Math.ceil(others / 2);
  }

  finishRound() {
    const s = this.state;
    s.roundPoints = {};
    for (const id of Object.keys(s.answers)) {
      let pts = 0;
      for (let k = 0; k < PER_ROUND; k++) if (!this.isOut(k, id)) pts += 1;
      s.roundPoints[id] = pts;
      s.scores[id] = (s.scores[id] || 0) + pts;
    }
    s.phase = s.round >= ROUNDS ? 'over' : 'round-over';
  }

  onPlayerJoin(id) {
    if (!this.hasStarted) return;
    this.state.scores[id] ??= 0;
    this.sync();
  }

  processAction(type, p, meta) {
    const s = this.state;
    const me = meta.playerId;
    const host = meta.isBoard || meta.isVip;

    switch (type) {
      case 'game:answers': {
        if (s.phase !== 'answer' || meta.isBoard || !Array.isArray(p.answers)) return;
        const list = Array.from({ length: PER_ROUND }, (_, k) => String(p.answers[k] || '').trim().slice(0, 40));
        this.secret.answers[me] = list;
        this.setPrivate(me, { answers: list, round: s.round }); // so a refresh doesn't lose them
        if (p.done) s.submitted[me] = true;
        s.scores[me] ??= 0;
        const active = this.players.filter((x) => x.connected);
        if (active.length && active.every((x) => s.submitted[x.id])) this.startReview();
        break;
      }
      case 'game:stop-early':
        if (s.phase !== 'answer' || !host) return;
        this.startReview();
        break;
      case 'game:challenge': {
        if (s.phase !== 'review' || meta.isBoard || p.id === me || !s.answers[p.id]) return;
        const key = `${s.review}:${p.id}`;
        const list = s.challenges[key] || [];
        s.challenges[key] = list.includes(me) ? list.filter((x) => x !== me) : [...list, me];
        break;
      }
      case 'game:next-category':
        if (s.phase !== 'review' || !host) return;
        if (s.review < PER_ROUND - 1) s.review += 1;
        else this.finishRound();
        break;
      case 'game:prev-category':
        if (s.phase !== 'review' || !host || s.review === 0) return;
        s.review -= 1;
        break;
      case 'game:next-round':
        if (s.phase !== 'round-over' || !host) return;
        this.startRound();
        return;
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
