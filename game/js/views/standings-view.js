import { getStandings } from "../season-engine.js";
import { createTeamLogo } from "./team-logo.js";

function createStandingsGroup(region, userRegion) {
  const group = document.createElement("section");
  group.className = "standings-group";
  if (region === userRegion) group.classList.add("user-region");
  const heading = document.createElement("h3");
  heading.className = "region";
  heading.textContent = `${region} League Play Standings`;
  const table = document.createElement("table");
  table.className = "standings-table";
  table.innerHTML = "<colgroup><col class=\"standings-team-column\"><col span=\"3\" class=\"standings-stat-column\"></colgroup><thead><tr><th>Team</th><th>W</th><th>L</th><th>GD</th></tr></thead>";
  const body = document.createElement("tbody");
  table.append(body);
  group.append(heading, table);
  return { group, body, rows: new Map() };
}

function createStandingRow(team) {
  const row = document.createElement("tr");
  row.dataset.teamId = team.id;
  const teamCell = document.createElement("td");
  const wins = document.createElement("td");
  const losses = document.createElement("td");
  const gameDiff = document.createElement("td");
  row.append(teamCell, wins, losses, gameDiff);
  return row;
}

function updateStandingRow(row, team, index) {
  row.classList.toggle("user-row", team.isUserTeam);
  const teamCell = row.cells[0];
  teamCell.replaceChildren();
  const teamLabel = document.createElement("span");
  teamLabel.className = "standing-team";
  const rank = document.createElement("span");
  rank.className = "rank";
  rank.textContent = index + 1;
  teamLabel.append(rank);
  const logo = createTeamLogo(team, "team-logo team-logo-small standing-logo");
  if (logo) teamLabel.append(logo);
  teamLabel.append(document.createTextNode(`${team.name}${team.isUserTeam ? " (You)" : ""}`));
  teamCell.append(teamLabel);
  row.cells[1].textContent = team.seriesWins;
  row.cells[2].textContent = team.seriesLosses;
  row.cells[3].textContent = team.gameWins - team.gameLosses;
}

function updateGroup(state, region, season) {
  const standings = getStandings(season, region);
  const previousPositions = new Map(
    [...state.rows.entries()].map(([id, row]) => [id, row.getBoundingClientRect()])
  );
  const activeIds = new Set(standings.map((team) => team.id));
  for (const [id, row] of state.rows) {
    if (!activeIds.has(id)) {
      row.remove();
      state.rows.delete(id);
    }
  }

  standings.forEach((team, index) => {
    let row = state.rows.get(team.id);
    if (!row) {
      row = createStandingRow(team);
      state.rows.set(team.id, row);
    }
    updateStandingRow(row, team, index);
    state.body.append(row);
  });

  for (const [id, row] of state.rows) {
    const previous = previousPositions.get(id);
    if (!previous || typeof row.animate !== "function") continue;
    const current = row.getBoundingClientRect();
    const offset = previous.top - current.top;
    if (offset) {
      row.animate(
        [{ transform: `translateY(${offset}px)` }, { transform: "translateY(0)" }],
        { duration: 1000, easing: "cubic-bezier(.2,.75,.25,1)" }
      );
    }
  }
}

export function renderStandings(season, standingsContainer) {
  const userTeam = season.teams.find((team) => team.id === season.userTeamId);
  if (!standingsContainer.standingsGroups) {
    standingsContainer.standingsGroups = new Map(
      ["NA", "EU"].map((region) => [region, createStandingsGroup(region, userTeam.region)])
    );
    standingsContainer.replaceChildren(
      ...[...standingsContainer.standingsGroups.values()].map((state) => state.group)
    );
  }
  for (const [region, state] of standingsContainer.standingsGroups) {
    updateGroup(state, region, season);
  }
}
