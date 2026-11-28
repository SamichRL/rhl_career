const BASE_GOALS = 2.31;
function randomIndex(length, random) {
  return Math.min(length - 1, Math.floor(random() * length));
}

function takeRandom(values, random) {
  return values.splice(randomIndex(values.length, random), 1)[0];
}

export function shuffle(values, random) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, random);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function average(players, attribute) {
  return players.reduce((total, player) => total + player[attribute], 0) / players.length;
}

function goalsExpected(team, opponent) {
  const ratingDifference =
    average(team.players, "rating") - average(opponent.players, "rating");
  return BASE_GOALS * Math.exp(0.01 * ratingDifference);
}

function poisson(lambda, random) {
  const threshold = Math.exp(-lambda);
  let count = 0;
  let product = 1;

  do {
    count += 1;
    product *= random();
  } while (product > threshold);

  return count - 1;
}

function simulateGame(teamA, teamB, random) {
  const formA = 0.85 + random() * 0.3;
  const formB = 0.85 + random() * 0.3;
  const rateA = goalsExpected(teamA, teamB) * formA;
  const rateB = goalsExpected(teamB, teamA) * formB;
  const regulationA = poisson(rateA, random);
  const regulationB = poisson(rateB, random);
  const overtime = regulationA === regulationB;
  let scoreA = regulationA;
  let scoreB = regulationB;

  if (overtime) {
    if (random() < rateA / (rateA + rateB)) {
      scoreA += 1;
    } else {
      scoreB += 1;
    }
  }

  return { regulationA, regulationB, scoreA, scoreB, overtime };
}

export function simulateSeries(teamA, teamB, match, random, forcedWinnerId = null) {
  const winsRequired = Math.ceil(match.bestOf / 2);
  let winsA = match.advantageA ?? 0;
  let winsB = match.advantageB ?? 0;
  const games = [];

  while (winsA < winsRequired && winsB < winsRequired) {
    const game = simulateGame(teamA, teamB, random);
    if (forcedWinnerId === teamA.id && game.scoreA <= game.scoreB) {
      [game.regulationA, game.regulationB] = [game.regulationB, game.regulationA];
      [game.scoreA, game.scoreB] = [game.scoreB, game.scoreA];
    } else if (forcedWinnerId === teamB.id && game.scoreB <= game.scoreA) {
      [game.regulationA, game.regulationB] = [game.regulationB, game.regulationA];
      [game.scoreA, game.scoreB] = [game.scoreB, game.scoreA];
    }
    if (game.scoreA > game.scoreB) {
      winsA += 1;
    } else {
      winsB += 1;
    }
    games.push(game);
  }

  const winner = winsA > winsB ? teamA : teamB;
  const loser = winsA > winsB ? teamB : teamA;
  return {
    games,
    teamAWins: winsA,
    teamBWins: winsB,
    winnerId: winner.id,
    loserId: loser.id
  };
}

