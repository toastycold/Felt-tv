// Telestrations rules. Sketchbooks stay hidden (this.secret) until the reveal;
// each player only receives the one page they need to work on.
import { BaseGameEngine } from '../../js/engine-base.js';
import { shuffle } from '../../js/ui.js';
import { WORDS } from './words.js';

export const TIMES = { draw: 45_000, guess: 20_000 };   // shortened after playtesting (was 75s / 35s)

export default class TelestrationsEngine extends BaseGameEngine {
  onInit() {
    this.state = {
      phase: 'lobby',      // lobby | choose | play | reveal | over
      seats: [], step: 0, steps: 0, task: '',
      done: {},            // id -> true once they've submitted this step
      deadline: 0,
      books: [],           // filled in at reveal time
      revealBook: 0, revealPage: 0, gallery: -1,
      game: 0,
    };
  }

  destroy() { clearTimeout(this.timer); }

  onGameStart() {
    super.onGameStart();
    const s = this.state;
    s.seats = shuffle(this.players.map((p) => p.id));
    s.steps = s.seats.length;
    s.game += 1;
    // Words this TV offered recently go to the back of the pile.
    let seen = new Set();
    try { seen = new Set(JSON.parse(localStorage.getItem('ts-seen') || '[]')); } catch { /* no storage */ }
    const all = shuffle([...WORDS, ...this.extraItems('word').map((x) => x.text)]);
    const words = [...all.filter((w) => !seen.has(w)), ...all.filter((w) => seen.has(w))];
    try {
      const used = [...seen, ...words.slice(0, s.seats.length * 2)];
      localStorage.setItem('ts-seen', JSON.stringify(used.length > WORDS.length - 30 ? used.slice(-60) : used));
    } catch { /* fine */ }
    this.secret.books = s.seats.map((owner) => ({ owner, word: '', pages: [] }));
    this.secret.options = Object.fromEntries(s.seats.map((id, i) => [id, [words[i * 2], words[i * 2 + 1]]]));
    this.private = {};
    Object.assign(s, { phase: 'choose', step: 0, task: '', done: {}, books: [], revealBook: 0, revealPage: 0, deadline: 0, gallery: -1 });
    for (const id of s.seats) this.setPrivate(id, { phase: 'choose', options: this.secret.options[id], game: s.game });
    this.sync();
  }

  bookIndexFor(seatIndex, step) {
    const n = this.state.seats.length;
    return (((seatIndex - step) % n) + n) % n;
  }

  /** Give every player their page for the current step. */
  handOut() {
    const s = this.state;
    s.task = s.step % 2 === 0 ? 'draw' : 'guess';
    s.done = {};
    s.seats.forEach((id, i) => {
      const book = this.secret.books[this.bookIndexFor(i, s.step)];
      const prev = book.pages[s.step - 1];
      const prompt = s.step === 0 ? { text: book.word } : prev.type === 'draw' ? { media: prev.media } : { text: prev.text };
      this.setPrivate(id, { phase: 'play', game: s.game, step: s.step, task: s.task, ...prompt });
    });
    const ms = TIMES[s.task];
    s.deadline = Date.now() + ms;
    clearTimeout(this.timer);
    const step = s.step;
    this.timer = setTimeout(() => { if (this.state.phase === 'play' && this.state.step === step) { this.advance(); this.sync(); } }, ms);
  }

  /** Fill in blanks for anyone who didn't finish, then move to the next step (or the reveal). */
  advance() {
    const s = this.state;
    const drafts = this.secret.drafts || {};
    s.seats.forEach((id, i) => {
      if (s.done[id]) return;
      const book = this.secret.books[this.bookIndexFor(i, s.step)];
      // Time ran out or the host moved on: keep whatever they had so far instead of a blank page.
      const d = drafts[id]?.step === s.step && drafts[id]?.game === s.game ? drafts[id] : null;
      if (s.task === 'draw') {
        const media = `g${s.game}-b${this.bookIndexFor(i, s.step)}-p${s.step}`;
        this.putMedia(media, d?.strokes || []);
        book.pages[s.step] = { by: id, type: 'draw', media };
      } else {
        book.pages[s.step] = { by: id, type: 'guess', text: d?.text || '' };
      }
    });
    this.secret.drafts = {};
    if (s.step + 1 >= s.steps) {
      clearTimeout(this.timer);
      s.phase = 'reveal';
      s.deadline = 0;
      s.books = this.secret.books;
      s.revealBook = 0;
      s.revealPage = 0;
      for (const id of s.seats) this.setPrivate(id, { phase: 'reveal', game: s.game });
      return;
    }
    s.step += 1;
    this.handOut();
  }

