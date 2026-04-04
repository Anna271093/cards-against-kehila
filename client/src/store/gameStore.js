import { create } from 'zustand';

// Persist room info to localStorage so refresh doesn't lose the game
function saveSession(roomCode, playerName) {
  try {
    if (roomCode && playerName) {
      localStorage.setItem('cak_session', JSON.stringify({ roomCode, playerName, ts: Date.now() }));
    } else {
      localStorage.removeItem('cak_session');
    }
  } catch {}
}

function loadSession() {
  try {
    const raw = localStorage.getItem('cak_session');
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Expire after 2 hours
    if (Date.now() - data.ts > 2 * 60 * 60 * 1000) {
      localStorage.removeItem('cak_session');
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

const saved = loadSession();

const useGameStore = create((set, get) => ({
  // Connection
  connected: false,
  setConnected: (val) => set({ connected: val }),

  // Screen navigation
  screen: saved ? 'reconnecting' : 'home',
  setScreen: (screen) => set({ screen }),

  // Room info
  roomCode: saved?.roomCode || null,
  playerName: saved?.playerName || null,
  playerId: null,
  isHost: false,

  // Room state from server
  players: [],
  hostId: null,
  state: 'lobby',
  currentBlackCard: null,
  currentJudgeIndex: 0,
  roundNumber: 0,
  maxRounds: 20,
  timerSeconds: 60,
  revealNames: true,
  gameMode: 'classic',
  cardMode: 'keep',

  // Player-specific
  myHand: [],
  selectedCards: [],
  hasSubmitted: false,
  canSwap: true,

  // Round state
  submissions: [],       // for judge or vote
  hasVoted: false,
  voteCount: 0,
  totalVoters: 0,
  submittedCount: 0,
  totalPlayers: 0,
  timerRemaining: null,
  winnerThisRound: null,
  winningCards: null,
  allSubmissions: [],
  tieWinners: null,

  // Scoreboard
  scoreboard: [],

  // Error
  errorMessage: null,
  setError: (msg) => {
    set({ errorMessage: msg });
    if (msg) setTimeout(() => set({ errorMessage: null }), 4000);
  },

  // Actions
  setRoomInfo: ({ roomCode, playerName, playerId, isHost }) => {
    saveSession(roomCode, playerName);
    set({ roomCode, playerName, playerId, isHost });
  },

  updateFromSnapshot: (snapshot) => {
    const state = get();
    const me = snapshot.players?.find((p) => p.id === state.playerId);
    const isHost = snapshot.hostId === state.playerId;

    // Persist session
    const rc = snapshot.roomCode || state.roomCode;
    if (rc && state.playerName) {
      saveSession(rc, state.playerName);
    }

    const updates = {
      players: snapshot.players || [],
      hostId: snapshot.hostId,
      state: snapshot.state,
      currentBlackCard: snapshot.currentBlackCard,
      currentJudgeIndex: snapshot.currentJudgeIndex,
      roundNumber: snapshot.roundNumber,
      maxRounds: snapshot.maxRounds,
      timerSeconds: snapshot.timerSeconds,
      revealNames: snapshot.revealNames,
      gameMode: snapshot.gameMode || 'classic',
      cardMode: snapshot.cardMode || 'keep',
      roomCode: snapshot.roomCode || state.roomCode,
      isHost,
    };

    // Update hand if provided
    if (me?.hand) {
      updates.myHand = me.hand;
    }

    // Map state to screen
    if (snapshot.state === 'lobby') {
      updates.screen = 'lobby';
      updates.selectedCards = [];
      updates.hasSubmitted = false;
      updates.submissions = [];
      updates.winnerThisRound = null;
    } else if (snapshot.state === 'playing') {
      updates.screen = 'playing';
      updates.hasSubmitted = false;
      updates.canSwap = true;
      updates.selectedCards = [];
      updates.submissions = [];
      updates.winnerThisRound = null;
      updates.timerRemaining = snapshot.timerSeconds || null;
    } else if (snapshot.state === 'judging') {
      updates.screen = 'judging';
      updates.hasVoted = false;
      updates.voteCount = 0;
    } else if (snapshot.state === 'reveal') {
      updates.screen = 'reveal';
    } else if (snapshot.state === 'finished') {
      updates.screen = 'finished';
    }

    set(updates);
  },

  selectCard: (index) => {
    const { selectedCards, currentBlackCard } = get();
    const maxPick = currentBlackCard?.pick || 1;

    if (selectedCards.includes(index)) {
      // Deselect
      set({ selectedCards: selectedCards.filter((i) => i !== index) });
    } else if (selectedCards.length < maxPick) {
      // Select
      set({ selectedCards: [...selectedCards, index] });
    }
  },

  markSubmitted: (newHand) => {
    set({
      hasSubmitted: true,
      selectedCards: [],
      myHand: newHand || get().myHand,
    });
  },

  setSubmissions: (subs) => set({ submissions: subs }),

  setSubmissionCount: (submitted, total) =>
    set({ submittedCount: submitted, totalPlayers: total }),

  setTimerRemaining: (seconds) => set({ timerRemaining: seconds }),

  setRoundWinner: (winner, scoreboard) =>
    set({
      winnerThisRound: winner,
      scoreboard,
      screen: 'reveal',
    }),

  setGameOver: (scoreboard) =>
    set({
      scoreboard,
      screen: 'finished',
      state: 'finished',
    }),

  resetGame: () => {
    saveSession(null, null);
    set({
      screen: 'home',
      roomCode: null,
      playerName: null,
      playerId: null,
      isHost: false,
      players: [],
      hostId: null,
      state: 'lobby',
      currentBlackCard: null,
      currentJudgeIndex: 0,
      roundNumber: 0,
      myHand: [],
      selectedCards: [],
      hasSubmitted: false,
      canSwap: true,
      submissions: [],
      submittedCount: 0,
      totalPlayers: 0,
      timerRemaining: null,
      winnerThisRound: null,
      winningCards: null,
      allSubmissions: [],
      tieWinners: null,
      scoreboard: [],
      errorMessage: null,
    });
  },
}));

export default useGameStore;
