import useGameStore from '../store/gameStore';

export default function Timer() {
  const remaining = useGameStore((s) => s.timerRemaining);

  if (remaining == null || remaining < 0) return null;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isUrgent = remaining <= 10;

  return (
    <span className={`font-mono font-bold ${isUrgent ? 'text-red-500 animate-pulse' : 'text-white'}`}>
      {minutes}:{seconds.toString().padStart(2, '0')}
    </span>
  );
}