  maybeAdvance() {
    const s = this.state;
    const active = s.seats.filter((id) => this.players.find((p) => p.id === id)?.connected);
    if (active.every((id) => s.done[id])) this.advance();
  }

  onPlayerLeave() {
    const s = this.state;
    if (s.phase === 'play') this.maybeAdvance();
    this.sync();
  }

  processAction(type, p, meta) {
    const s = this.state;
    const me = meta.playerId;
    const host = meta.isBoard || meta.isVip;
    const seat = s.seats.indexOf(me);

    switch (type) {
      case 'game:choose': {
        if (s.phase !== 'choose' || seat === -1) return;
        const options = this.secret.options[me];
        if (!options.includes(p.word)) return;
        this.secret.books[seat].word = p.word;
        s.done[me] = true;
        this.setPrivate(me, { phase: 'choose', options, chosen: p.word, game: s.game });
        if (s.seats.every((id) => s.done[id])) { s.phase = 'play'; s.step = 0; this.handOut(); }
        break;
      }
      case 'game:draw': {
        if (s.phase !== 'play' || s.task !== 'draw' || seat === -1 || s.done[me]) return;
        const strokes = Array.isArray(p.strokes) ? p.strokes.slice(0, 400) : [];
        const b = this.bookIndexFor(seat, s.step);
        const media = `g${s.game}-b${b}-p${s.step}`;
        this.putMedia(media, strokes);
        this.secret.books[b].pages[s.step] = { by: me, type: 'draw', media };
        s.done[me] = true;
        this.maybeAdvance();
        break;
      }
      case 'game:guess': {
        if (s.phase !== 'play' || s.task !== 'guess' || seat === -1 || s.done[me]) return;
        const b = this.bookIndexFor(seat, s.step);
        this.secret.books[b].pages[s.step] = { by: me, type: 'guess', text: String(p.text || '').trim().slice(0, 50) };
        s.done[me] = true;
        this.maybeAdvance();
        break;
      }
      case 'game:draft': {   // work in progress, saved every few seconds in case time runs out
        if (s.phase !== 'play' || seat === -1 || s.done[me]) return;
        (this.secret.drafts ||= {})[me] = s.task === 'draw'
          ? { step: s.step, game: s.game, strokes: Array.isArray(p.strokes) ? p.strokes.slice(0, 400) : [] }
          : { step: s.step, game: s.game, text: String(p.text || '').trim().slice(0, 50) };
        return;   // nothing public changed
      }
      case 'game:gallery':   // TV: flip through every sketchbook at the end
        if (s.phase !== 'over' || !meta.isBoard) return;
        s.gallery = Math.max(-1, Math.min(s.books.length - 1, p.i | 0));
        break;
      case 'game:skip-wait':
        if (!host) return;
        if (s.phase === 'play') this.advance();
        else if (s.phase === 'choose') {
          // Anyone who hasn't picked gets their first option.
          s.seats.forEach((id, i) => { if (!this.secret.books[i].word) this.secret.books[i].word = this.secret.options[id][0]; });
          s.phase = 'play'; s.step = 0; this.handOut();
        } else return;
        break;
      case 'game:reveal-next': {
        if (s.phase !== 'reveal' || !host) return;
        const book = s.books[s.revealBook];
        // Reveal entries are: the original word (0), then each page (1..n)
        if (s.revealPage < book.pages.length) s.revealPage += 1;
        else if (s.revealBook < s.books.length - 1) { s.revealBook += 1; s.revealPage = 0; }
        else { s.phase = 'over'; s.gallery = -1; }
        break;
      }
      case 'game:reveal-prev':
        if (s.phase !== 'reveal' || !host) return;
        if (s.revealPage > 0) s.revealPage -= 1;
        else if (s.revealBook > 0) { s.revealBook -= 1; s.revealPage = s.books[s.revealBook].pages.length; }
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
