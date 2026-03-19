const DICE_COUNT = 5;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;

const CATEGORY_ORDER = [
  "ones",
  "twos",
  "threes",
  "fours",
  "fives",
  "sixes",
  "threeOfKind",
  "fourOfKind",
  "fullHouse",
  "smallStraight",
  "largeStraight",
  "kniffel",
  "chance"
];

const UPPER_CATEGORIES = ["ones", "twos", "threes", "fours", "fives", "sixes"];
const LOWER_CATEGORIES = [
  "threeOfKind",
  "fourOfKind",
  "fullHouse",
  "smallStraight",
  "largeStraight",
  "kniffel",
  "chance"
];

function createEmptySheet() {
  return {
    ones: null,
    twos: null,
    threes: null,
    fours: null,
    fives: null,
    sixes: null,
    threeOfKind: null,
    fourOfKind: null,
    fullHouse: null,
    smallStraight: null,
    largeStraight: null,
    kniffel: null,
    chance: null
  };
}

function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function sum(values) {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

function countsForDice(dice) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const value of dice) {
    if (value >= 1 && value <= 6) counts[value] += 1;
  }
  return counts;
}

function hasNOfKind(counts, n) {
  for (let face = 1; face <= 6; face += 1) {
    if (counts[face] >= n) return true;
  }
  return false;
}

function hasFullHouse(counts) {
  let foundThree = false;
  let foundTwo = false;
  for (let face = 1; face <= 6; face += 1) {
    if (counts[face] === 3) foundThree = true;
    if (counts[face] === 2) foundTwo = true;
  }
  return foundThree && foundTwo;
}

function hasStraight(dice, neededLength) {
  const uniqueSorted = Array.from(new Set(dice)).sort((a, b) => a - b);
  let streak = 1;

  for (let i = 1; i < uniqueSorted.length; i += 1) {
    if (uniqueSorted[i] === uniqueSorted[i - 1] + 1) {
      streak += 1;
      if (streak >= neededLength) return true;
    } else {
      streak = 1;
    }
  }
  return false;
}

function scoreCategory(category, dice) {
  const counts = countsForDice(dice);
  const total = sum(dice);

  switch (category) {
    case "ones":
      return counts[1] * 1;
    case "twos":
      return counts[2] * 2;
    case "threes":
      return counts[3] * 3;
    case "fours":
      return counts[4] * 4;
    case "fives":
      return counts[5] * 5;
    case "sixes":
      return counts[6] * 6;
    case "threeOfKind":
      return hasNOfKind(counts, 3) ? total : 0;
    case "fourOfKind":
      return hasNOfKind(counts, 4) ? total : 0;
    case "fullHouse":
      return hasFullHouse(counts) ? 25 : 0;
    case "smallStraight":
      return hasStraight(dice, 4) ? 30 : 0;
    case "largeStraight":
      return hasStraight(dice, 5) ? 40 : 0;
    case "kniffel":
      return hasNOfKind(counts, 5) ? 50 : 0;
    case "chance":
      return total;
    default:
      return 0;
  }
}

function computeSheetTotals(sheet) {
  const upperSubtotal = sum(
    UPPER_CATEGORIES.map((key) => (typeof sheet[key] === "number" ? sheet[key] : 0))
  );
  const upperBonus = upperSubtotal >= 63 ? 35 : 0;
  const lowerSubtotal = sum(
    LOWER_CATEGORIES.map((key) => (typeof sheet[key] === "number" ? sheet[key] : 0))
  );
  const total = upperSubtotal + upperBonus + lowerSubtotal;

  return { upperSubtotal, upperBonus, lowerSubtotal, total };
}

function hasOpenCategory(sheet) {
  for (const category of CATEGORY_ORDER) {
    if (sheet[category] === null) return true;
  }
  return false;
}

function isGameOver(game) {
  return game.players.every((player) => !hasOpenCategory(game.scores[player.userId]));
}

function createNewGame(players) {
  const scores = {};
  for (const player of players) {
    scores[player.userId] = createEmptySheet();
  }

  return {
    players,
    currentPlayerIndex: 0,
    dice: [0, 0, 0, 0, 0],
    held: [false, false, false, false, false],
    rollsLeft: 3,
    finished: false,
    scores
  };
}

