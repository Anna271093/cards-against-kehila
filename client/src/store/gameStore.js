import { create } from 'zustand';

const useGameStore = create((set, get) => ({
  // Connection
  connected: false,
  setConnected: (val) => set({ connected: val }),

  // Screen navigation
  screen: 'home', // home | join | create | lobby | playing | judging | reveal | finished
  setScreen: (screen) => set({ screen }),

  // Room info
  roomCode: null,
  playerName: null,
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

  // Scoreboard
  scoreboard: [],

  // Error
  errorMessage: null,
  setError: (msg) => {
    set({ errorMessage: msg });
    if (msg) setTimeout(() => set({ errorMessage: null }), 4000);
  },

  // Actions
  setRoomInfo: ({ roomCode, playerName, playerId, isHost }) =>
    set({ roomCode, playerName, playerId, isHost }),

  updateFromSnapshot: (snapshot) => {
    const state = get();
    const me = snapshot.players?.find((p) => p.id === state.playerId);
    const isJudge = snapshot.players?.[snapshot.currentJudgeIndex]?.id === state.playerId;
    const isHost = snapshot.hostId === state.playerId;

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

  resetGame: () =>
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
      scoreboard: [],
      errorMessage: null,
    }),
}));

export default useGameStore;
