import useGameStore from '../store/gameStore';

export default function Home() {
  const setScreen = useGameStore((s) => s.setScreen);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 text-center px-4">
      {/* Logo */}
      <div className="animate-scaleIn">
        <div className="text-6xl mb-4">🃏</div>
        <h1 className="text-3xl font-secular text-white leading-tight">
          קלפים נגד הקהילה
        </h1>
        <p className="text-muted text-sm mt-2">
          משחק קלפים לאנשים שממילא ישפטו
        </p>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-4 w-full max-w-[280px] animate-slideUp" style={{ animationDelay: '0.2s' }}>
        <button
          className="btn-gold text-lg py-4"
          onClick={() => setScreen('create')}
        >
          🃏 צור חדר חדש
        </button>
        <button
          className="btn-gold text-lg py-4 !bg-none bg-card-black !text-white border-2 border-card-border hover:border-gold"
          onClick={() => setScreen('join')}
        >
          🚪 הצטרף לחדר
        </button>
      </div>

      {/* Footer */}
      <p className="text-secondary text-xs mt-8 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
        100 קלפים שחורים • 500 קלפים לבנים • 0 קלפים פוגעניים
      </p>
    </div>
  );
}
