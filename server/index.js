// Main server for קלפים נגד הקהילה
// Express + Socket.io, in-memory storage, ES modules.

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  createRoom,
  getRoom,
  joinRoom,
  removePlayer,
  deleteRoom,
  getRoomByPlayerId,
  cleanupRooms,
} from './roomManager.js';

import {
  startGame,
  submitCards,
  getAllSubmissions,
  pickWinner,
  nextRound,
  isGameOver,
  getScoreboard,
  autoSubmit,
  dealCards,
  aiAutoSubmit,
} from './gameLogic.js';

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || '*';
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: FRONTEND_URL === '*' ? true : FRONTEND_URL }));
app.use(express.json());

// In production, serve the built client
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL === '*' ? true : FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ---------------------------------------------------------------------------
// Rate limiting (per socket)
// ---------------------------------------------------------------------------

const RATE_LIMIT_MAX = 10; // events per second
const rateLimitCounters = new Map(); // socketId -> { count, resetTime }

function rateLimited(socketId) {
  const now = Date.now();
  let entry = rateLimitCounters.get(socketId);

  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + 1000 };
    rateLimitCounters.set(socketId, entry);
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

// ---------------------------------------------------------------------------
// Active timers
// ---------------------------------------------------------------------------

const roomTimers = new Map(); // roomCode -> intervalId

function clearRoomTimer(roomCode) {
  if (roomTimers.has(roomCode)) {
    clearInterval(roomTimers.get(roomCode));
    roomTimers.delete(roomCode);
  }
}

function startRoundTimer(room) {
  clearRoomTimer(room.roomCode);

  if (!room.timerSeconds || room.timerSeconds <= 0) return;

  let remaining = room.timerSeconds;

  const interval = setInterval(() => {
    remaining -= 1;
    io.to(room.roomCode).emit('timer_tick', { remaining });

    if (remaining <= 0) {
      clearInterval(interval);
      roomTimers.delete(room.roomCode);
      handleTimerExpiry(room);
    }
  }, 1000);

  roomTimers.set(room.roomCode, interval);
}

function handleTimerExpiry(room) {
  // Auto-submit for everyone who hasn't submitted yet
  const judgeId = room.gameMode === 'vote' ? null : room.players[room.currentJudgeIndex]?.id;

  for (const player of room.players) {
    if (player.id !== judgeId && !player.hasSubmitted) {
      autoSubmit(room, player.id);
    }
  }

  // Notify about auto-submissions and move to judging if we have submissions
  if (room.submissions.length > 0) {
    transitionToJudging(room);
  }
  // If nobody submitted anything (edge case), auto-advance to next round
  else {
    io.to(room.roomCode).emit('round_skipped', {
      reason: 'אף אחד לא הגיש קלפים',
    });

    // Auto-advance after 3 seconds
    setTimeout(() => {
      if (!room || room.state === 'finished') return;

      if (isGameOver(room)) {
        room.state = 'finished';
        clearRoomTimer(room.roomCode);
        io.to(room.roomCode).emit('game_over', {
          scoreboard: getScoreboard(room),
          roomSnapshot: roomSnapshot(room),
        });
        return;
      }

      nextRound(room);
      aiAutoSubmit(room);
      for (const player of room.players) {
        if (!player.isAI) {
          io.to(player.id).emit('new_round', roomSnapshot(room, player.id));
        }
      }
      startRoundTimer(room);
    }, 3000);
  }
}

/**
 * Transition the room to the judging state, notify all players.
 */
