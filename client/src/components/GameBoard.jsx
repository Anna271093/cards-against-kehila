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

  const judge = players[currentJudgeIndex];
  const isJudge = judge?.id === playerId;
  const myScore = players.find((p) => p.id === playerId)?.score || 0;
  const requiredPick = currentBlackCard?.pick || 1;

  const handleSubmit = () => {
    if (selectedCards.length !== requiredPick) return;
    emit('submit_card', { roomCode, cardIndices: selectedCards });
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
                  className="animate-slideUp"
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
                </div>
              ))}
            </div>
          </div>

          {/* Submit button */}
          <div className="pt-4 sticky bottom-4">
            <button
              className="btn-gold w-full py-4 text-lg"
              onClick={handleSubmit}
              disabled={selectedCards.length !== requiredPick}
            >
              שלח! 🎯
            </button>
          </div>
        </>
      )}
    </div>
  );
}
