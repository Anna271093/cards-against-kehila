import { useState } from 'react';
import useGameStore from '../store/gameStore';
import BlackCard from './BlackCard';

export default function JudgeView({ emit }) {
  const roomCode = useGameStore((s) => s.roomCode);
  const playerId = useGameStore((s) => s.playerId);
  const players = useGameStore((s) => s.players);
  const currentBlackCard = useGameStore((s) => s.currentBlackCard);
  const currentJudgeIndex = useGameStore((s) => s.currentJudgeIndex);
  const submissions = useGameStore((s) => s.submissions);
  const roundNumber = useGameStore((s) => s.roundNumber);
  const maxRounds = useGameStore((s) => s.maxRounds);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const judge = players[currentJudgeIndex];
  const isJudge = judge?.id === playerId;
  const myScore = players.find((p) => p.id === playerId)?.score || 0;

  const handlePick = () => {
    if (selectedIndex == null) return;
    emit('judge_pick', { roomCode, submissionIndex: selectedIndex });
    setSelectedIndex(null);
  };

  // Non-judge waiting screen
  if (!isJudge) {
    return (
      <div className="flex flex-col min-h-screen py-4">
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-sm text-muted">סיבוב {roundNumber}/{maxRounds}</span>
          <span className="text-sm">🏆 {myScore} נק׳</span>
        </div>

        <div className="mb-4">
          <BlackCard card={currentBlackCard} />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="text-5xl animate-pulse">🤔</div>
          <h3 className="text-xl font-secular">השופט בוחר...</h3>
          <p className="text-muted text-sm">
            {judge?.name} בודק/ת את התשובות
          </p>
        </div>
      </div>
    );
  }

  // Judge view with submissions
  return (
    <div className="flex flex-col min-h-screen py-4">
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-sm text-muted">סיבוב {roundNumber}/{maxRounds}</span>
        <span className="text-sm text-gold font-bold">👑 בחר את הזוכה!</span>
      </div>

      <div className="mb-4">
        <BlackCard card={currentBlackCard} />
      </div>

      {/* Submissions */}
      <div className="flex-1">
        <p className="text-sm text-muted mb-3">התשובות ({submissions.length}):</p>
        <div className="flex flex-col gap-3">
          {submissions.map((sub, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={`text-right p-4 rounded-xl border-2 transition-all animate-slideUp ${
                selectedIndex === index
                  ? 'bg-gold/10 border-gold'
                  : 'bg-card-white/5 border-card-border hover:border-muted'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {sub.cards.map((card, ci) => (
                <p key={ci} className={`text-lg ${selectedIndex === index ? 'text-gold' : 'text-white'} font-medium`}>
                  {sub.cards.length > 1 ? `${ci + 1}. ` : ''}{card.text}
                </p>
              ))}
            </button>
          ))}
        </div>
      </div>

      {/* Pick button */}
      <div className="pt-4 sticky bottom-4">
        <button
          className="btn-gold w-full py-4 text-lg"
          onClick={handlePick}
          disabled={selectedIndex == null}
        >
          זה הזוכה! 🏆
        </button>
      </div>
    </div>
  );
}
