import useGameStore from '../store/gameStore';
import BlackCard from './BlackCard';
import Scoreboard from './Scoreboard';

export default function RevealScreen({ emit }) {
  const roomCode = useGameStore((s) => s.roomCode);
  const isHost = useGameStore((s) => s.isHost);
  const currentBlackCard = useGameStore((s) => s.currentBlackCard);
  const winnerThisRound = useGameStore((s) => s.winnerThisRound);
  const tieWinners = useGameStore((s) => s.tieWinners);
  const scoreboard = useGameStore((s) => s.scoreboard);

  const isTie = tieWinners && tieWinners.length > 1;
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
      {isTie ? (
        <div className="text-center animate-slam">
          <div className="text-4xl mb-2">🤝</div>
          <h2 className="text-2xl font-secular text-gold">תיקו!</h2>
          <p className="text-white text-sm mt-1">
            {tieWinners.map((w) => w.playerName || 'אנונימי').join(' ו')}
          </p>
          <p className="text-muted text-sm">+1 נקודה לכל אחד</p>
        </div>
      ) : (
        <div className="text-center animate-slam">
          <div className="text-4xl mb-2">🎉</div>
          <h2 className="text-2xl font-secular text-gold">
            הזוכה: {winnerName}!
          </h2>
          <p className="text-muted text-sm">+1 נקודה</p>
        </div>
      )}

      {/* Winning answers */}
      {isTie ? (
        <div className="flex flex-col gap-3 animate-scaleIn" style={{ animationDelay: '0.2s' }}>
          <BlackCard card={currentBlackCard} />
          {tieWinners.map((w, i) => (
            <div key={i} className="bg-gold/10 border border-gold/30 rounded-xl p-3">
              <p className="text-xs text-gold mb-1">{w.playerName || 'אנונימי'}:</p>
              {w.cards.map((c, ci) => (
                <p key={ci} className="text-white font-medium">{c.text}</p>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="animate-scaleIn" style={{ animationDelay: '0.2s' }}>
          <BlackCard card={currentBlackCard} winningTexts={winningTexts} />
        </div>
      )}

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

      <div className="text-center pb-2">
        <span className="text-xs text-secondary">קוד חדר: <span className="font-mono text-muted">{roomCode}</span></span>
      </div>
    </div>
  );
}
