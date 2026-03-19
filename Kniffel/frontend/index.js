const CATEGORY_LABELS = {
  ones: "Einser",
  twos: "Zweier",
  threes: "Dreier",
  fours: "Vierer",
  fives: "Fuenfer",
  sixes: "Sechser",
  threeOfKind: "Dreierpasch",
  fourOfKind: "Viererpasch",
  fullHouse: "Full House",
  smallStraight: "Kleine Strasse",
  largeStraight: "Grosse Strasse",
  kniffel: "Kniffel",
  chance: "Chance"
};

function valueOrDash(value) {
  return value === null || value === undefined ? "-" : String(value);
}

export default {
  template: `
    <div>
      <div class="card" :style="styles.cardSpacing">
        <h2 :style="styles.heading">Kniffel</h2>
        <p v-if="error" :style="styles.error">{{ error }}</p>

        <div v-if="!state" :style="styles.loadingBox">
          Lade Spielstand...
        </div>

        <div v-else>
          <p :style="styles.metaText">
            Am Zug:
            <strong :style="styles.textStrong">{{ state.currentPlayerName || '-' }}</strong>
            <span :style="styles.metaSeparator">|</span>
            Wuerfe uebrig:
            <strong :style="styles.textStrong">{{ state.rollsLeft }}</strong>
          </p>

          <p v-if="state.gameOver" :style="styles.infoEnd">Das Spiel ist beendet.</p>
          <p v-else-if="canAct" :style="styles.infoSuccess">Du bist am Zug.</p>
          <p v-else :style="styles.infoMuted">Warte auf deinen Zug.</p>

          <div :style="styles.diceRow">
            <button
              v-for="(die, index) in state.dice"
              :key="index"
              class="btn-secondary"
              :disabled="!canToggleHold"
              @click="toggleHold(index)"
              :style="dieButtonStyle(index)"
            >
              <div :style="styles.dieValue">{{ die > 0 ? die : '-' }}</div>
              <small :style="styles.dieLabel">{{ state.held[index] ? 'halten' : 'frei' }}</small>
            </button>
          </div>

          <button class="btn-primary" :disabled="!canRoll" @click="rollDice">
            {{ state.rollsLeft === 3 ? 'Erster Wurf' : 'Neu wuerfeln' }}
          </button>
        </div>
      </div>

      <div class="card" :style="styles.cardSpacing">
        <h3 :style="styles.sectionHeading">Kategorie eintragen</h3>
        <div :style="styles.categoryGrid">
          <button
            v-for="category in openCategoriesForCurrentTurn"
            :key="category"
            class="btn-secondary"
            :disabled="!canScoreCategory"
            @click="scoreCategory(category)"
            :style="styles.categoryButton"
          >
            {{ labelFor(category) }} ({{ previewFor(category) }})
          </button>
        </div>

        <p v-if="state && !openCategoriesForCurrentTurn.length" :style="styles.infoMuted">
          Alle Kategorien sind vergeben.
        </p>
        <p v-if="state && state.rollsLeft === 3" :style="styles.infoMuted">
          Erst einmal wuerfeln, dann Kategorie waehlen.
        </p>
      </div>

      <div class="card">
        <h3 :style="styles.sectionHeading">Scoreboard</h3>
        <div v-if="!state" :style="styles.loadingBox">
          Noch keine Daten.
        </div>
        <div v-else :style="styles.playersGrid">
          <div
            v-for="player in state.players"
            :key="player.userId"
            :style="styles.playerCard"
          >
            <h4 :style="styles.playerName">{{ player.username }}</h4>
            <table :style="styles.table">
              <tbody>
                <tr v-for="category in state.categories" :key="category">
                  <td :style="styles.cellLabel">{{ labelFor(category) }}</td>
                  <td :style="styles.cellValue">{{ scoreFor(player.userId, category) }}</td>
                </tr>
                <tr>
                  <td :style="styles.cellLabel"><strong :style="styles.textStrong">Oben</strong></td>
                  <td :style="styles.cellValue">{{ subtotalFor(player.userId, 'upperSubtotal') }}</td>
                </tr>
                <tr>
                  <td :style="styles.cellLabel"><strong :style="styles.textStrong">Bonus</strong></td>
                  <td :style="styles.cellValue">{{ subtotalFor(player.userId, 'upperBonus') }}</td>
                </tr>
                <tr>
                  <td :style="styles.cellLabel"><strong :style="styles.textStrong">Unten</strong></td>
                  <td :style="styles.cellValue">{{ subtotalFor(player.userId, 'lowerSubtotal') }}</td>
                </tr>
                <tr>
                  <td :style="styles.cellLabel"><strong :style="styles.textStrong">Gesamt</strong></td>
                  <td :style="styles.cellValue">
                    <strong :style="styles.totalValue">{{ subtotalFor(player.userId, 'total') }}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,

  data() {
    return {
      socketRef: null,
      state: null,
      canAct: false,
      error: "",
      styles: {
        cardSpacing: { marginBottom: "1rem" },
        heading: {
          marginTop: "0",
          marginBottom: "0.75rem",
          color: "var(--color-text)"
        },
        sectionHeading: {
          marginTop: "0",
          marginBottom: "0.75rem",
          color: "var(--color-text)"
        },
        loadingBox: {
          textAlign: "center",
          padding: "1.5rem",
          color: "var(--color-text-muted)"
        },
        textStrong: { color: "var(--color-text)" },
        metaText: {
          marginBottom: "0.75rem",
          color: "var(--color-text-muted)"
        },
        metaSeparator: {
          margin: "0 0.35rem",
          color: "var(--color-text-muted)"
        },
        error: { color: "var(--color-danger)", fontWeight: "600" },
        infoSuccess: {
          marginTop: "0",
          marginBottom: "0.75rem",
          color: "var(--color-success)",
          fontWeight: "600"
        },
        infoEnd: {
          marginTop: "0",
          marginBottom: "0.75rem",
          color: "var(--color-warning)",
          fontWeight: "600"
        },
        infoMuted: {
          marginTop: "0.75rem",
          color: "var(--color-text-muted)"
        },
        diceRow: {
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "0.9rem"
        },
        dieValue: {
          color: "var(--color-text)",
          fontSize: "1.125rem",
          fontWeight: "700",
          lineHeight: "1.125rem"
        },
        dieLabel: { color: "var(--color-text-muted)" },
        categoryGrid: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
          gap: "0.5rem"
        },
        categoryButton: {
          textAlign: "left"
        },
        playersGrid: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(14rem, 1fr))",
          gap: "0.75rem"
        },
        playerCard: {
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)",
          padding: "0.75rem",
          backgroundColor: "var(--color-bg-secondary)"
        },
        playerName: {
          marginTop: "0",
          marginBottom: "0.5rem",
          color: "var(--color-text)"
        },
        table: { width: "100%", borderCollapse: "collapse" },
        cellLabel: {
          borderBottom: "1px solid var(--color-border)",
          padding: "0.25rem 0",
          textAlign: "left",
          color: "var(--color-text-muted)"
        },
        cellValue: {
          borderBottom: "1px solid var(--color-border)",
          padding: "0.25rem 0",
          textAlign: "right",
          color: "var(--color-text)"
        },
        totalValue: { color: "var(--color-primary)" }
      }
    };
  },

  computed: {
    canRoll() {
      return !!this.state && this.canAct && !this.state.gameOver && this.state.rollsLeft > 0;
    },
    canToggleHold() {
      return (
        !!this.state &&
        this.canAct &&
        !this.state.gameOver &&
        this.state.rollsLeft < 3 &&
        this.state.rollsLeft > 0
      );
    },
    canScoreCategory() {
      return !!this.state && this.canAct && !this.state.gameOver && this.state.rollsLeft < 3;
    },
    openCategoriesForCurrentTurn() {
      if (!this.state || !this.state.currentPlayerId) return [];
      const currentSheet = this.state.scores[this.state.currentPlayerId];
      if (!currentSheet) return [];

      const categories = this.state.categories || [];
      const open = [];
      for (const category of categories) {
        if (currentSheet[category] === null) open.push(category);
      }
      return open;
    }
  },

  mounted() {
    if (typeof socket === "undefined" || !socket) {
      this.error = "Socket-Verbindung nicht verfuegbar.";
      return;
    }

    this.socketRef = socket;
    this.onStateHandler = (payload) => {
      this.state = payload;
      this.error = "";
    };
    this.onErrorHandler = (payload) => {
      if (payload && typeof payload.message === "string") {
        this.error = payload.message;
      } else {
        this.error = "Unbekannter Fehler.";
      }
    };
    this.onTurnPermissionHandler = (payload) => {
      this.canAct = !!(payload && payload.canAct);
    };
    this.onGameOverHandler = () => {
      this.canAct = false;
    };

    this.socketRef.on("plugin:kniffel:state", this.onStateHandler);
    this.socketRef.on("plugin:kniffel:error", this.onErrorHandler);
    this.socketRef.on("plugin:kniffel:turn-permission", this.onTurnPermissionHandler);
    this.socketRef.on("plugin:kniffel:game-over", this.onGameOverHandler);

    this.emitGameEvent("init-request", {});
  },

  beforeUnmount() {
    this.teardownSocketListeners();
  },

  beforeDestroy() {
    this.teardownSocketListeners();
  },

  methods: {
    teardownSocketListeners() {
      if (!this.socketRef || typeof this.socketRef.off !== "function") return;
      if (this.onStateHandler) this.socketRef.off("plugin:kniffel:state", this.onStateHandler);
      if (this.onErrorHandler) this.socketRef.off("plugin:kniffel:error", this.onErrorHandler);
      if (this.onTurnPermissionHandler) {
        this.socketRef.off("plugin:kniffel:turn-permission", this.onTurnPermissionHandler);
      }
      if (this.onGameOverHandler) this.socketRef.off("plugin:kniffel:game-over", this.onGameOverHandler);
    },

    emitGameEvent(event, data) {
      if (!this.socketRef) return;
      this.socketRef.emit("game:event", { event, data });
    },

    labelFor(category) {
      return CATEGORY_LABELS[category] || category;
    },

    previewFor(category) {
      if (!this.state || !this.state.previewScores) return "-";
      return valueOrDash(this.state.previewScores[category]);
    },

    scoreFor(userId, category) {
      if (!this.state || !this.state.scores[userId]) return "-";
      return valueOrDash(this.state.scores[userId][category]);
    },

    subtotalFor(userId, key) {
      if (!this.state || !this.state.scores[userId]) return "0";
      return valueOrDash(this.state.scores[userId][key]);
    },

    dieButtonStyle(index) {
      const held = this.state && this.state.held ? this.state.held[index] : false;
      return {
        minWidth: "4.2rem",
        borderRadius: "var(--radius)",
        border: held
          ? "2px solid var(--color-primary)"
          : "1px solid var(--color-border)",
        backgroundColor: held
          ? "var(--color-bg-hover)"
          : "var(--color-bg-secondary)",
        color: "var(--color-text)",
        padding: "0.45rem 0.35rem"
      };
    },

    rollDice() {
      this.emitGameEvent("roll-dice", {});
    },

    toggleHold(index) {
      this.emitGameEvent("toggle-hold", { index });
    },

    scoreCategory(category) {
      this.emitGameEvent("score-category", { category });
    }
  }
};
