// Game logic module for קלפים נגד הקהילה
// Handles card dealing, submissions, judging, round progression, and scoring.

import { BLACK_CARDS, WHITE_CARDS } from './cards.js';

const HAND_SIZE = 5;

/**
 * Fisher-Yates shuffle (in-place).
 * @param {any[]} arr
 * @returns {any[]} The same array, shuffled
 */
export function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build the available card pools (excluding already-used cards), shuffle them,
 * deal initial hands, draw the first black card, and set the first judge.
 * @param {object} room
 * @returns {object} room (mutated)
 */
export function startGame(room) {
  // Build the unused pools
  // Black cards are tracked by index so we can avoid repeats
  const allBlackIndices = BLACK_CARDS.map((_, i) => i);
  const allWhiteIndices = WHITE_CARDS.map((_, i) => i);

  room.usedBlackCards = [];
  room.usedWhiteCards = [];

  // Shuffle both pools
  shuffleArray(allBlackIndices);
  shuffleArray(allWhiteIndices);

  // Store the shuffled draw piles on the room (indices into the card arrays)
  room._blackDeck = allBlackIndices;
  room._whiteDeck = allWhiteIndices;

  room.roundNumber = 1;
  room.currentJudgeIndex = 0;
  room.submissions = [];
  room.winnerThisRound = null;
  room.winningCards = null;

  // Reset player state
  for (const player of room.players) {
    player.score = 0;
    player.hand = [];
    player.hasSubmitted = false;
    player.submittedCards = [];
  }

  // Deal initial hands
  for (const player of room.players) {
    dealCards(room, player.id, HAND_SIZE);
  }

  // Draw first black card
  drawBlackCard(room);

  room.state = 'playing';

  return room;
}

/**
 * Draw the next black card from the deck onto the room.
 * If the deck is exhausted, reshuffle all black cards except the most recent ones.
 * @param {object} room
 */
function drawBlackCard(room) {
  if (!room._blackDeck || room._blackDeck.length === 0) {
    // Reshuffle all black card indices
    room._blackDeck = BLACK_CARDS.map((_, i) => i);
    shuffleArray(room._blackDeck);
  }

  const cardIndex = room._blackDeck.pop();
  room.usedBlackCards.push(cardIndex);
  room.currentBlackCard = BLACK_CARDS[cardIndex] || { text: '_____ ?', pick: 1 };
}

/**
 * Deal white cards from the unused pool to a specific player.
 * @param {object} room
 * @param {string} playerId
 * @param {number} count - Number of cards to deal
 * @returns {object[]} The cards dealt
 */
export function dealCards(room, playerId, count) {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return [];

  const dealt = [];

  for (let i = 0; i < count; i++) {
    // If white deck is empty, reshuffle all white cards (excluding cards currently in players' hands)
    if (!room._whiteDeck || room._whiteDeck.length === 0) {
      const inHandIndices = new Set();
      for (const p of room.players) {
        for (const card of p.hand) {
          if (card._index !== undefined) {
            inHandIndices.add(card._index);
          }
        }
      }
      room._whiteDeck = WHITE_CARDS.map((_, idx) => idx).filter(
        (idx) => !inHandIndices.has(idx)
      );
      shuffleArray(room._whiteDeck);

      // If still empty, no more cards available
      if (room._whiteDeck.length === 0) break;
    }

    const cardIndex = room._whiteDeck.pop();
    room.usedWhiteCards.push(cardIndex);
    const card = { ...WHITE_CARDS[cardIndex], _index: cardIndex };
    player.hand.push(card);
    dealt.push(card);
  }

  return dealt;
}

/**
 * Submit cards for a player.
 * @param {object} room
 * @param {string} playerId
 * @param {number[]} cardIndices - Indices into the player's hand array (0-based)
 * @returns {{ success: boolean, error?: string }}
 */
export function submitCards(room, playerId, cardIndices) {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) {
    return { success: false, error: 'שחקן לא נמצא' }; // Player not found
  }

  if (player.hasSubmitted) {
    return { success: false, error: 'כבר הגשת קלפים' }; // Already submitted
  }

  // Check that this player is not the judge
  const judgeId = room.players[room.currentJudgeIndex]?.id;
  if (playerId === judgeId) {
    return { success: false, error: 'השופט לא מגיש קלפים' }; // Judge doesn't submit
  }

  // Validate the expected number of cards
  const requiredPick = room.currentBlackCard?.pick || 1;
  if (cardIndices.length !== requiredPick) {
    return {
      success: false,
      error: `צריך לבחור ${requiredPick} קלפים`, // Must pick N cards
    };
  }

  // Validate indices are within range and unique
  const uniqueIndices = new Set(cardIndices);
  if (uniqueIndices.size !== cardIndices.length) {
    return { success: false, error: 'אי אפשר לבחור את אותו קלף פעמיים' };
  }
  for (const idx of cardIndices) {
    if (idx < 0 || idx >= player.hand.length) {
      return { success: false, error: 'אינדקס קלף לא תקין' }; // Invalid card index
    }
  }

  // Extract the submitted cards from the player's hand (in order of selection)
  // Sort indices descending so splicing doesn't shift remaining indices
  const cards = cardIndices.map((idx) => player.hand[idx]);
  const sortedIndicesDesc = [...cardIndices].sort((a, b) => b - a);
  for (const idx of sortedIndicesDesc) {
    player.hand.splice(idx, 1);
  }

  player.hasSubmitted = true;
  player.submittedCards = cards;

  // Add to room submissions
  room.submissions.push({
    playerId,
    playerName: player.name,
    cards,
  });

  return { success: true };
}

