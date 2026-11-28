import { createCareerSetup, getDefaultTeams } from "./season-engine.js";

export function createDraftController({
  getPlayers,
  getDraft,
  setDraft,
  getSetup,
  setSetup,
  getCurrentDraftTeam,
  setCurrentDraftTeam,
  getDraftChoicesVisible,
  setDraftChoicesVisible,
  defaultTeamsByName,
  teamSelect,
  teamNameInput,
  draftButton,
  draftPlayers,
  draftLayout,
  reelColumn,
  teamReelElement,
  teamReel,
  stackedDraftLayout,
  renderDraft,
  setStatus
}) {
  function syncDraftLayout() {
    const draft = getDraft();
    const currentDraftTeam = getCurrentDraftTeam();
    if (stackedDraftLayout.matches && draft.length === 3) {
      teamReelElement.hidden = true;
      draftPlayers.hidden = false;
      draftLayout.after(draftPlayers);
      return;
    }
    if (!stackedDraftLayout.matches) {
      if (currentDraftTeam) setDraftChoicesVisible(true);
      teamReelElement.hidden = false;
      draftPlayers.hidden = false;
      draftLayout.after(draftPlayers);
      return;
    }
    if (currentDraftTeam && getDraftChoicesVisible()) {
      teamReelElement.hidden = true;
      reelColumn.append(draftPlayers);
      draftPlayers.hidden = false;
      return;
    }
    teamReelElement.hidden = false;
    draftPlayers.hidden = true;
    draftLayout.after(draftPlayers);
  }

  async function drawRandomTeam() {
    const draft = getDraft();
    if (draft.length === 3 || getCurrentDraftTeam() || teamReel.isSpinning()) return;
    try {
      const players = getPlayers();
      const pickedNames = new Set(draft.map((player) => player.name));
      const teams = new Map();
      players.forEach((player) => {
        if (!player.startingTeam || pickedNames.has(player.name)) return;
        const roster = teams.get(player.startingTeam) ?? [];
        roster.push(player);
        teams.set(player.startingTeam, roster);
      });
      const defaultTeamDetails = new Map(getDefaultTeams(players).map((team) => [team.name, team]));
      const availableTeams = [...teams.entries()]
        .filter(([, roster]) => roster.length > 0)
        .map(([name, roster]) => ({
          name,
          region: defaultTeamDetails.get(name)?.region,
          logo: defaultTeamDetails.get(name)?.logo,
          players: roster.sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name))
        }));
      if (availableTeams.length === 0) throw new Error("No teams have players available for the next pick.");
      const drawnTeam = availableTeams[Math.floor(Math.random() * availableTeams.length)];
      draftButton.disabled = true;
      draftButton.textContent = "Drawing…";
      setStatus("Drawing a random team…");
      await teamReel.spin(availableTeams, drawnTeam);
      setCurrentDraftTeam(drawnTeam);
      setDraftChoicesVisible(false);
      renderDraft();
      if (stackedDraftLayout.matches) {
        setStatus("Team drawn. Player choices will appear shortly.");
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (getCurrentDraftTeam() === drawnTeam && stackedDraftLayout.matches) {
          setDraftChoicesVisible(true);
          syncDraftLayout();
        }
      }
      document.querySelector("#draft-candidates")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start"
      });
      setStatus("Choose one player from the randomly drawn team.");
    } catch (error) {
      console.error(error);
      renderDraft();
      setStatus(error.message, true);
    }
  }

  function buildSetup(draft) {
    return createCareerSetup(getPlayers(), {
      teamId: teamSelect.value || null,
      teamName: teamNameInput.value,
      draft
    });
  }

  function selectDraftPlayer(player) {
    const draft = getDraft();
    const currentDraftTeam = getCurrentDraftTeam();
    if (!currentDraftTeam?.players.includes(player) || draft.length >= 3) return;
    const nextDraft = [...draft, player];
    setDraft(nextDraft);
    setCurrentDraftTeam(null);
    setDraftChoicesVisible(false);
    if (stackedDraftLayout.matches) teamReel.reset();
    if (nextDraft.length === 3) {
      try {
        setSetup(buildSetup(nextDraft));
        renderDraft();
        setStatus("Your squad is ready. The other teams use their highest-rated available players.");
      } catch (error) {
        console.error(error);
        setStatus(error.message, true);
      }
    } else {
      renderDraft();
      setStatus(`Player ${nextDraft.length} selected. Draw another random team for your next pick.`);
    }
  }

  function updateSelectedTeam() {
    const draft = getDraft();
    if (draft.length !== 3) return;
    try {
      setSetup(buildSetup(draft));
      renderDraft();
    } catch (error) {
      console.error(error);
      setStatus(error.message, true);
    }
  }

  function updateTeamName() {
    const setup = getSetup();
    if (!setup) return;
    const userTeam = setup.teams.find((team) => team.id === setup.userTeamId);
    if (!userTeam) throw new Error("Could not find your selected team.");
    userTeam.name = teamNameInput.value.trim() || "Your Team";
    renderDraft();
  }

  return { drawRandomTeam, selectDraftPlayer, syncDraftLayout, updateSelectedTeam, updateTeamName };
}
