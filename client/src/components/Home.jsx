import { useState } from 'react';
import useGameStore from '../store/gameStore';

export default function Home() {
  const setScreen = useGameStore((s) => s.setScreen);
  const [showRules, setShowRules] = useState(false);

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
        <button
          className="text-muted text-sm underline hover:text-white transition-colors mt-2"
          onClick={() => setShowRules(true)}
        >
          📖 איך משחקים?
        </button>
        <a
          href="mailto:stacy2710@gmail.com?subject=הצעה ��קלף חדש - קלפים נגד הקהילה&body=יש לי רעיון לקלף:%0A%0A"
          className="text-muted text-sm underline hover:text-gold transition-colors"
        >
          💡 הצעות לקלפים חדשים
        </a>
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setShowRules(false)}>
          <div
            className="bg-card-black border border-card-border rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto text-right animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-secular text-gold mb-4">איך משחקים?</h2>

            <div className="text-sm text-muted space-y-3 leading-relaxed">
              <p><span className="text-white font-bold">1.</span> שחקן אחד יוצר חדר ומשתף את הקוד עם החברים (מינימום 3 שחקנים).</p>
              <p><span className="text-white font-bold">2.</span> בכל סיבוב, שחקן אחד הוא <span className="text-gold">השופט</span>. הוא לא משחק — רק בוחר מנצח.</p>
              <p><span className="text-white font-bold">3.</span> נחשף <span className="text-white">קלף שחור</span> עם משפט חסר (________).</p>
              <p><span className="text-white font-bold">4.</span> כל שאר השחקנים בוחרים <span className="text-white">קלף לבן</span> מהיד שלהם שהכי מתאים (או הכי מצחיק) להשלים את המשפט.</p>
              <p><span className="text-white font-bold">5.</span> השופט רואה את כל התשובות (בלי לדעת מי שלח מה) ובוחר את <span className="text-gold">התשובה המנצחת</span>.</p>
              <p><span className="text-white font-bold">6.</span> מי שזכה מקבל נקודה. השופט מתחלף, וממשיכים לסיבוב הבא.</p>
              <p><span className="text-white font-bold">7.</span> בסוף כל הסיבובים, מי שצבר הכי הרבה נקודות — <span className="text-gold">מנצח!</span></p>
            </div>

            <button
              className="btn-gold w-full mt-5 py-3"
              onClick={() => setShowRules(false)}
            >
              הבנתי, בואו נשחק!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
