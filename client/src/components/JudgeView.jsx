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
  const gameMode = useGameStore((s) => s.gameMode);
  const hasVoted = useGameStore((s) => s.hasVoted);
  const voteCount = useGameStore((s) => s.voteCount);
  const totalVoters = useGameStore((s) => s.totalVoters);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const judge = players[currentJudgeIndex];
  const isJudge = judge?.id === playerId;
  const isVoteMode = gameMode === 'vote';
  const myScore = players.find((p) => p.id === playerId)?.score || 0;

  const handlePick = () => {
    if (selectedIndex == null) return;
    if (isVoteMode) {
      emit('vote_pick', { roomCode, submissionIndex: selectedIndex });
    } else {
      emit('judge_pick', { roomCode, submissionIndex: selectedIndex });
    }
    setSelectedIndex(null);
  };

  // Non-judge waiting screen (classic mode only)
  if (!isJudge && !isVoteMode) {
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

        <div className="text-center mt-4 pb-2">
          <span className="text-xs text-secondary">קוד חדר: <span className="font-mono text-muted">{roomCode}</span></span>
        </div>
      </div>
    );
  }

  // Vote mode: already voted, waiting
  if (isVoteMode && hasVoted) {
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
          <div className="text-4xl">✓</div>
          <h3 className="text-xl font-secular">ההצבעה נקלטה!</h3>
          <p className="text-muted text-sm">
            ממתינים לשאר השחקנים... ({voteCount}/{totalVoters})
          </p>
        </div>

        <div className="text-center mt-4 pb-2">
          <span className="text-xs text-secondary">קוד חדר: <span className="font-mono text-muted">{roomCode}</span></span>
        </div>
      </div>
    );
  }

  // Judge view with submissions
  return (
    <div className="flex flex-col min-h-screen py-4">
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-sm text-muted">סיבוב {roundNumber}/{maxRounds}</span>
        <span className="text-sm text-gold font-bold">{isVoteMode ? '🗳️ הצביעו!' : '👑 בחר את הזוכה!'}</span>
      </div>

      <div className="mb-4">
        <BlackCard card={currentBlackCard} />
      </div>

      {/* Submissions */}
      <div className="flex-1">
        <p className="text-sm text-muted mb-3">התשובות ({submissions.length}):</p>

        {submissions.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <p className="text-muted text-sm">התשובות לא הגיעו? נסה לרענן:</p>
            <button
              onClick={() => emit('rejoin_room', { roomCode, playerName: players.find((p) => p.id === playerId)?.name })}
              className="bg-gold/20 text-gold border border-gold/30 px-6 py-2 rounded-xl text-sm font-bold hover:bg-gold/30 transition-colors"
            >
              רענן תשובות 🔄
            </button>
          </div>
        )}

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
          {isVoteMode ? 'הצבע! 🗳️' : 'זה הזוכה! 🏆'}
        </button>
      </div>

      <div className="text-center mt-4 pb-2">
        <span className="text-xs text-secondary">קוד חדר: <span className="font-mono text-muted">{roomCode}</span></span>
      </div>
    </div>
  );
}
