const TEAM_SIZE = 3;

function randomIndex(length, random) {
  return Math.min(length - 1, Math.floor(random() * length));
}

function takeRandom(values, random) {
  return values.splice(randomIndex(values.length, random), 1)[0];
}

function teamId(index) {
  return `team-${index + 1}`;
}

function buildDefaultTeams(players) {
  const playersByTeam = new Map();
  players.forEach((player) => {
    if (!player.startingTeam) return;
    const roster = playersByTeam.get(player.startingTeam) ?? [];
    roster.push(player);
    playersByTeam.set(player.startingTeam, roster);
  });

  return [...playersByTeam.entries()]
    .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
    .map(([name, roster], index) => {
      const regionCounts = roster.reduce((counts, player) => {
        const region = player.region === "na" ? "NA" : "EU";
        counts[region] = (counts[region] ?? 0) + 1;
        return counts;
      }, {});
      const region = Object.entries(regionCounts)
        .sort(([regionA, countA], [regionB, countB]) =>
          countB - countA || regionA.localeCompare(regionB)
        )[0][0];

      return {
        id: teamId(index),
        name,
        region,
        logo: `graphics/s10_logos/${name}.png`,
        players: [...roster]
          .sort((playerA, playerB) =>
            playerB.rating - playerA.rating || playerA.name.localeCompare(playerB.name)
          )
          .slice(0, TEAM_SIZE),
        isUserTeam: false,
        seriesWins: 0,
        seriesLosses: 0,
        gameWins: 0,
        gameLosses: 0,
        headToHead: {}
      };
    });
}

export function getDefaultTeams(players) {
  return buildDefaultTeams(players);
}

export function createCareerSetup(players, {
  teamId: selectedTeamId = null,
  teamName = "Your Team",
  draft: existingDraft = null,
  random = Math.random
} = {}) {
  const teams = buildDefaultTeams(players);
  if (teams.length !== 16 || players.length < teams.length * TEAM_SIZE) {
    throw new Error("The Season 10 setup needs 16 default teams and at least three players per team.");
  }

  const availableDraftPlayers = [...players];
  const draft = existingDraft
    ? [...existingDraft]
    : Array.from({ length: TEAM_SIZE }, () =>
      takeRandom(availableDraftPlayers, random)
    );
  if (draft.length !== TEAM_SIZE || new Set(draft.map((player) => player.name)).size !== TEAM_SIZE) {
    throw new Error("A career team must have three distinct players.");
  }
  const userTeam = selectedTeamId
    ? teams.find((team) => team.id === selectedTeamId)
    : teams[randomIndex(teams.length, random)];
  if (!userTeam) {
    throw new Error("Choose one of the 16 default teams or use the random team option.");
  }
  userTeam.name = String(teamName ?? "").trim() || "Your Team";
  const draftedNames = new Set(draft.map((player) => player.name));
  const assignedNames = new Set(draftedNames);

  teams.forEach((team) => {
    if (team.id === userTeam.id) {
      team.players = [...draft];
      team.isUserTeam = true;
      return;
    }
    team.players = team.players.filter((player) => !draftedNames.has(player.name));
    team.players.forEach((player) => assignedNames.add(player.name));
  });

  const freePlayers = players.filter((player) => !assignedNames.has(player.name));
  teams.forEach((team) => {
    while (team.players.length < TEAM_SIZE) {
      if (freePlayers.length === 0) {
        throw new Error(`Not enough available players to fill ${team.name}'s lineup.`);
      }
      const player = takeRandom(freePlayers, random);
      team.players.push(player);
      assignedNames.add(player.name);
    }
  });

  if (teams.some((team) => team.players.length !== TEAM_SIZE)) {
    throw new Error("Every team must have exactly three players before the season starts.");
  }

  return { teams, draft, userTeamId: userTeam.id };
}

