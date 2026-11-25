import { createTeamLogo } from "./team-logo.js";

export function createMatchCard(match, season) {
  const teamA = season.teams.find((team) => team.id === match.teamAId);
  const teamB = season.teams.find((team) => team.id === match.teamBId);
  const result = match.result;
  const card = document.createElement("article");
  card.className = "match-card";
  if (teamA.isUserTeam || teamB.isUserTeam) card.classList.add("user-match");
  const label = document.createElement("div");
  label.className = "match-label";
  label.textContent = match.label ?? "Season match";
  card.append(label);
  const sideA = document.createElement("div");
  sideA.className = "match-team";
  const identityA = document.createElement("div");
  identityA.className = "team-name";
  const nameA = document.createElement("strong");
  nameA.textContent = teamA.name;
  identityA.append(createTeamLogo(teamA), nameA);
  const regionA = document.createElement("small");
  regionA.textContent = teamA.isUserTeam ? "Your team" : teamA.region;
  sideA.append(identityA, regionA);
  const score = document.createElement("div");
  score.className = "match-score";
  score.textContent = result ? `${result.teamAWins} – ${result.teamBWins}` : "vs";
  const sideB = document.createElement("div");
  sideB.className = "match-team";
  const identityB = document.createElement("div");
  identityB.className = "team-name";
  const nameB = document.createElement("strong");
  nameB.textContent = teamB.name;
  identityB.append(createTeamLogo(teamB), nameB);
  const regionB = document.createElement("small");
  regionB.textContent = teamB.isUserTeam ? "Your team" : teamB.region;
  sideB.append(identityB, regionB);
  card.append(sideA, score, sideB);
  const gameScores = document.createElement("small");
  gameScores.className = "match-detail";
  gameScores.style.gridColumn = "1 / -1";
  gameScores.style.color = "var(--muted)";
  const scoreLines = result
    ? result.games.map((game) =>
      `${game.scoreA}-${game.scoreB}${game.overtime ? " OT" : ""}`
    ).join(" · ")
    : "Scheduled";
  const advantage = match.advantageA || match.advantageB
    ? ` · Starting advantage ${match.advantageA}-${match.advantageB}`
    : "";
  gameScores.textContent = `${scoreLines}${advantage}`;
  card.append(gameScores);
  return card;
}
