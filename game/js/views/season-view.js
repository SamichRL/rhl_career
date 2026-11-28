import { getChampion, getCurrentRound, getStandings } from "../season-engine.js";
import { createMatchCard } from "./match-view.js";
import { getPlayerTier } from "./player-card.js";
import { createTeamLogo } from "./team-logo.js";
import { createBracketView } from "./bracket-view.js";
import { renderStandings } from "./standings-view.js";

export function createSeasonView(elements, teamsByName) {
  const renderBracket = createBracketView(elements);
  function renderHistory(season) {
    elements.matchHistory.hidden = season.history.length === 0;
    elements.historyRounds.replaceChildren();
    season.history.forEach((round) => {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = `${round.title} · ${round.matches.length} series`;
      details.append(summary);
      const matches = document.createElement("div");
      matches.className = "match-list";
      round.matches.forEach((match) => matches.append(createMatchCard(match, season)));
      details.append(matches);
      elements.historyRounds.append(details);
    });
  }
  function renderChampion(season) {
    const champion = getChampion(season);
    elements.championBanner.hidden = !champion;
    if (!champion) return;
    elements.championBanner.replaceChildren();
    const logo = createTeamLogo(champion);
    if (logo) elements.championBanner.append(logo);
    const message = document.createElement("span");
    message.textContent = champion.isUserTeam
      ? `You are the RHL champion! ${champion.name} wins the International Championship.`
      : `${getFinishDescription(season)} ${champion.name} wins the RHL International Championship.`;
    elements.championBanner.append(message);
  }
  function getFinishDescription(season) {
    const rounds = [...season.history];
    if (season.activeRound?.resultsReady) rounds.push(season.activeRound);
    const userTeam = season.teams.find((team) => team.id === season.userTeamId);
    for (let roundIndex = rounds.length - 1; roundIndex >= 0; roundIndex -= 1) {
      const round = rounds[roundIndex];
      const match = [...round.matches].reverse().find((item) =>
        item.teamAId === season.userTeamId || item.teamBId === season.userTeamId
      );
      if (!match) continue;
      if (round.stage === "international_championship") {
        const placements = {
          international_grand_final: "2nd in the International Championship",
          international_lower_final: "3rd in the International Championship",
          international_lower_semi: "4th in the International Championship",
          international_lower_qf_1: "5th–6th in the International Championship",
          international_lower_qf_2: "5th–6th in the International Championship"
        };
        return `You finished ${placements[match.key] ?? "in the International Championship"}.`;
      }
      if (round.stage === "international_groups" && match.key.includes("lower_final")) {
        return `You finished 4th in Group ${match.group}.`;
      }
      if (round.stage === "regional_lcq") {
        const placement = match.key === "lower_final" ? "3rd" : "4th";
        return `You finished ${placement} in the ${match.region} Regional LCQ.`;
      }
    }
    const standing = getStandings(season, userTeam.region)
      .findIndex((team) => team.id === season.userTeamId);
    if (standing !== -1) {
      const position = standing + 1;
      const suffix = position % 100 >= 11 && position % 100 <= 13
        ? "th"
        : ({ 1: "st", 2: "nd", 3: "rd" }[position % 10] ?? "th");
      return `You finished ${position}${suffix} in ${userTeam.region} League Play.`;
    }
    return "You were eliminated before the International Championship.";
  }
  function getNextSimulationLabel(round, season) {
    if (round.stage === "league_play") {
      const nextWeek = season.currentWeek + 2;
      return nextWeek <= season.leagueWeeks.length
        ? `Simulate week ${nextWeek}`
        : "Simulate next round";
    }
    if (
      round.stage === "international_championship" &&
      season.stageRoundIndex === 3
    ) {
      return "Finish season";
    }
    return "Simulate next round";
  }
  function renderCurrentRound(season) {
    if (season.stage === "complete") {
      elements.weekDescription.textContent = "";
      elements.weekDescription.hidden = true;
      elements.weekDescription.classList.remove("error");
      elements.advanceButton.disabled = true;
      elements.advanceButton.textContent = "Season complete";
      const finalRound = season.history[season.history.length - 1];
      const userMatches = finalRound.matches.filter((match) =>
        match.teamAId === season.userTeamId || match.teamBId === season.userTeamId
      );
      elements.weekMatches.replaceChildren(...userMatches.map((match) => createMatchCard(match, season)));
      return;
    }
    const round = getCurrentRound(season);
    const userMatches = round.matches.filter((match) =>
      match.teamAId === season.userTeamId || match.teamBId === season.userTeamId
    );
    elements.weekDescription.textContent = "";
    elements.weekDescription.hidden = true;
    elements.weekDescription.classList.remove("error");
    elements.advanceButton.disabled = round.resultsReady;
    elements.advanceButton.textContent = round.resultsReady
      ? getNextSimulationLabel(round, season)
      : round.stage === "league_play"
        ? `Simulate week ${season.currentWeek + 1}`
        : "Simulate your match";
    elements.weekMatches.replaceChildren(...userMatches.map((match) => createMatchCard(match, season, {
      animate: round.resultsReady,
      onAnimationComplete: () => {
        elements.advanceButton.disabled = false;
      }
    })));
  }
  function renderSeason(season) {
    const userTeam = season.teams.find((team) => team.id === season.userTeamId);
    elements.seasonTitle.replaceChildren();
    elements.seasonTitle.classList.add("season-title-layout");
    const identity = document.createElement("span");
    identity.className = "season-team-identity";
    const logo = createTeamLogo(userTeam);
    if (logo) identity.append(logo);
    const teamName = document.createElement("span");
    teamName.className = "season-team-name";
    teamName.textContent = userTeam.name;
    const region = document.createElement("span");
    region.className = "season-team-region";
    region.textContent = userTeam.region;
    identity.append(teamName, region);

    const playerStrip = document.createElement("span");
    playerStrip.className = "season-player-strip";
    userTeam.players.forEach((player) => {
      const tier = getPlayerTier(Math.round(player.rating));
      const card = document.createElement("span");
      card.className = `season-player-card ${tier.className}`;
      const rating = document.createElement("strong");
      rating.className = "season-player-rating";
      rating.textContent = Math.round(player.rating);
      const playerTeam = teamsByName.get(player.startingTeam);
      const playerTeamLogo = createTeamLogo(playerTeam, "season-player-team-logo");
      const details = document.createElement("span");
      details.className = "season-player-details";
      const name = document.createElement("span");
      name.className = "season-player-name";
      name.textContent = player.name;
      const team = document.createElement("span");
      team.className = "season-player-team";
      team.textContent = playerTeam?.name ?? player.startingTeam ?? "RHL";
      details.append(name, team);
      const tierLabel = document.createElement("span");
      tierLabel.className = "season-player-tier";
      tierLabel.textContent = tier.name;
      card.append(rating);
      if (playerTeamLogo) card.append(playerTeamLogo);
      card.append(details, tierLabel);
      playerStrip.append(card);
    });
    elements.seasonTitle.append(identity, playerStrip);
    renderStandings(season, elements.standings);
    renderHistory(season);
    renderChampion(season);
    renderBracket(season);
    renderCurrentRound(season);
  }
  return renderSeason;
}
