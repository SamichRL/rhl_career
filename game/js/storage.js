export const SEASON_STORAGE_PREFIX = "rhl-season:";

export function saveSeason(season, storage = window.localStorage) {
  const saved = {
    ...season,
    updatedAt: new Date().toISOString()
  };
  storage.setItem(`${SEASON_STORAGE_PREFIX}${season.id}`, JSON.stringify(saved));
  storage.setItem(`${SEASON_STORAGE_PREFIX}active`, season.id);
  return saved;
}

export function loadSeason(seasonId, storage = window.localStorage) {
  const savedId = seasonId ?? storage.getItem(`${SEASON_STORAGE_PREFIX}active`);
  if (!savedId) return null;

  const serialized = storage.getItem(`${SEASON_STORAGE_PREFIX}${savedId}`);
  return serialized ? JSON.parse(serialized) : null;
}

export function listSavedSeasonIds(storage = window.localStorage) {
  const ids = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(SEASON_STORAGE_PREFIX) && !key.endsWith(":active")) {
      ids.push(key.slice(SEASON_STORAGE_PREFIX.length));
    }
  }
  return ids;
}

export function deleteSeason(seasonId, storage = window.localStorage) {
  storage.removeItem(`${SEASON_STORAGE_PREFIX}${seasonId}`);
  if (storage.getItem(`${SEASON_STORAGE_PREFIX}active`) === seasonId) {
    storage.removeItem(`${SEASON_STORAGE_PREFIX}active`);
  }
}

export function exportSeason(season) {
  const blob = new Blob([JSON.stringify(season, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${season.id}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
