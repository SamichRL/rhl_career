import { createPlayerCard } from "./player-card.js";
import { createTeamLogo } from "./team-logo.js";

function createPickedPlayerChip(player, index, teamsByName) {
  const chip = document.createElement("div");
  chip.className = "picked-player";
  const team = teamsByName.get(player.startingTeam);
  const logo = createTeamLogo(team, "picked-player-logo");
  if (logo) chip.append(logo);
  const info = document.createElement("span");
  info.className = "picked-player-info";
  const name = document.createElement("span");
  name.className = "picked-player-name";
  name.textContent = player.name;
  const rating = document.createElement("span");
  rating.className = "picked-player-rating";
  rating.textContent = `Pick ${index + 1} · ${Math.round(player.rating)} overall`;
  info.append(name, rating);
  chip.append(info);
  return chip;
}

export function renderDraft({ draft, currentDraftTeam, setup, teamsByName, elements, onSelectPlayer }) {
  const sections = [];
  elements.draftProgress.textContent = `${draft.length} of 3 players picked`;
  elements.draftPicked.replaceChildren(
    ...draft.map((player, index) => createPickedPlayerChip(player, index, teamsByName))
  );
  if (currentDraftTeam) {
    const teamHeading = document.createElement("h3");
    teamHeading.className = "draft-section-label";
    teamHeading.id = "draft-candidates";
    const teamHeadingLogo = createTeamLogo(currentDraftTeam, "team-logo team-logo-small");
    teamHeading.append(teamHeadingLogo, document.createTextNode(
      `${currentDraftTeam.name} · ${currentDraftTeam.region} — choose one`
    ));
    sections.push(teamHeading);
    const pickedNames = new Set(draft.map((player) => player.name));
    currentDraftTeam.players
      .filter((player) => !pickedNames.has(player.name))
      .forEach((player) => {
        sections.push(createPlayerCard(player, "Available", () => onSelectPlayer(player), teamsByName));
      });
    elements.teamAssignment.hidden = false;
    elements.teamAssignment.textContent = `Pick ${draft.length + 1} of 3 · Choose a player from this randomly drawn team.`;
  } else if (draft.length === 3) {
    const userTeam = setup.teams.find((team) => team.id === setup.userTeamId);
    elements.teamAssignment.hidden = false;
    elements.teamAssignment.textContent = `You’ll take over ${userTeam.name} · ${userTeam.region}`;
  } else {
    elements.teamAssignment.hidden = false;
    elements.teamAssignment.textContent = draft.length === 0
      ? "Draw a random team to make your first pick."
      : `Pick ${draft.length + 1} of 3 · Draw another random team.`;
  }
  elements.draftPlayers.replaceChildren(...sections);
  elements.draftButton.disabled = Boolean(currentDraftTeam) || draft.length === 3;
  elements.draftButton.textContent = draft.length === 0
    ? "Draw a random team"
    : draft.length === 3
      ? "Draft complete"
      : "Draw the next team";
  elements.startButton.disabled = draft.length !== 3;
}
