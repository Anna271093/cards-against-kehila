import { useState } from 'react';
import useGameStore from '../store/gameStore';
import BlackCard from './BlackCard';
import WhiteCard from './WhiteCard';
import Timer from './Timer';

export default function GameBoard({ emit }) {
  const roomCode = useGameStore((s) => s.roomCode);
  const players = useGameStore((s) => s.players);
  const playerId = useGameStore((s) => s.playerId);
  const currentBlackCard = useGameStore((s) => s.currentBlackCard);
  const currentJudgeIndex = useGameStore((s) => s.currentJudgeIndex);
  const roundNumber = useGameStore((s) => s.roundNumber);
  const maxRounds = useGameStore((s) => s.maxRounds);
  const myHand = useGameStore((s) => s.myHand);
  const selectedCards = useGameStore((s) => s.selectedCards);
  const hasSubmitted = useGameStore((s) => s.hasSubmitted);
  const submittedCount = useGameStore((s) => s.submittedCount);
  const totalPlayers = useGameStore((s) => s.totalPlayers);
  const selectCard = useGameStore((s) => s.selectCard);
  const canSwap = useGameStore((s) => s.canSwap);
  const gameMode = useGameStore((s) => s.gameMode);
  const [customText, setCustomText] = useState('');

  const judge = players[currentJudgeIndex];
  const isJudge = gameMode === 'classic' && judge?.id === playerId;
  const myScore = players.find((p) => p.id === playerId)?.score || 0;
  const requiredPick = currentBlackCard?.pick || 1;

  const hasCustomSelected = selectedCards.some(i => myHand[i]?.isCustom);

  const handleSubmit = () => {
    if (selectedCards.length !== requiredPick) return;
    if (hasCustomSelected && !customText.trim()) return;
    emit('submit_card', {
      roomCode,
      cardIndices: selectedCards,
      ...(hasCustomSelected ? { customText: customText.trim() } : {}),
    });
    setCustomText('');
  };

  const handleSwap = (cardIndex) => {
    emit('swap_card', { roomCode, cardIndex });
  };

  return (
    <div className="flex flex-col min-h-screen py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-sm text-muted">
          סיבוב {roundNumber}/{maxRounds}
        </span>
        <span className="text-sm">
          🏆 {myScore} נק׳
        </span>
      </div>

      {/* Black card */}
      <div className="mb-4 animate-scaleIn">
        <BlackCard card={currentBlackCard} />
      </div>

      {/* Judge indicator (classic mode) */}
      {gameMode === 'classic' && judge && !isJudge && (
        <div className="text-center mb-3 px-1">
          <span className="text-sm text-gold">
            👑 השופט: <span className="font-bold">{judge.name}</span>
          </span>
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-sm text-muted">
          {submittedCount}/{totalPlayers || (players.length - 1)} הגישו
        </span>
        <Timer />
      </div>

      {/* Judge view */}
      {isJudge ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="text-5xl">👑</div>
          <h3 className="text-xl font-secular text-gold">אתה השופט!</h3>
          <p className="text-muted text-sm">חכה שכולם יבחרו...</p>
        </div>
      ) : hasSubmitted ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="text-4xl">✓</div>
          <p className="text-lg text-white font-medium">הבחירה שלך נשלחה</p>
          <p className="text-muted text-sm">ממתינים לשאר השחקנים...</p>
        </div>
      ) : (
        <>
          {/* White cards hand */}
          <div className="flex-1">
            <p className="text-sm text-muted mb-3">
              הקלפים שלך {requiredPick > 1 ? `(בחר ${requiredPick})` : ''}:
            </p>
            <div className="grid grid-cols-2 gap-3">
              {myHand.map((card, index) => (
                <div
                  key={index}
                  className="animate-slideUp relative"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <WhiteCard
                    text={card.text}
                    selected={selectedCards.includes(index)}
                    selectionOrder={
                      requiredPick > 1
                        ? selectedCards.indexOf(index) >= 0
                          ? selectedCards.indexOf(index)
                          : null
                        : null
                    }
                    onClick={() => selectCard(index)}
                  />
                  {canSwap && !selectedCards.includes(index) && (
                    <button
                      className="absolute top-1 left-1 text-xs bg-black/60 text-muted hover:text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors"
                      onClick={(e) => { e.stopPropagation(); handleSwap(index); }}
                      title="החלף קלף"
                    >
                      🔄
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Custom card input */}
          {hasCustomSelected && (
            <div className="mt-3 animate-slideUp">
              <label className="text-sm text-gold mb-1 block">✏️ כתוב את התשובה שלך:</label>
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                maxLength={100}
                placeholder="הקלד תשובה..."
                className="w-full px-4 py-3 rounded-xl bg-card-white/10 border border-card-border text-white placeholder-muted text-right focus:outline-none focus:border-gold transition-colors"
                dir="rtl"
              />
            </div>
          )}

          {/* Submit button */}
          <div className="pt-4 sticky bottom-4">
            <button
              className="btn-gold w-full py-4 text-lg"
              onClick={handleSubmit}
              disabled={selectedCards.length !== requiredPick || (hasCustomSelected && !customText.trim())}
            >
              שלח! 🎯
            </button>
          </div>
        </>
      )}

      {/* Room code footer */}
      <div className="text-center mt-4 pb-2">
        <span className="text-xs text-secondary">קוד חדר: <span className="font-mono text-muted">{roomCode}</span></span>
      </div>
    </div>
  );
}
