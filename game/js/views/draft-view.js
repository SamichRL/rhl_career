import { createPlayerCard } from "./player-card.js";
import { createTeamLogo } from "./team-logo.js";

export function renderDraft({ draft, currentDraftTeam, setup, teamsByName, elements, onSelectPlayer }) {
  const sections = [];
  if (draft.length > 0) {
    const picksHeading = document.createElement("h3");
    picksHeading.className = "draft-section-label";
    picksHeading.textContent = `Your picks (${draft.length}/3)`;
    sections.push(picksHeading);
    draft.forEach((player, index) => {
      sections.push(createPlayerCard(player, `Pick ${index + 1}`, null, teamsByName));
    });
  }
  if (currentDraftTeam) {
    const teamHeading = document.createElement("h3");
    teamHeading.className = "draft-section-label";
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
  elements.draftButton.textContent = draft.length === 0 ? "Draw a random team" : "Draw the next team";
  elements.startButton.disabled = draft.length !== 3;
}
