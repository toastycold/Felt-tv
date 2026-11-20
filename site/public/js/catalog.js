// Loads the game list and individual game packages from /games.
const GAMES_ROOT = new URL('../games/', import.meta.url);

export async function loadCatalog() {
  const ids = await fetch(new URL('index.json', GAMES_ROOT)).then((r) => r.json());
  const configs = await Promise.all(
    ids.map((id) =>
      fetch(new URL(`${id}/game.config.json`, GAMES_ROOT))
        .then((r) => r.json())
        .then((cfg) => ({ ...cfg, coverUrl: new URL(`${id}/${cfg.cover || 'cover.svg'}`, GAMES_ROOT).href }))
        .catch(() => null)
    )
  );
  return configs.filter(Boolean);
}

/** Loads one game's config + code modules. */
export async function loadGame(id) {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error('Bad game id');
  const base = new URL(`${id}/`, GAMES_ROOT);
  const [config, engineMod, boardMod, playerMod] = await Promise.all([
    fetch(new URL('game.config.json', base)).then((r) => {
      if (!r.ok) throw new Error(`Game "${id}" not found`);
      return r.json();
    }),
    import(new URL('engine.js', base).href),
    import(new URL('board.js', base).href),
    import(new URL('player.js', base).href),
  ]);
  return {
    config,
    Engine: engineMod.default,
    renderBoard: boardMod.renderBoard,
    renderPlayer: playerMod.renderPlayer,
  };
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
