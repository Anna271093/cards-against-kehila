import { useState, useEffect } from 'react';
import useGameStore from '../store/gameStore';

export default function ConnectionBanner({ socket }) {
  const connected = useGameStore((s) => s.connected);
  const screen = useGameStore((s) => s.screen);
  const [showBanner, setShowBanner] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  // Show banner after 2 seconds of being disconnected (avoid flashing on brief blips)
  useEffect(() => {
    if (connected) {
      setShowBanner(false);
      setReconnecting(false);
      return;
    }

    const timer = setTimeout(() => setShowBanner(true), 2000);
    return () => clearTimeout(timer);
  }, [connected]);

  // Don't show on home/join/create — nothing to lose there
  if (!showBanner || screen === 'home' || screen === 'join' || screen === 'create') {
    return null;
  }

  // Don't show if we're already on the full reconnecting screen
  if (screen === 'reconnecting') return null;

  const handleReconnect = () => {
    setReconnecting(true);
    socket.disconnect();
    socket.connect();

    // Reset state after 5 seconds if still disconnected
    setTimeout(() => setReconnecting(false), 5000);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-700 text-white text-center py-3 px-4 flex items-center justify-center gap-3 animate-slideDown">
      <span className="text-sm font-bold">
        {reconnecting ? 'מנסה להתחבר מחדש...' : 'אין חיבור לשרת'}
      </span>
      {!reconnecting && (
        <button
          onClick={handleReconnect}
          className="bg-white text-red-700 text-sm font-bold px-4 py-1 rounded-lg hover:bg-red-100 transition-colors"
        >
          התחבר מחדש
        </button>
      )}
      {reconnecting && (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );
}