function transitionToJudging(room) {
  room.state = 'judging';
  clearRoomTimer(room.roomCode);

  const shuffledSubmissions = getAllSubmissions(room);

  if (room.gameMode === 'vote') {
    // Vote mode: send submissions to ALL players, each player votes
    room.votes = {};
    room.players.forEach((p) => {
      io.to(p.id).emit('all_submitted', { submissions: shuffledSubmissions, voteMode: true });
    });
  } else {
    // Classic mode: send to judge only
    const judgeId = room.players[room.currentJudgeIndex]?.id;
    const submittedCount = room.submissions.length;

    io.to(judgeId).emit('all_submitted', { submissions: shuffledSubmissions });

    room.players.forEach((p) => {
      if (p.id !== judgeId) {
        io.to(p.id).emit('waiting_for_judge', { submittedCount });
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Disconnect grace period tracking
// ---------------------------------------------------------------------------

const disconnectTimers = new Map(); // socketId -> { timeout, roomCode }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a sanitized room snapshot for clients (strips internal fields).
 */
function roomSnapshot(room, forPlayerId = null) {
  return {
    roomCode: room.roomCode,
    hostId: room.hostId,
    state: room.state,
    currentBlackCard: room.currentBlackCard
      ? { text: room.currentBlackCard.text, pick: room.currentBlackCard.pick }
      : null,
    currentJudgeIndex: room.currentJudgeIndex,
    roundNumber: room.roundNumber,
    maxRounds: room.maxRounds,
    timerSeconds: room.timerSeconds,
    revealNames: room.revealNames,
    gameMode: room.gameMode,
    cardMode: room.cardMode,
    allowAI: room.allowAI,
    allowCustomCards: room.allowCustomCards,
    winnerThisRound: room.winnerThisRound,
    winningCards: room.winningCards,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      hasSubmitted: p.hasSubmitted,
      isAI: p.isAI || false,
      handCount: p.hand.length,
      // Only include the hand for the requesting player
      ...(forPlayerId && p.id === forPlayerId
        ? { hand: p.hand.map((c) => ({ text: c.text, ...(c.isCustom ? { isCustom: true } : {}) })) }
        : {}),
    })),
  };
}

/**
 * Count how many non-judge players have submitted.
 */
function submittedCount(room) {
  if (room.gameMode === 'vote') {
    return room.players.filter((p) => p.hasSubmitted).length;
  }
  const judgeId = room.players[room.currentJudgeIndex]?.id;
  return room.players.filter(
    (p) => p.id !== judgeId && p.hasSubmitted
  ).length;
}

/**
 * Count how many non-judge players exist.
 */
function nonJudgeCount(room) {
  if (room.gameMode === 'vote') {
    return room.players.filter((p) => !p.isAI).length;
  }
  const judgeId = room.players[room.currentJudgeIndex]?.id;
  return room.players.filter((p) => p.id !== judgeId).length;
}

// ---------------------------------------------------------------------------
// Socket.io connection handler
// ---------------------------------------------------------------------------

io.on('connection', (socket) => {
  // ----- create_room -----
  socket.on('create_room', ({ playerName }) => {
    if (rateLimited(socket.id)) return;

    if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
      socket.emit('error_msg', { message: 'שם לא תקין' });
      return;
    }

    const name = playerName.trim().slice(0, 30);
    const room = createRoom(socket.id, name);
    socket.join(room.roomCode);

    socket.emit('room_created', roomSnapshot(room, socket.id));
  });

  // ----- join_room -----
  socket.on('join_room', ({ roomCode, playerName }) => {
    if (rateLimited(socket.id)) return;

    if (
      !roomCode ||
      !playerName ||
      typeof roomCode !== 'string' ||
      typeof playerName !== 'string' ||
      playerName.trim().length === 0
    ) {
      socket.emit('error_msg', { message: 'נתונים חסרים' });
      return;
    }

    const code = roomCode.toUpperCase().trim();
    const name = playerName.trim().slice(0, 30);

    const result = joinRoom(code, socket.id, name);
    if (!result.success) {
      socket.emit('error_msg', { message: result.error });
      return;
    }

    socket.join(code);

    // If the game is already in progress, deal cards to the new player
    if (result.room.state !== 'lobby') {
      const newPlayer = result.room.players.find((p) => p.id === socket.id);
      if (newPlayer && newPlayer.hand.length === 0) {
        dealCards(result.room, socket.id, 5);
        newPlayer.hasSubmitted = true; // can't submit this round — joined mid-round
      }
    }

    // Send the joining player their private state
    socket.emit('player_joined', roomSnapshot(result.room, socket.id));

    // Notify everyone else in the room
    socket.to(code).emit('player_joined', roomSnapshot(result.room));
  });

  // ----- update_settings -----
  socket.on('update_settings', ({ roomCode, maxRounds, timerSeconds, revealNames, gameMode, cardMode, allowAI, allowCustomCards }) => {
    if (rateLimited(socket.id)) return;

    const room = getRoom(roomCode);
    if (!room) {
      socket.emit('error_msg', { message: 'החדר לא נמצא' });
      return;
    }
    if (room.hostId !== socket.id) {
      socket.emit('error_msg', { message: 'רק המארח יכול לשנות הגדרות' });
      return;
    }
    if (room.state !== 'lobby') {
      socket.emit('error_msg', { message: 'אי אפשר לשנות הגדרות במהלך משחק' });
      return;
    }

    // Validate and apply settings
    if (typeof maxRounds === 'number' && maxRounds >= 1 && maxRounds <= 50) {
      room.maxRounds = Math.floor(maxRounds);
    }
    if (typeof timerSeconds === 'number' && timerSeconds >= 0 && timerSeconds <= 300) {
      room.timerSeconds = Math.floor(timerSeconds);
    }
    if (typeof revealNames === 'boolean') {
      room.revealNames = revealNames;
    }
    if (gameMode === 'classic' || gameMode === 'vote') {
      room.gameMode = gameMode;
    }
    if (cardMode === 'keep' || cardMode === 'random') {
      room.cardMode = cardMode;
    }
    if (typeof allowCustomCards === 'boolean') {
      room.allowCustomCards = allowCustomCards;
    }
    if (typeof allowAI === 'boolean') {
      room.allowAI = allowAI;
      const AI_ID = '__ai__';
      const hasAI = room.players.some(p => p.id === AI_ID);
      if (allowAI && !hasAI) {
        room.players.push({
          id: AI_ID,
          name: '🎲 שחקן אוטומטי',
          score: 0,
          hand: [],
          hasSubmitted: false,
          submittedCards: [],
          isAI: true,
        });
      } else if (!allowAI && hasAI) {
        room.players = room.players.filter(p => p.id !== AI_ID);
      }
    }

    io.to(roomCode).emit('settings_updated', roomSnapshot(room));
  });

  // ----- start_game -----
  socket.on('start_game', ({ roomCode }) => {
    if (rateLimited(socket.id)) return;

    const room = getRoom(roomCode);
    if (!room) {
      socket.emit('error_msg', { message: 'החדר לא נמצא' });
      return;
    }
    if (room.hostId !== socket.id) {
      socket.emit('error_msg', { message: 'רק המארח יכול להתחיל' });
      return;
    }
    if (room.state !== 'lobby') {
      socket.emit('error_msg', { message: 'המשחק כבר התחיל' });
      return;
    }
    if (room.players.length < 3) {
      socket.emit('error_msg', { message: 'צריך לפחות 3 שחקנים' });
      return;
    }

    startGame(room);

    // AI auto-submits immediately
    aiAutoSubmit(room);

    // Send each player their private hand + the public game state
    for (const player of room.players) {
      if (!player.isAI) {
        io.to(player.id).emit('game_started', roomSnapshot(room, player.id));
      }
    }

    // Start the round timer
    startRoundTimer(room);
  });

  // ----- submit_card -----
  socket.on('submit_card', ({ roomCode, cardIndices, customText }) => {
    if (rateLimited(socket.id)) return;

    const room = getRoom(roomCode);
    if (!room) {
      socket.emit('error_msg', { message: 'החדר לא נמצא' });
      return;
    }
    if (room.state !== 'playing') {
      socket.emit('error_msg', { message: 'לא בזמן משחק' });
      return;
    }

    if (!Array.isArray(cardIndices)) {
      socket.emit('error_msg', { message: 'נתונים לא תקינים' });
      return;
    }

    const result = submitCards(room, socket.id, cardIndices, customText);
    if (!result.success) {
      socket.emit('error_msg', { message: result.error });
      return;
    }

    // Acknowledge to the submitting player
    const me = room.players.find((p) => p.id === socket.id);
    socket.emit('card_submitted', {
      hand: me?.hand.map((c) => ({ text: c.text, ...(c.isCustom ? { isCustom: true } : {}) })) || [],
    });

    // Notify room of submission count
    const submitted = submittedCount(room);
    const total = nonJudgeCount(room);
    io.to(roomCode).emit('player_submitted', { submitted, total });

    // If all non-judge players have submitted, move to judging
    if (submitted >= total) {
      transitionToJudging(room);
    }
  });

  // ----- swap_card -----
  socket.on('swap_card', ({ roomCode, cardIndex }) => {
    if (rateLimited(socket.id)) return;

    const room = getRoom(roomCode);
    if (!room) {
      socket.emit('error_msg', { message: 'החדר לא נמצא' });
      return;
    }
    if (room.state !== 'playing') {
      socket.emit('error_msg', { message: 'אפשר להחליף רק בזמן משחק' });
      return;
    }

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    if (player.hasSubmitted) {
      socket.emit('error_msg', { message: 'כבר הגשת, אי אפשר להחליף' });
      return;
    }

    if (room.gameMode !== 'vote') {
      const judgeId = room.players[room.currentJudgeIndex]?.id;
      if (socket.id === judgeId) {
        socket.emit('error_msg', { message: 'השופט לא יכול להחליף קלפים' });
        return;
      }
    }

    if (player._swappedThisRound) {
      socket.emit('error_msg', { message: 'אפשר להחליף רק קלף אחד בסיבוב' });
      return;
    }

    if (typeof cardIndex !== 'number' || cardIndex < 0 || cardIndex >= player.hand.length) {
      socket.emit('error_msg', { message: 'קלף לא תקין' });
      return;
    }

    // Can't swap the custom card
    if (player.hand[cardIndex]?.isCustom) {
      socket.emit('error_msg', { message: 'אי אפשר להחליף את הקלף המותאם' });
      return;
    }

    // Remove the card from hand
    player.hand.splice(cardIndex, 1);

    // Deal one new card
    dealCards(room, socket.id, 1);

    player._swappedThisRound = true;

    // Send updated hand back
    socket.emit('card_swapped', {
      hand: player.hand.map((c) => ({ text: c.text, ...(c.isCustom ? { isCustom: true } : {}) })),
    });
  });

  // ----- judge_pick -----
  socket.on('judge_pick', ({ roomCode, submissionIndex }) => {
    if (rateLimited(socket.id)) return;

    const room = getRoom(roomCode);
    if (!room) {
      socket.emit('error_msg', { message: 'החדר לא נמצא' });
      return;
    }
    if (room.state !== 'judging') {
      socket.emit('error_msg', { message: 'לא בשלב שיפוט' });
      return;
    }

    const judgeId = room.players[room.currentJudgeIndex]?.id;
    if (socket.id !== judgeId) {
      socket.emit('error_msg', { message: 'רק השופט יכול לבחור' });
      return;
    }

    if (typeof submissionIndex !== 'number') {
      socket.emit('error_msg', { message: 'בחירה לא תקינה' });
      return;
    }

    const result = pickWinner(room, submissionIndex);
    if (!result.success) {
      socket.emit('error_msg', { message: result.error });
      return;
    }

    // Emit to all players
    io.to(roomCode).emit('round_winner', {
      winner: result.winner,
      scoreboard: getScoreboard(room),
      roomSnapshot: roomSnapshot(room),
    });
  });

  // ----- vote_pick (popular vote mode) -----
  socket.on('vote_pick', ({ roomCode, submissionIndex }) => {
    if (rateLimited(socket.id)) return;

    const room = getRoom(roomCode);
    if (!room) {
      socket.emit('error_msg', { message: 'החדר לא נמצא' });
      return;
    }
    if (room.state !== 'judging' || room.gameMode !== 'vote') {
      socket.emit('error_msg', { message: 'לא בשלב הצבעה' });
      return;
    }
    if (typeof submissionIndex !== 'number') {
      socket.emit('error_msg', { message: 'בחירה לא תקינה' });
      return;
    }

    // Can't vote for your own submission
    if (room._submissionOrder) {
      const originalIndex = room._submissionOrder[submissionIndex];
      const sub = room.submissions[originalIndex];
      if (sub && sub.playerId === socket.id) {
        socket.emit('error_msg', { message: 'אי אפשר להצביע לעצמך!' });
        return;
      }
    }

    // Already voted?
    if (room.votes[socket.id] !== undefined) {
      socket.emit('error_msg', { message: 'כבר הצבעת' });
      return;
    }

    room.votes[socket.id] = submissionIndex;

    // Notify about vote count (AI doesn't vote)
    const voteCount = Object.keys(room.votes).length;
    const totalVoters = room.players.filter((p) => !p.isAI).length;
    io.to(roomCode).emit('vote_counted', { voteCount, totalVoters });

    socket.emit('vote_accepted');

    // Check if all human players voted
    if (voteCount >= totalVoters) {
      // Tally votes
      const tally = {};
      for (const idx of Object.values(room.votes)) {
        tally[idx] = (tally[idx] || 0) + 1;
      }

      // Find the submission with most votes
      let maxVotes = 0;
      let winnerIndices = [];
      for (const [idx, count] of Object.entries(tally)) {
        if (count > maxVotes) {
          maxVotes = count;
          winnerIndices = [Number(idx)];
        } else if (count === maxVotes) {
          winnerIndices.push(Number(idx));
        }
      }

      const isTie = winnerIndices.length > 1;

      // Award point to ALL tied winners (or single winner)
      const winners = [];
      for (const shuffledIdx of winnerIndices) {
        const originalIndex = room._submissionOrder[shuffledIdx];
        const sub = room.submissions[originalIndex];
        if (!sub) continue;

        const player = room.players.find((p) => p.id === sub.playerId);
        if (player) player.score += 1;

        winners.push({
          playerId: sub.playerId,
          playerName: room.revealNames ? sub.playerName : null,
          cards: sub.cards.map((c) => ({ text: c.text })),
          score: player ? player.score : 0,
        });
      }

      // Set room state to reveal (using first winner for backwards compat)
      room.winnerThisRound = winners[0] ? {
        playerId: winners[0].playerId,
        playerName: winners[0].playerName,
        cards: winners[0].cards,
      } : null;
      room.winningCards = winners[0]?.cards || null;
      room.state = 'reveal';

      io.to(roomCode).emit('round_winner', {
        winner: winners[0] || null,
        winners: isTie ? winners : undefined,
        isTie,
        scoreboard: getScoreboard(room),
        roomSnapshot: roomSnapshot(room),
        voteResults: tally,
      });
    }
  });

  // ----- next_round -----
  socket.on('next_round', ({ roomCode }) => {
    if (rateLimited(socket.id)) return;

    const room = getRoom(roomCode);
    if (!room) {
      socket.emit('error_msg', { message: 'החדר לא נמצא' });
      return;
    }
    if (room.hostId !== socket.id) {
      socket.emit('error_msg', { message: 'רק המארח יכול להמשיך' });
      return;
    }
    if (room.state !== 'reveal') {
      socket.emit('error_msg', { message: 'לא בשלב הנכון' });
      return;
    }

    // Check game over
    if (isGameOver(room)) {
      room.state = 'finished';
      clearRoomTimer(room.roomCode);
      io.to(roomCode).emit('game_over', {
        scoreboard: getScoreboard(room),
        roomSnapshot: roomSnapshot(room),
      });
      return;
    }

    nextRound(room);

    // AI auto-submits immediately
    aiAutoSubmit(room);

    // Send each player their updated hand privately
    for (const player of room.players) {
      if (!player.isAI) {
        io.to(player.id).emit('new_round', roomSnapshot(room, player.id));
      }
    }

    // Start timer for the new round
    startRoundTimer(room);
  });

  // ----- end_game -----
  socket.on('end_game', ({ roomCode }) => {
    if (rateLimited(socket.id)) return;

    const room = getRoom(roomCode);
    if (!room) {
      socket.emit('error_msg', { message: 'החדר לא נמצא' });
      return;
    }
    if (room.hostId !== socket.id) {
      socket.emit('error_msg', { message: 'רק המארח יכול לסיים' });
      return;
    }

    room.state = 'finished';
    clearRoomTimer(room.roomCode);

    io.to(roomCode).emit('game_over', {
      scoreboard: getScoreboard(room),
      roomSnapshot: roomSnapshot(room),
    });
  });

  // ----- new_game -----
  socket.on('new_game', ({ roomCode }) => {
    if (rateLimited(socket.id)) return;

    const room = getRoom(roomCode);
    if (!room) {
      socket.emit('error_msg', { message: 'החדר לא נמצא' });
      return;
    }
    if (room.hostId !== socket.id) {
      socket.emit('error_msg', { message: 'רק המארח יכול לאפס' });
      return;
    }

    clearRoomTimer(room.roomCode);

    // Reset everything back to lobby
    room.state = 'lobby';
    room.currentBlackCard = null;
    room.currentJudgeIndex = 0;
    room.submissions = [];
    room.usedBlackCards = [];
    room.usedWhiteCards = [];
    room.roundNumber = 0;
    room.winnerThisRound = null;
    room.winningCards = null;
    room.votes = {};
    room._blackDeck = null;
    room._whiteDeck = null;
    room._submissionOrder = null;

    // Remove AI player on reset (will be re-added from setting)
    room.players = room.players.filter(p => !p.isAI);

    for (const player of room.players) {
      player.score = 0;
      player.hand = [];
      player.hasSubmitted = false;
      player.submittedCards = [];
    }

    // Re-add AI if setting is still on
    if (room.allowAI) {
      room.players.push({
        id: '__ai__',
        name: '🎲 שחקן אוטומטי',
        score: 0,
        hand: [],
        hasSubmitted: false,
        submittedCards: [],
        isAI: true,
      });
    }

    io.to(roomCode).emit('game_reset', roomSnapshot(room));
  });

  // ----- disconnect -----
  socket.on('disconnect', () => {
    rateLimitCounters.delete(socket.id);

    const room = getRoomByPlayerId(socket.id);
    if (!room) return;

    // Grace period: wait 45 seconds before removing
    const timeout = setTimeout(() => {
      handlePlayerRemoval(socket.id, room.roomCode);
      disconnectTimers.delete(socket.id);
    }, 45000);

    disconnectTimers.set(socket.id, { timeout, roomCode: room.roomCode });
  });

  // ----- reconnect (rejoin) -----
  socket.on('rejoin_room', ({ roomCode, playerName }) => {
    if (rateLimited(socket.id)) return;

    const room = getRoom(roomCode);
    if (!room) {
      socket.emit('error_msg', { message: 'החדר לא נמצא' });
      return;
    }

    // Find a player with matching name who might have disconnected
    const existingPlayer = room.players.find(
      (p) => p.name.toLowerCase() === playerName?.toLowerCase?.()
    );

    if (existingPlayer) {
      const oldId = existingPlayer.id;

      // Cancel the disconnect timer for the old socket
      if (disconnectTimers.has(oldId)) {
        clearTimeout(disconnectTimers.get(oldId).timeout);
        disconnectTimers.delete(oldId);
      }

      // Update the player's socket ID
      existingPlayer.id = socket.id;

      // Update host reference if needed
      if (room.hostId === oldId) {
        room.hostId = socket.id;
      }

      // Update judge reference if the judge index points to this player
      // (no change needed since we track by index, not by id)

      socket.join(roomCode);

      // Send the player their current state
      socket.emit('rejoin_success', roomSnapshot(room, socket.id));

      // If we're in the judging phase, re-send submissions so the screen isn't empty
      if (room.state === 'judging' && room._submissionOrder && room.submissions.length > 0) {
        const shuffled = room._submissionOrder.map((origIdx) => ({
          cards: room.submissions[origIdx].cards.map((c) => ({ text: c.text })),
        }));
        const isVoteMode = room.gameMode === 'vote';
        const judgeId = room.players[room.currentJudgeIndex]?.id;

        // In classic mode, only the judge sees submissions. In vote mode, everyone does.
        if (isVoteMode || socket.id === judgeId) {
          socket.emit('all_submitted', { submissions: shuffled, voteMode: isVoteMode });
        }
      }

      // Notify others
      socket.to(roomCode).emit('player_reconnected', {
        playerName: existingPlayer.name,
        roomSnapshot: roomSnapshot(room),
      });
    } else {
      socket.emit('error_msg', { message: 'לא נמצא שחקן עם שם זה' });
    }
  });
});

/**
 * Handle the actual removal of a disconnected player after grace period.
 */
function handlePlayerRemoval(playerId, roomCode) {
  const room = getRoom(roomCode);
  if (!room) return;

  // Confirm the player is still in the room with this ID
  // (they might have reconnected with a new socket)
  const stillPresent = room.players.find((p) => p.id === playerId);
  if (!stillPresent) return;

  const wasJudge =
    room.players[room.currentJudgeIndex]?.id === playerId;
  const wasHost = room.hostId === playerId;

  const result = removePlayer(roomCode, playerId);
  if (!result.removed) return;

  if (result.isEmpty) {
    clearRoomTimer(roomCode);
    // Room will be cleaned up by the roomManager's 30-min timer
    return;
  }

  // Notify remaining players
  io.to(roomCode).emit('player_left', {
    playerName: stillPresent.name,
    newHostId: result.newHostId,
    roomSnapshot: roomSnapshot(room),
  });

  // If fewer than 3 players remain during a game, end it
  if (room.state !== 'lobby' && room.state !== 'finished' && room.players.length < 3) {
    room.state = 'finished';
    clearRoomTimer(roomCode);
    io.to(roomCode).emit('game_over', {
      reason: 'אין מספיק שחקנים',
      scoreboard: getScoreboard(room),
      roomSnapshot: roomSnapshot(room),
    });
    return;
  }

  // If the judge disconnected mid-game, handle judge rotation
  if (wasJudge && (room.state === 'playing' || room.state === 'judging')) {
    // The judge index was already adjusted by removePlayer.
    // Reset current round submissions and restart.
    room.submissions = [];
    room._submissionOrder = null;
    room.winnerThisRound = null;
    room.winningCards = null;

    for (const player of room.players) {
      // Return submitted cards to hand
      if (player.submittedCards.length > 0) {
        player.hand.push(...player.submittedCards);
      }
      player.hasSubmitted = false;
      player.submittedCards = [];
    }

    room.state = 'playing';

    // Notify everyone of the new round state with a new judge
    for (const player of room.players) {
      io.to(player.id).emit('judge_changed', roomSnapshot(room, player.id));
    }

    startRoundTimer(room);
  }
}

// ---------------------------------------------------------------------------
// SPA fallback: serve index.html for non-API routes in production
// ---------------------------------------------------------------------------

app.get('*', (_req, res) => {
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ error: 'Not found' });
    }
  });
});

// ---------------------------------------------------------------------------
// Periodic cleanup
// ---------------------------------------------------------------------------

setInterval(() => {
  cleanupRooms();
}, 10 * 60 * 1000); // Every 10 minutes

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

httpServer.listen(PORT, () => {
  console.log(`🃏 קלפים נגד הקהילה server running on port ${PORT}`);
});

export { app, httpServer, io };
