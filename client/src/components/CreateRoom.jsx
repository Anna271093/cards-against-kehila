import { useState } from 'react';
import useGameStore from '../store/gameStore';

export default function CreateRoom({ emit }) {
  const [name, setName] = useState('');
  const setScreen = useGameStore((s) => s.setScreen);
  const setRoomInfo = useGameStore((s) => s.setRoomInfo);

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 15) return;

    useGameStore.setState({ playerName: trimmed });
    emit('create_room', { playerName: trimmed });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
      <button
        onClick={() => setScreen('home')}
        className="self-start text-muted hover:text-white text-sm mb-4"
      >
        → חזרה
      </button>

      <h2 className="text-2xl font-secular">צור חדר חדש</h2>

      <div className="w-full max-w-[300px] flex flex-col gap-4">
        <div>
          <label className="text-sm text-muted mb-1 block">מה השם שלך?</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 15))}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="הכנס שם..."
            maxLength={15}
            className="w-full bg-card-black border border-card-border rounded-xl px-4 py-3 text-white text-lg outline-none focus:border-gold transition-colors"
            autoFocus
            dir="rtl"
          />
          <p className="text-xs text-secondary mt-1">{name.length}/15</p>
        </div>

        <button
          className="btn-gold w-full py-3"
          onClick={handleCreate}
          disabled={!name.trim()}
        >
          צור חדר 🃏
        </button>
      </div>
    </div>
  );
}
