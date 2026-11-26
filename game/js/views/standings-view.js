import { getStandings } from "../season-engine.js";
import { createTeamLogo } from "./team-logo.js";

function renderStandingsGroup(region, season) {
  const group = document.createElement("section");
  group.className = "standings-group";
  const heading = document.createElement("h3");
  heading.className = "region";
  heading.textContent = region;
  group.append(heading);
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>Team</th><th>W</th><th>L</th><th>GD</th></tr></thead>";
  const body = document.createElement("tbody");
  getStandings(season, region).forEach((team, index) => {
    const row = document.createElement("tr");
    if (team.isUserTeam) row.className = "user-row";
    const teamCell = document.createElement("td");
    const teamLabel = document.createElement("span");
    teamLabel.className = "standing-team";
    teamLabel.append(document.createTextNode(`${index + 1}. `));
    const logo = createTeamLogo(team);
    if (logo) teamLabel.append(logo);
    teamLabel.append(document.createTextNode(
      `${team.name}${team.isUserTeam ? " (You)" : ""}`
    ));
    teamCell.append(teamLabel);
    const wins = document.createElement("td");
    wins.textContent = team.seriesWins;
    const losses = document.createElement("td");
    losses.textContent = team.seriesLosses;
    const gameDiff = document.createElement("td");
    gameDiff.textContent = team.gameWins - team.gameLosses;
    row.append(teamCell, wins, losses, gameDiff);
    body.append(row);
  });
  table.append(body);
  group.append(table);
  return group;
}

export function renderStandings(season, standingsContainer) {
  standingsContainer.replaceChildren(
    renderStandingsGroup("NA", season),
    renderStandingsGroup("EU", season)
  );
}
