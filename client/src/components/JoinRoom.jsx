import { useState } from 'react';
import useGameStore from '../store/gameStore';

export default function JoinRoom({ emit }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const setScreen = useGameStore((s) => s.setScreen);

  const handleJoin = () => {
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();
    if (trimmedCode.length !== 6 || !trimmedName || trimmedName.length > 15) return;

    useGameStore.setState({ playerName: trimmedName, roomCode: trimmedCode });
    emit('join_room', { roomCode: trimmedCode, playerName: trimmedName });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
      <button
        onClick={() => setScreen('home')}
        className="self-start text-muted hover:text-white text-sm mb-4"
      >
        → חזרה
      </button>

      <h2 className="text-2xl font-secular">הצטרף לחדר</h2>

      <div className="w-full max-w-[300px] flex flex-col gap-4">
        <div>
          <label className="text-sm text-muted mb-1 block">קוד חדר</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            placeholder="ABC123"
            maxLength={6}
            className="w-full bg-card-black border border-card-border rounded-xl px-4 py-3 text-white text-2xl text-center tracking-[0.3em] font-mono outline-none focus:border-gold transition-colors"
            autoFocus
            dir="ltr"
          />
        </div>

        <div>
          <label className="text-sm text-muted mb-1 block">מה השם שלך?</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 15))}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            placeholder="הכנס שם..."
            maxLength={15}
            className="w-full bg-card-black border border-card-border rounded-xl px-4 py-3 text-white text-lg outline-none focus:border-gold transition-colors"
            dir="rtl"
          />
          <p className="text-xs text-secondary mt-1">{name.length}/15</p>
        </div>

        <button
          className="btn-gold w-full py-3"
          onClick={handleJoin}
          disabled={code.length !== 6 || !name.trim()}
        >
          הצטרף 🚪
        </button>
      </div>
    </div>
  );
}
