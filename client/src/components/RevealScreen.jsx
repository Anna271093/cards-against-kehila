import useGameStore from '../store/gameStore';
import BlackCard from './BlackCard';
import Scoreboard from './Scoreboard';

export default function RevealScreen({ emit }) {
  const roomCode = useGameStore((s) => s.roomCode);
  const isHost = useGameStore((s) => s.isHost);
  const currentBlackCard = useGameStore((s) => s.currentBlackCard);
  const winnerThisRound = useGameStore((s) => s.winnerThisRound);
  const scoreboard = useGameStore((s) => s.scoreboard);

  const winnerName = winnerThisRound?.playerName || 'אנונימי';
  const winningTexts = winnerThisRound?.cards?.map((c) => c.text) || [];

  const handleNext = () => {
    emit('next_round', { roomCode });
  };

  const handleEnd = () => {
    emit('end_game', { roomCode });
  };

  return (
    <div className="flex flex-col min-h-screen py-4 gap-4">
      {/* Winner announcement */}
      <div className="text-center animate-slam">
        <div className="text-4xl mb-2">🎉</div>
        <h2 className="text-2xl font-secular text-gold">
          הזוכה: {winnerName}!
        </h2>
        <p className="text-muted text-sm">+1 נקודה</p>
      </div>

      {/* Black card with winning answer */}
      <div className="animate-scaleIn" style={{ animationDelay: '0.2s' }}>
        <BlackCard card={currentBlackCard} winningTexts={winningTexts} />
      </div>

      {/* Scoreboard */}
      <div className="animate-slideUp" style={{ animationDelay: '0.4s' }}>
        <Scoreboard
          scoreboard={scoreboard}
          highlight={winnerThisRound?.playerId}
        />
      </div>

      {/* Host controls */}
      {isHost && (
        <div className="flex gap-3 mt-auto pt-4 sticky bottom-4">
          <button
            className="btn-gold flex-1 py-3"
            onClick={handleNext}
          >
            סיבוב הבא ←
          </button>
          <button
            className="px-4 py-3 rounded-xl border border-card-border text-muted hover:text-white hover:border-muted transition-colors text-sm"
            onClick={handleEnd}
          >
            סיים
          </button>
        </div>
      )}

      {!isHost && (
        <p className="text-center text-muted animate-pulse mt-auto">
          ממתינים למארח...
        </p>
      )}
    </div>
  );
}