function isValidIndex(value) {
  return Number.isInteger(value) && value >= 0 && value < DICE_COUNT;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export default async function registerKniffel(context) {
  const games = new Map();

  function getCurrentPlayer(game) {
    return game.players[game.currentPlayerIndex];
  }

  function resetTurn(game) {
    game.dice = [0, 0, 0, 0, 0];
    game.held = [false, false, false, false, false];
    game.rollsLeft = 3;
  }

  function buildPublicScores(game) {
    const result = {};
    for (const player of game.players) {
      const rawSheet = game.scores[player.userId];
      result[player.userId] = {
        ...rawSheet,
        ...computeSheetTotals(rawSheet)
      };
    }
    return result;
  }

  function buildPreviewScores(game) {
    const preview = {};
    const currentPlayer = getCurrentPlayer(game);
    if (!currentPlayer) return preview;

    const currentSheet = game.scores[currentPlayer.userId];
    if (!currentSheet) return preview;

    for (const category of CATEGORY_ORDER) {
      if (currentSheet[category] !== null) continue;
      preview[category] = game.rollsLeft === 3 ? null : scoreCategory(category, game.dice);
    }

    return preview;
  }

  function buildPublicState(game) {
    const currentPlayer = getCurrentPlayer(game);
    return {
      gameOver: game.finished,
      players: game.players,
      currentPlayerId: currentPlayer ? currentPlayer.userId : null,
      currentPlayerName: currentPlayer ? currentPlayer.username : null,
      dice: game.dice,
      held: game.held,
      rollsLeft: game.rollsLeft,
      categories: CATEGORY_ORDER,
      previewScores: buildPreviewScores(game),
      scores: buildPublicScores(game)
    };
  }

  function sendError(lobbyId, userId, message) {
    context.ws.sendTo(lobbyId, userId, "error", { message });
  }

  function ensurePlayerInGame(game, userId, lobbyId) {
    const exists = game.players.some((player) => player.userId === userId);
    if (!exists) {
      sendError(lobbyId, userId, "Du bist kein aktiver Spieler in dieser Partie.");
      return false;
    }
    return true;
  }

  function ensureTurn(game, userId, lobbyId) {
    if (game.finished) {
      sendError(lobbyId, userId, "Das Spiel ist bereits beendet.");
      return false;
    }
    const currentPlayer = getCurrentPlayer(game);
    if (!currentPlayer || currentPlayer.userId !== userId) {
      sendError(lobbyId, userId, "Nicht dein Zug.");
      return false;
    }
    return true;
  }

  function advanceToNextPlayer(game) {
    const totalPlayers = game.players.length;
    let nextIndex = game.currentPlayerIndex;

    for (let step = 0; step < totalPlayers; step += 1) {
      nextIndex = (nextIndex + 1) % totalPlayers;
      const nextPlayer = game.players[nextIndex];
      if (nextPlayer && hasOpenCategory(game.scores[nextPlayer.userId])) {
        game.currentPlayerIndex = nextIndex;
        return;
      }
    }
  }

  async function publishState(lobbyId, game) {
    const state = buildPublicState(game);
    context.ws.broadcast(lobbyId, "state", state);

    for (const player of game.players) {
      context.ws.sendTo(lobbyId, player.userId, "turn-permission", {
        canAct: !game.finished && state.currentPlayerId === player.userId
      });
    }
  }

  async function finishGame(lobbyId, game) {
    if (game.finished) return;
    game.finished = true;

    const ranking = game.players
      .map((player) => {
        const totals = computeSheetTotals(game.scores[player.userId]);
        return {
          userId: player.userId,
          username: player.username,
          total: totals.total
        };
      })
      .sort((a, b) => b.total - a.total);

    const bestScore = ranking.length > 0 ? ranking[0].total : 0;
    const winners = ranking.filter((entry) => entry.total === bestScore);
    const winnerIds = winners.map((entry) => entry.userId);

    for (const entry of ranking) {
      const isWinner = winnerIds.includes(entry.userId);
      if (winnerIds.length === 1 && isWinner) {
        await context.stats.recordResult(entry.userId, { win: true, score: entry.total });
      } else if (winnerIds.length > 1 && isWinner) {
        await context.stats.recordResult(entry.userId, { draw: true, score: entry.total });
      } else {
        await context.stats.recordResult(entry.userId, { win: false, score: entry.total });
      }
    }

    context.ws.broadcast(lobbyId, "game-over", { ranking, winners: winnerIds });

    if (winners.length === 1) {
      context.chat.sendSystem(lobbyId, `Spiel beendet. Gewinner: ${winners[0].username} (${bestScore} Punkte).`);
    } else {
      const names = winners.map((player) => player.username).join(", ");
      context.chat.sendSystem(lobbyId, `Spiel beendet. Unentschieden zwischen: ${names} (${bestScore} Punkte).`);
    }

    await publishState(lobbyId, game);
    games.delete(lobbyId);
    await context.lobby.setStatus(lobbyId, "beendet");
  }

  async function getOrCreateGame(lobbyId, userId) {
    const existing = games.get(lobbyId);
    if (existing) return existing;

    const players = await context.lobby.getPlayers(lobbyId);
    if (players.length < MIN_PLAYERS) {
      sendError(lobbyId, userId, `Kniffel braucht mindestens ${MIN_PLAYERS} Spieler.`);
      return null;
    }
    if (players.length > MAX_PLAYERS) {
      sendError(lobbyId, userId, `Kniffel erlaubt maximal ${MAX_PLAYERS} Spieler.`);
      return null;
    }

    const game = createNewGame(players);
    games.set(lobbyId, game);
    const starter = getCurrentPlayer(game);
    context.chat.sendSystem(lobbyId, `Kniffel gestartet. ${starter.username} beginnt.`);
    return game;
  }

  async function withErrorBoundary(handler, data, userId, lobbyId) {
    try {
      await handler(data, userId, lobbyId);
    } catch (error) {
      const message = error && error.message ? error.message : "Unbekannter Fehler";
      console.error(`[${context.slug}] ${message}`);
      sendError(lobbyId, userId, "Interner Fehler. Bitte erneut versuchen.");
    }
  }

  context.ws.onMessage("init-request", async (data, userId, lobbyId) => {
    await withErrorBoundary(async () => {
      const game = await getOrCreateGame(lobbyId, userId);
      if (!game) return;
      if (!ensurePlayerInGame(game, userId, lobbyId)) return;
      await publishState(lobbyId, game);
    }, data, userId, lobbyId);
  });

  context.ws.onMessage("roll-dice", async (data, userId, lobbyId) => {
    await withErrorBoundary(async () => {
      const game = await getOrCreateGame(lobbyId, userId);
      if (!game) return;
      if (!ensurePlayerInGame(game, userId, lobbyId)) return;
      if (!ensureTurn(game, userId, lobbyId)) return;

      if (game.rollsLeft <= 0) {
        sendError(lobbyId, userId, "Keine Wuerfe mehr uebrig. Waehle eine Kategorie.");
        return;
      }

      const mustRollAllDice = game.rollsLeft === 3;
      for (let i = 0; i < DICE_COUNT; i += 1) {
        if (mustRollAllDice || !game.held[i]) {
          game.dice[i] = rollDie();
        }
      }
      game.rollsLeft -= 1;
      await publishState(lobbyId, game);
    }, data, userId, lobbyId);
  });

  context.ws.onMessage("toggle-hold", async (data, userId, lobbyId) => {
    await withErrorBoundary(async () => {
      const game = await getOrCreateGame(lobbyId, userId);
      if (!game) return;
      if (!ensurePlayerInGame(game, userId, lobbyId)) return;
      if (!ensureTurn(game, userId, lobbyId)) return;

      if (game.rollsLeft === 3) {
        sendError(lobbyId, userId, "Du musst zuerst einmal wuerfeln.");
        return;
      }
      if (game.rollsLeft <= 0) {
        sendError(lobbyId, userId, "Keine Wuerfe mehr uebrig. Waehle eine Kategorie.");
        return;
      }
      if (!isObject(data) || !isValidIndex(data.index)) {
        sendError(lobbyId, userId, "Ungueltiger Wuerfelindex.");
        return;
      }

      game.held[data.index] = !game.held[data.index];
      await publishState(lobbyId, game);
    }, data, userId, lobbyId);
  });

  context.ws.onMessage("score-category", async (data, userId, lobbyId) => {
    await withErrorBoundary(async () => {
      const game = await getOrCreateGame(lobbyId, userId);
      if (!game) return;
      if (!ensurePlayerInGame(game, userId, lobbyId)) return;
      if (!ensureTurn(game, userId, lobbyId)) return;

      if (!isObject(data) || typeof data.category !== "string") {
        sendError(lobbyId, userId, "Ungueltige Kategorie.");
        return;
      }
      if (!CATEGORY_ORDER.includes(data.category)) {
        sendError(lobbyId, userId, "Diese Kategorie gibt es nicht.");
        return;
      }
      if (game.rollsLeft === 3) {
        sendError(lobbyId, userId, "Du musst zuerst wuerfeln.");
        return;
      }

      const sheet = game.scores[userId];
      if (sheet[data.category] !== null) {
        sendError(lobbyId, userId, "Kategorie wurde bereits eingetragen.");
        return;
      }

      sheet[data.category] = scoreCategory(data.category, game.dice);

      if (isGameOver(game)) {
        await finishGame(lobbyId, game);
        return;
      }

      advanceToNextPlayer(game);
      resetTurn(game);
      await publishState(lobbyId, game);
    }, data, userId, lobbyId);
  });

  context.lobby.onPlayerLeave(async (userId, lobbyId) => {
    try {
      const game = games.get(lobbyId);
      if (!game || game.finished) return;

      const wasActivePlayer = game.players.some((player) => player.userId === userId);
      if (!wasActivePlayer) return;

      context.chat.sendSystem(
        lobbyId,
        "Ein aktiver Spieler hat die Lobby verlassen. Die Kniffel-Partie wurde abgebrochen."
      );
      games.delete(lobbyId);
      await context.lobby.setStatus(lobbyId, "geschlossen");
    } catch (error) {
      const message = error && error.message ? error.message : "Unbekannter Fehler";
      console.error(`[${context.slug}] PlayerLeave-Fehler: ${message}`);
    }
  });

  context.lobby.onPlayerJoin(async (userId, lobbyId) => {
    try {
      const game = games.get(lobbyId);
      if (!game || game.finished) return;

      const isPartOfGame = game.players.some((player) => player.userId === userId);
      if (!isPartOfGame) {
        context.chat.sendSystem(
          lobbyId,
          "Ein Spieler ist beigetreten. In laufenden Kniffel-Partien spielen nur die Startspieler mit."
        );
      }
      await publishState(lobbyId, game);
    } catch (error) {
      const message = error && error.message ? error.message : "Unbekannter Fehler";
      console.error(`[${context.slug}] PlayerJoin-Fehler: ${message}`);
    }
  });
}
