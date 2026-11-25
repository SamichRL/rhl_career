import { createPlayerCard } from "./player-card.js";
import { createTeamLogo } from "./team-logo.js";

function createEmptyPick(index) {
  const slot = document.createElement("div");
  slot.className = "picked-player-slot is-empty";
  const label = document.createElement("span");
  label.className = "picked-slot-label";
  label.textContent = `Pick ${index + 1}`;
  const empty = document.createElement("span");
  empty.className = "picked-slot-empty";
  empty.textContent = "Open slot";
  slot.append(label, empty);
  return slot;
}

export function renderDraft({ draft, currentDraftTeam, teamsByName, elements, onSelectPlayer }) {
  const sections = [];
  elements.draftProgress.textContent = `${draft.length} / 3 picked`;
  const pickedCards = draft.map((player, index) => {
    const card = createPlayerCard(player, `Pick ${index + 1}`, null, teamsByName);
    card.classList.add("picked-roster-card");
    return card;
  });
  elements.draftPicked.replaceChildren(
    ...Array.from({ length: 3 }, (_, index) => pickedCards[index] ?? createEmptyPick(index))
  );

  if (currentDraftTeam) {
    const teamHeading = document.createElement("h3");
    teamHeading.className = "draft-section-label";
    teamHeading.id = "draft-candidates";
    const teamHeadingLogo = createTeamLogo(currentDraftTeam, "team-logo team-logo-small");
    if (teamHeadingLogo) teamHeading.append(teamHeadingLogo);
    teamHeading.append(document.createTextNode(
      `Choose one player · ${currentDraftTeam.name} · ${currentDraftTeam.region}`
    ));
    sections.push(teamHeading);

    const pickedNames = new Set(draft.map((player) => player.name));
    const availablePlayers = currentDraftTeam.players
      .filter((player) => !pickedNames.has(player.name));
    const columns = Math.min(3, availablePlayers.length);
    for (let index = 0; index < availablePlayers.length; index += 3) {
      const rowPlayers = availablePlayers.slice(index, index + 3);
      const row = document.createElement("div");
      row.className = "player-grid-row";
      row.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
      rowPlayers.forEach((player) => {
        row.append(createPlayerCard(player, "Available", () => onSelectPlayer(player), teamsByName));
      });
      sections.push(row);
    }
  }

  elements.draftPlayers.replaceChildren(...sections);
  elements.draftButton.hidden = draft.length === 3;
  elements.draftButton.disabled = Boolean(currentDraftTeam) || draft.length === 3;
  elements.draftButton.textContent = draft.length === 0
    ? "Draw a random team"
      : "Draw the next team";
  elements.startButton.hidden = draft.length !== 3;
  elements.startButton.disabled = draft.length !== 3;
}
