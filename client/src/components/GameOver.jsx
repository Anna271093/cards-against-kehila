import useGameStore from '../store/gameStore';
import Scoreboard from './Scoreboard';

export default function GameOver({ emit }) {
  const roomCode = useGameStore((s) => s.roomCode);
  const isHost = useGameStore((s) => s.isHost);
  const scoreboard = useGameStore((s) => s.scoreboard);
  const resetGame = useGameStore((s) => s.resetGame);

  const winner = scoreboard[0];

  const handleNewGame = () => {
    emit('new_game', { roomCode });
  };

  const handleExit = () => {
    resetGame();
  };

  return (
    <div className="flex flex-col items-center min-h-screen py-8 gap-6">
      {/* Winner celebration */}
      <div className="text-center animate-slam">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-3xl font-secular text-gold">
          {winner?.name || 'תיקו'}!
        </h1>
        {winner && (
          <p className="text-xl text-white mt-1">
            עם {winner.score} נקודות
          </p>
        )}
      </div>

      {/* Final scoreboard */}
      <div className="w-full animate-slideUp" style={{ animationDelay: '0.3s' }}>
        <Scoreboard scoreboard={scoreboard} highlight={winner?.id} />
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-3 w-full mt-auto">
        {isHost && (
          <button className="btn-gold w-full py-4 text-lg" onClick={handleNewGame}>
            משחק חדש 🔄
          </button>
        )}
        <button
          className="w-full py-3 rounded-xl border border-card-border text-muted hover:text-white hover:border-muted transition-colors"
          onClick={handleExit}
        >
          חזרה לתפריט 🏠
        </button>
      </div>
    </div>
  );
}
