export function normalizePlayer(row) {
  return {
    name: String(row.name ?? "").trim(),
    attack: Number(row.attack),
    playmaking: Number(row.playmaker ?? row.playmaking),
    defence: Number(row.defence),
    rating: Number(row.rating),
    startingTeam: String(row.startingTeam ?? "").trim() || null,
    region: String(row.region ?? "").trim() || null,
    seasonStats: {
      games: 0,
      goals: 0,
      assists: 0,
      saves: 0
    }
  };
}

export function validatePlayer(player) {
  return Boolean(
    player.name &&
      Number.isFinite(player.attack) &&
      Number.isFinite(player.playmaking) &&
      Number.isFinite(player.defence) &&
      Number.isFinite(player.rating)
  );
}
