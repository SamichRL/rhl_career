import { createTeamLogo } from "./team-logo.js";

export function createMatchCard(match, season) {
  const teamA = season.teams.find((team) => team.id === match.teamAId);
  const teamB = season.teams.find((team) => team.id === match.teamBId);
  const userOnRight = teamB.isUserTeam && !teamA.isUserTeam;
  const leftTeam = userOnRight ? teamB : teamA;
  const rightTeam = userOnRight ? teamA : teamB;
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
  nameA.textContent = leftTeam.name;
  identityA.append(createTeamLogo(leftTeam), nameA);
  const regionA = document.createElement("small");
  regionA.textContent = leftTeam.isUserTeam ? "Your team" : leftTeam.region;
  sideA.append(identityA, regionA);
  const score = document.createElement("div");
  score.className = "match-score";
  const leftWins = userOnRight ? result?.teamBWins : result?.teamAWins;
  const rightWins = userOnRight ? result?.teamAWins : result?.teamBWins;
  score.textContent = result ? `${leftWins} – ${rightWins}` : "vs";
  const sideB = document.createElement("div");
  sideB.className = "match-team";
  const identityB = document.createElement("div");
  identityB.className = "team-name";
  const nameB = document.createElement("strong");
  nameB.textContent = rightTeam.name;
  identityB.append(createTeamLogo(rightTeam), nameB);
  const regionB = document.createElement("small");
  regionB.textContent = rightTeam.isUserTeam ? "Your team" : rightTeam.region;
  sideB.append(identityB, regionB);
  card.append(sideA, score, sideB);
  const gameScores = document.createElement("small");
  gameScores.className = "match-detail";
  gameScores.style.gridColumn = "1 / -1";
  gameScores.style.color = "var(--muted)";
  const scoreLines = result
    ? result.games.map((game) =>
      `${userOnRight ? game.scoreB : game.scoreA}-${userOnRight ? game.scoreA : game.scoreB}${game.overtime ? " OT" : ""}`
    ).join(" · ")
    : "Scheduled";
  const advantageA = userOnRight ? match.advantageB : match.advantageA;
  const advantageB = userOnRight ? match.advantageA : match.advantageB;
  const advantage = advantageA || advantageB
    ? ` · Starting advantage ${advantageA}-${advantageB}`
    : "";
  gameScores.textContent = `${scoreLines}${advantage}`;
  card.append(gameScores);
  return card;
}
