import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import useGameStore from '../store/gameStore';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

// Keep Render alive — ping /api/health every 4 minutes
const KEEP_ALIVE_MS = 4 * 60 * 1000;
let keepAliveInterval = null;

function startKeepAlive() {
  if (keepAliveInterval) return;
  const url = (SERVER_URL || '') + '/api/health';
  keepAliveInterval = setInterval(() => {
    fetch(url).catch(() => {});
  }, KEEP_ALIVE_MS);
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

let socketInstance = null;

function getSocket() {
  if (!socketInstance) {
    socketInstance = io(SERVER_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socketInstance;
}

export default function useSocket() {
  const store = useGameStore();
  const storeRef = useRef(store);
  storeRef.current = store;

  const socket = getSocket();

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    startKeepAlive();

    const s = storeRef;

    socket.on('connect', () => {
      s.current.setConnected(true);
      // Save socket ID as playerId
      useGameStore.setState({ playerId: socket.id });

      // Try to rejoin if we had a room (e.g. after refresh)
      const { roomCode, playerName, screen } = useGameStore.getState();
      if (roomCode && playerName) {
        socket.emit('rejoin_room', { roomCode, playerName });
        // If rejoin fails (room gone), error_msg will fire and we handle below
        if (screen === 'reconnecting') {
          // Give 3 seconds for rejoin, then fall back to home
          setTimeout(() => {
            const current = useGameStore.getState();
            if (current.screen === 'reconnecting') {
              current.resetGame();
            }
          }, 3000);
        }
      }
    });

    socket.on('disconnect', () => {
      s.current.setConnected(false);

      // If we were in a game, show reconnecting state
      const { screen } = useGameStore.getState();
      if (screen !== 'home' && screen !== 'join' && screen !== 'create') {
        useGameStore.setState({ screen: 'reconnecting' });
      }
    });

    // Server fully gave up reconnecting — reset to home
    socket.on('reconnect_failed', () => {
      const { screen } = useGameStore.getState();
      if (screen === 'reconnecting') {
        s.current.setError('החיבור לשרת נותק. חוזרים למסך הבית.');
        s.current.resetGame();
      }
    });

    socket.on('room_created', (snapshot) => {
      useGameStore.setState({ playerId: socket.id, isHost: true });
      s.current.updateFromSnapshot(snapshot);
      s.current.setScreen('lobby');
    });

    socket.on('player_joined', (snapshot) => {
      s.current.updateFromSnapshot(snapshot);
    });

    socket.on('settings_updated', (snapshot) => {
      s.current.updateFromSnapshot(snapshot);
    });

    socket.on('game_started', (snapshot) => {
      useGameStore.setState({ playerId: socket.id });
      s.current.updateFromSnapshot(snapshot);
    });

    socket.on('new_round', (snapshot) => {
      useGameStore.setState({ playerId: socket.id });
      s.current.updateFromSnapshot(snapshot);
    });

    socket.on('card_submitted', ({ hand }) => {
      s.current.markSubmitted(hand);
    });

    socket.on('player_submitted', ({ submitted, total }) => {
      s.current.setSubmissionCount(submitted, total);
    });

    socket.on('all_submitted', ({ submissions, voteMode }) => {
      s.current.setSubmissions(submissions);
      s.current.setScreen('judging');
      if (voteMode) {
        useGameStore.setState({ hasVoted: false });
      }
    });

    socket.on('waiting_for_judge', () => {
      s.current.setScreen('judging');
    });

    socket.on('vote_accepted', () => {
      useGameStore.setState({ hasVoted: true });
    });

    socket.on('vote_counted', ({ voteCount, totalVoters }) => {
      useGameStore.setState({ voteCount, totalVoters });
    });

    socket.on('round_winner', ({ winner, scoreboard, roomSnapshot }) => {
      useGameStore.setState({
        winnerThisRound: winner,
        winningCards: winner.cards,
        allSubmissions: roomSnapshot?.submissions || [],
      });
      s.current.setRoundWinner(winner, scoreboard);
      if (roomSnapshot) s.current.updateFromSnapshot(roomSnapshot);
    });

    socket.on('game_over', ({ scoreboard, roomSnapshot }) => {
      s.current.setGameOver(scoreboard);
      if (roomSnapshot) s.current.updateFromSnapshot(roomSnapshot);
    });

    socket.on('game_reset', (snapshot) => {
      s.current.updateFromSnapshot(snapshot);
    });

    socket.on('player_left', ({ playerName: name, roomSnapshot }) => {
      if (roomSnapshot) s.current.updateFromSnapshot(roomSnapshot);
    });

    socket.on('player_reconnected', ({ roomSnapshot }) => {
      if (roomSnapshot) s.current.updateFromSnapshot(roomSnapshot);
    });

    socket.on('rejoin_success', (snapshot) => {
      useGameStore.setState({ playerId: socket.id });
      s.current.updateFromSnapshot(snapshot);
    });

    socket.on('judge_changed', (snapshot) => {
      useGameStore.setState({ playerId: socket.id });
      s.current.updateFromSnapshot(snapshot);
    });

    socket.on('timer_tick', ({ remaining }) => {
      s.current.setTimerRemaining(remaining);
    });

    socket.on('round_skipped', () => {
      // Timer expired, nobody submitted — server auto-advances
    });

    socket.on('card_swapped', ({ hand }) => {
      useGameStore.setState({ myHand: hand, canSwap: false });
    });

    socket.on('error_msg', ({ message }) => {
      s.current.setError(message);

      // If the room is gone (server restarted), send player home
      const { screen } = useGameStore.getState();
      const roomGone = message === 'החדר לא נמצא' || message === 'לא נמצא שחקן עם שם זה';
      if (roomGone && screen !== 'home' && screen !== 'join' && screen !== 'create') {
        s.current.setError('השרת אותחל מחדש והמשחק אבד. מצטערים!');
        s.current.resetGame();
      }
    });

    return () => {
      stopKeepAlive();
      socket.off('connect');
      socket.off('disconnect');
      socket.off('reconnect_failed');
      socket.off('room_created');
      socket.off('player_joined');
      socket.off('settings_updated');
      socket.off('game_started');
      socket.off('new_round');
      socket.off('card_submitted');
      socket.off('player_submitted');
      socket.off('all_submitted');
      socket.off('waiting_for_judge');
      socket.off('round_winner');
      socket.off('game_over');
      socket.off('game_reset');
      socket.off('player_left');
      socket.off('player_reconnected');
      socket.off('rejoin_success');
      socket.off('judge_changed');
      socket.off('timer_tick');
      socket.off('round_skipped');
      socket.off('card_swapped');
      socket.off('vote_accepted');
      socket.off('vote_counted');
      socket.off('error_msg');
    };
  }, [socket]);

  const emit = useCallback((event, data) => {
    socket.emit(event, data);
  }, [socket]);

  return { socket, emit };
}