/**
 * Get all submissions shuffled for anonymous judging.
 * Returns cards without player info (unless revealNames is on after judging).
 * @param {object} room
 * @returns {object[]} Array of { cards: [...] } (anonymized)
 */
export function getAllSubmissions(room) {
  // Create anonymized copy and shuffle
  const anonymized = room.submissions.map((sub) => ({
    cards: sub.cards.map((c) => ({ text: c.text })),
  }));
  shuffleArray(anonymized);

  // Store the shuffled order on the room so judge_pick index aligns
  room._shuffledSubmissions = anonymized.map((_, shuffledIdx) => {
    // Find which original submission matches this shuffled one
    // We need to maintain mapping: shuffledIdx -> original submission
    return null; // placeholder
  });

  // Better approach: shuffle indices, store mapping
  const indices = room.submissions.map((_, i) => i);
  shuffleArray(indices);
  room._submissionOrder = indices; // shuffledPosition -> original index

  const shuffled = indices.map((origIdx) => ({
    cards: room.submissions[origIdx].cards.map((c) => ({ text: c.text })),
  }));

  return shuffled;
}

/**
 * Judge picks the winning submission.
 * @param {object} room
 * @param {number} submissionIndex - Index in the shuffled submissions array
 * @returns {{ success: boolean, error?: string, winner?: object }}
 */
export function pickWinner(room, submissionIndex) {
  if (!room._submissionOrder) {
    return { success: false, error: 'ההגשות לא מוכנות' };
  }

  if (submissionIndex < 0 || submissionIndex >= room._submissionOrder.length) {
    return { success: false, error: 'בחירה לא תקינה' }; // Invalid choice
  }

  const originalIndex = room._submissionOrder[submissionIndex];
  const winning = room.submissions[originalIndex];

  if (!winning) {
    return { success: false, error: 'הגשה לא נמצאה' };
  }

  // Award point to winner
  const winnerPlayer = room.players.find((p) => p.id === winning.playerId);
  if (winnerPlayer) {
    winnerPlayer.score += 1;
  }

  room.winnerThisRound = {
    playerId: winning.playerId,
    playerName: winning.playerName,
    cards: winning.cards.map((c) => ({ text: c.text })),
  };
  room.winningCards = winning.cards.map((c) => ({ text: c.text }));

  room.state = 'reveal';

  return {
    success: true,
    winner: {
      playerId: winning.playerId,
      playerName: room.revealNames ? winning.playerName : null,
      cards: winning.cards.map((c) => ({ text: c.text })),
      score: winnerPlayer ? winnerPlayer.score : 0,
    },
  };
}

/**
 * Advance to the next round: rotate judge, deal replacement cards,
 * draw a new black card, reset submissions.
 * @param {object} room
 * @returns {object} room (mutated)
 */
export function nextRound(room) {
  room.roundNumber += 1;

  // Rotate judge
  room.currentJudgeIndex =
    (room.currentJudgeIndex + 1) % room.players.length;

  // Reset submission state
  room.submissions = [];
  room._submissionOrder = null;
  room.winnerThisRound = null;
  room.winningCards = null;

  // Deal replacement cards so each non-judge player has HAND_SIZE cards
  for (const player of room.players) {
    player.hasSubmitted = false;
    player.submittedCards = [];
    player._swappedThisRound = false;
    const deficit = HAND_SIZE - player.hand.length;
    if (deficit > 0) {
      dealCards(room, player.id, deficit);
    }
  }

  // Draw a new black card
  drawBlackCard(room);

  room.state = 'playing';

  return room;
}

/**
 * Check if the game should end.
 * @param {object} room
 * @returns {boolean}
 */
export function isGameOver(room) {
  return room.roundNumber >= room.maxRounds;
}

/**
 * Get a sorted scoreboard (highest score first).
 * @param {object} room
 * @returns {{ name: string, score: number, id: string }[]}
 */
export function getScoreboard(room) {
  return room.players
    .map((p) => ({ name: p.name, score: p.score, id: p.id }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Auto-submit random card(s) for a player (when timer expires).
 * @param {object} room
 * @param {string} playerId
 * @returns {{ success: boolean }}
 */
export function autoSubmit(room, playerId) {
  const player = room.players.find((p) => p.id === playerId);
  if (!player || player.hasSubmitted) {
    return { success: false };
  }

  const judgeId = room.players[room.currentJudgeIndex]?.id;
  if (playerId === judgeId) {
    return { success: false };
  }

  const requiredPick = room.currentBlackCard?.pick || 1;
  const available = player.hand.length;

  if (available === 0) {
    return { success: false };
  }

  // Pick random indices from the player's hand
  const handIndices = player.hand.map((_, i) => i);
  shuffleArray(handIndices);
  const autoIndices = handIndices.slice(0, Math.min(requiredPick, available));

  return submitCards(room, playerId, autoIndices);
}
