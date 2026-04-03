import { useState } from 'react';
import useGameStore from '../store/gameStore';

const ROUND_OPTIONS = [5, 10, 15, 20, 50];
const TIMER_OPTIONS = [
  { label: '30 שניות', value: 30 },
  { label: '45 שניות', value: 45 },
  { label: '60 שניות', value: 60 },
  { label: '90 שניות', value: 90 },
  { label: 'ללא', value: 0 },
];

export default function Lobby({ emit }) {
  const roomCode = useGameStore((s) => s.roomCode);
  const players = useGameStore((s) => s.players);
  const isHost = useGameStore((s) => s.isHost);
  const maxRounds = useGameStore((s) => s.maxRounds);
  const timerSeconds = useGameStore((s) => s.timerSeconds);
  const revealNames = useGameStore((s) => s.revealNames);
  const gameMode = useGameStore((s) => s.gameMode);
  const cardMode = useGameStore((s) => s.cardMode);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  };

  const updateSetting = (key, value) => {
    emit('update_settings', {
      roomCode,
      maxRounds: key === 'maxRounds' ? value : maxRounds,
      timerSeconds: key === 'timerSeconds' ? value : timerSeconds,
      revealNames: key === 'revealNames' ? value : revealNames,
      gameMode: key === 'gameMode' ? value : gameMode,
      cardMode: key === 'cardMode' ? value : cardMode,
    });
  };

  const handleStart = () => {
    emit('start_game', { roomCode });
  };

  return (
    <div className="flex flex-col min-h-screen py-6 px-2">
      {/* Room code */}
      <div className="text-center mb-6 animate-scaleIn">
        <p className="text-sm text-muted mb-2">קוד חדר</p>
        <button
          onClick={handleCopy}
          className="text-4xl font-mono font-bold tracking-[0.3em] text-gold hover:text-gold-dark transition-colors"
          dir="ltr"
        >
          {roomCode}
        </button>
        <p className="text-xs text-muted mt-1">
          {copied ? '!הועתק ✓' : 'לחץ להעתקה'}
        </p>
      </div>

      {/* Players list */}
      <div className="bg-card-black border border-card-border rounded-2xl p-4 mb-6">
        <h3 className="text-lg font-secular mb-3">
          שחקנים ({players.length})
        </h3>
        <div className="flex flex-col gap-2">
          {players.map((player, index) => (
            <div
              key={player.id}
              className="flex items-center gap-3 py-2 px-3 rounded-lg bg-bg animate-slideUp"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <span className="text-xl">
                {index === 0 ? '👑' : `${index + 1}.`}
              </span>
              <span className="text-white font-medium">{player.name}</span>
            </div>
          ))}
        </div>
        {players.length < 3 && (
          <p className="text-sm text-muted mt-3 text-center animate-pulse">
            ממתינים לשחקנים... ({players.length}/3 מינימום)
          </p>
        )}
      </div>

      {/* Settings (host only) */}
      {isHost && (
        <div className="bg-card-black border border-card-border rounded-2xl p-4 mb-6">
          <h3 className="text-lg font-secular mb-3">הגדרות</h3>

          {/* Game mode */}
          <div className="mb-4">
            <label className="text-sm text-muted mb-2 block">מצב משחק</label>
            <div className="flex gap-2">
              <button
                onClick={() => updateSetting('gameMode', 'classic')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  gameMode === 'classic'
                    ? 'bg-gold text-card-black'
                    : 'bg-bg text-muted hover:text-white'
                }`}
              >
                👑 שופט
              </button>
              <button
                onClick={() => updateSetting('gameMode', 'vote')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  gameMode === 'vote'
                    ? 'bg-gold text-card-black'
                    : 'bg-bg text-muted hover:text-white'
                }`}
              >
                🗳️ הצבעת רוב
              </button>
            </div>
            <p className="text-xs text-secondary mt-1">
              {gameMode === 'classic'
                ? 'שופט בוחר את התשובה המנצחת'
                : 'כולם מצביעים, הרוב קובע'}
            </p>
          </div>

          {/* Card mode */}
          <div className="mb-4">
            <label className="text-sm text-muted mb-2 block">סגנון קלפים</label>
            <div className="flex gap-2">
              <button
                onClick={() => updateSetting('cardMode', 'keep')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  cardMode === 'keep'
                    ? 'bg-gold text-card-black'
                    : 'bg-bg text-muted hover:text-white'
                }`}
              >
                🃏 קלאסי
              </button>
              <button
                onClick={() => updateSetting('cardMode', 'random')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  cardMode === 'random'
                    ? 'bg-gold text-card-black'
                    : 'bg-bg text-muted hover:text-white'
                }`}
              >
                🎲 רנדומלי
              </button>
            </div>
            <p className="text-xs text-secondary mt-1">
              {cardMode === 'keep'
                ? 'שומרים את הקלפים, מקבלים השלמה בכל סיבוב'
                : 'קלפים חדשים לגמרי בכל סיבוב'}
            </p>
          </div>

          {/* Rounds */}
          <div className="mb-4">
            <label className="text-sm text-muted mb-2 block">מספר סיבובים</label>
            <div className="flex gap-2 flex-wrap">
              {ROUND_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => updateSetting('maxRounds', n)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    maxRounds === n
                      ? 'bg-gold text-card-black'
                      : 'bg-bg text-muted hover:text-white'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Timer */}
          <div className="mb-4">
            <label className="text-sm text-muted mb-2 block">טיימר בחירה</label>
            <div className="flex gap-2 flex-wrap">
              {TIMER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateSetting('timerSeconds', opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    timerSeconds === opt.value
                      ? 'bg-gold text-card-black'
                      : 'bg-bg text-muted hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reveal names */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={revealNames}
                onChange={(e) => updateSetting('revealNames', e.target.checked)}
                className="w-5 h-5 accent-gold"
              />
              <span className="text-sm text-white">חשיפת שמות בסוף סיבוב</span>
            </label>
          </div>
        </div>
      )}

      {/* Start button (host only) */}
      {isHost && (
        <button
          className="btn-gold w-full py-4 text-xl"
          onClick={handleStart}
          disabled={players.length < 3}
        >
          {players.length < 3
            ? `צריך עוד ${3 - players.length} שחקנים`
            : 'התחל משחק! 🎯'}
        </button>
      )}

      {!isHost && (
        <p className="text-center text-muted animate-pulse">
          ממתינים שהמארח יתחיל...
        </p>
      )}
    </div>
  );
}
