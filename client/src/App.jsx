import useSocket from './hooks/useSocket';
import useGameStore from './store/gameStore';
import Home from './components/Home';
import JoinRoom from './components/JoinRoom';
import CreateRoom from './components/CreateRoom';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import JudgeView from './components/JudgeView';
import RevealScreen from './components/RevealScreen';
import GameOver from './components/GameOver';

export default function App() {
  const { emit } = useSocket();
  const screen = useGameStore((s) => s.screen);
  const errorMessage = useGameStore((s) => s.errorMessage);

  return (
    <div className="app-container">
      {errorMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-xl text-sm font-bold animate-slideUp max-w-[90vw] text-center">
          {errorMessage}
        </div>
      )}

      {screen === 'home' && <Home />}
      {screen === 'join' && <JoinRoom emit={emit} />}
      {screen === 'create' && <CreateRoom emit={emit} />}
      {screen === 'lobby' && <Lobby emit={emit} />}
      {screen === 'playing' && <GameBoard emit={emit} />}
      {screen === 'judging' && <JudgeView emit={emit} />}
      {screen === 'reveal' && <RevealScreen emit={emit} />}
      {screen === 'finished' && <GameOver emit={emit} />}
    </div>
  );
}
