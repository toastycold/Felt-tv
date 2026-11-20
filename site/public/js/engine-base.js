/**
 * Base class every game engine extends. Same shape as Dallin's
 * @dallinking/boardgame-server BaseGameEngine, adapted for Firebase:
 * the engine runs in the HOST's browser and is the single source of truth.
 *
 * Lifecycle (called by the platform):
 *   onInit()                              room created, set this.state
 *   onPlayerJoin(playerId, name, isLate)  someone joined (isLate = game already started)
 *   onPlayerLeave(playerId)               someone left or was kicked
 *   onGameStart()                         host pressed Start
 *   processAction(type, payload, meta)    a phone (or the board) sent an action
 *   destroy()                             room closing; clear timers here
 *
 * meta = { playerId, isBoard, isVip, timestamp }  (filled in by the platform, can't be faked by phones)
 *
 * Three kinds of data, all saved by this.sync():
 *   this.state            public: the TV and every phone can read it
 *   this.secret           host only: nobody's phone can read it (e.g. the deck order, hidden roles)
 *   this.private[id]      only that player's phone can read it (e.g. their hand, their role)
 * Plus this.putMedia(id, data) for big one-off blobs (like drawings) that views load on demand.
 */
export class BaseGameEngine {
  constructor({ sync, getPlayers, putMedia }) {
    this._sync = sync;
    this._getPlayers = getPlayers;
    this._putMedia = putMedia || (() => {});
    this.state = {};
    this.extras = {};   // approved player suggestions: { kind: [fields, ...] }
    this.secret = {};
    this.private = {};
    this.hasStarted = false;
  }

  /** Players in join order: [{ id, name, isVip, connected }] */
  get players() {
    return this._getPlayers();
  }

  onInit() {}
  onPlayerJoin(_playerId, _name, _isLateJoin) {}
  onPlayerLeave(_playerId) {}
  onGameStart() {
    this.hasStarted = true;
  }
  processAction(_type, _payload, _meta) {}
  destroy() {}

  /** Approved suggestions of one kind, e.g. this.extraItems('prompt') -> [{ text }, ...] */
  extraItems(kind) {
    return this.extras?.[kind] || [];
  }

  /** Set (replace) one player's private data. Call sync() afterwards. */
  setPrivate(playerId, data) {
    this.private[playerId] = data;
  }

  /** Store a large blob once (drawings, images). Views load it with ctx.media(id). */
  putMedia(id, data) {
    this._putMedia(id, data);
  }

  /** Push state, secret and private data to the database. */
  sync() {
    this._sync(this.state, this.secret, this.private);
  }
}
