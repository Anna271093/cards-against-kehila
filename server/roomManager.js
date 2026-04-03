// Room management module for קלפים נגד הקהילה
// In-memory storage for all active rooms.

const rooms = new Map();
const cleanupTimers = new Map();

const CLEANUP_DELAY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Generate a random 6-character room code (A-Z, 0-9).
 * Keeps generating until a unique code is found.
 */
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
}

/**
 * Create a new room and add the host as the first player.
 * @param {string} hostId - Socket ID of the host
 * @param {string} hostName - Display name of the host
 * @returns {object} The created room object
 */
export function createRoom(hostId, hostName) {
  const roomCode = generateRoomCode();

  const room = {
    roomCode,
    hostId,
    players: [
      {
        id: hostId,
        name: hostName,
        score: 0,
        hand: [],
        hasSubmitted: false,
        submittedCards: [],
      },
    ],
    state: 'lobby',
    currentBlackCard: null,
    currentJudgeIndex: 0,
    submissions: [],
    usedBlackCards: [],
    usedWhiteCards: [],
    roundNumber: 0,
    maxRounds: 20,
    timerSeconds: 60,
    revealNames: true,
    gameMode: 'classic', // 'classic' (judge) or 'vote' (popular vote)
    cardMode: 'keep',    // 'keep' (keep hand) or 'random' (new cards each round)
    votes: {},           // playerId -> submissionIndex (for vote mode)
    winnerThisRound: null,
    winningCards: null,
  };

  rooms.set(roomCode, room);

  // Cancel any pending cleanup for this code (edge case)
  if (cleanupTimers.has(roomCode)) {
    clearTimeout(cleanupTimers.get(roomCode));
    cleanupTimers.delete(roomCode);
  }

  return room;
}

/**
 * Get a room by its code.
 * @param {string} roomCode
 * @returns {object|undefined}
 */
export function getRoom(roomCode) {
  return rooms.get(roomCode);
}

/**
 * Add a player to an existing room.
 * @param {string} roomCode
 * @param {string} playerId - Socket ID
 * @param {string} playerName
 * @returns {{ success: boolean, error?: string, room?: object }}
 */
export function joinRoom(roomCode, playerId, playerName) {
  const room = rooms.get(roomCode);

  if (!room) {
    return { success: false, error: 'החדר לא נמצא' }; // Room not found
  }

  if (room.state === 'finished') {
    return { success: false, error: 'המשחק כבר הסתיים' }; // Game already finished
  }

  if (room.players.length >= 20) {
    return { success: false, error: 'החדר מלא' }; // Room full
  }

  // Check for duplicate name (case-insensitive)
  const nameTaken = room.players.some(
    (p) => p.name.toLowerCase() === playerName.toLowerCase()
  );
  if (nameTaken) {
    return { success: false, error: 'השם כבר תפוס' }; // Name taken
  }

  // Check if this socket is already in the room
  const alreadyIn = room.players.some((p) => p.id === playerId);
  if (alreadyIn) {
    return { success: false, error: 'אתה כבר בחדר' }; // Already in room
  }

  room.players.push({
    id: playerId,
    name: playerName,
    score: 0,
    hand: [],
    hasSubmitted: false,
    submittedCards: [],
  });

  // Cancel cleanup timer if one is pending (someone joined an emptying room)
  if (cleanupTimers.has(roomCode)) {
    clearTimeout(cleanupTimers.get(roomCode));
    cleanupTimers.delete(roomCode);
  }

  return { success: true, room };
}

/**
 * Remove a player from a room.
 * If the room empties, schedule cleanup.
 * @param {string} roomCode
 * @param {string} playerId
 * @returns {{ removed: boolean, room?: object, isEmpty: boolean, newHostId?: string }}
 */
export function removePlayer(roomCode, playerId) {
  const room = rooms.get(roomCode);
  if (!room) {
    return { removed: false, isEmpty: true };
  }

  const index = room.players.findIndex((p) => p.id === playerId);
  if (index === -1) {
    return { removed: false, isEmpty: room.players.length === 0 };
  }

  room.players.splice(index, 1);

  // If room is now empty, schedule cleanup
  if (room.players.length === 0) {
    scheduleCleanup(roomCode);
    return { removed: true, room, isEmpty: true };
  }

  // If the removed player was the host, transfer host to the first remaining player
  let newHostId = null;
  if (room.hostId === playerId) {
    room.hostId = room.players[0].id;
    newHostId = room.hostId;
  }

  // Adjust judge index if needed (during a game)
  if (room.state !== 'lobby') {
    // If the judge index is now out of bounds, wrap around
    if (room.currentJudgeIndex >= room.players.length) {
      room.currentJudgeIndex = room.currentJudgeIndex % room.players.length;
    }
  }

  return { removed: true, room, isEmpty: false, newHostId };
}

/**
 * Delete a room immediately.
 * @param {string} roomCode
 */
export function deleteRoom(roomCode) {
  rooms.delete(roomCode);
  if (cleanupTimers.has(roomCode)) {
    clearTimeout(cleanupTimers.get(roomCode));
    cleanupTimers.delete(roomCode);
  }
}

/**
 * Find a room by a player's socket ID.
 * @param {string} playerId
 * @returns {object|undefined}
 */
export function getRoomByPlayerId(playerId) {
  for (const room of rooms.values()) {
    if (room.players.some((p) => p.id === playerId)) {
      return room;
    }
  }
  return undefined;
}

/**
 * Schedule room cleanup after CLEANUP_DELAY_MS.
 * @param {string} roomCode
 */
function scheduleCleanup(roomCode) {
  if (cleanupTimers.has(roomCode)) {
    clearTimeout(cleanupTimers.get(roomCode));
  }

  const timer = setTimeout(() => {
    const room = rooms.get(roomCode);
    // Only delete if still empty
    if (room && room.players.length === 0) {
      rooms.delete(roomCode);
    }
    cleanupTimers.delete(roomCode);
  }, CLEANUP_DELAY_MS);

  cleanupTimers.set(roomCode, timer);
}

/**
 * Run manual cleanup of all empty rooms (called periodically if desired).
 * Returns count of rooms cleaned.
 */
export function cleanupRooms() {
  let cleaned = 0;
  for (const [code, room] of rooms.entries()) {
    if (room.players.length === 0) {
      rooms.delete(code);
      if (cleanupTimers.has(code)) {
        clearTimeout(cleanupTimers.get(code));
        cleanupTimers.delete(code);
      }
      cleaned++;
    }
  }
  return cleaned;
}
