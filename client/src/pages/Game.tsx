import { useRef } from 'react';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { useGameState } from '@/contexts/GameStateContext';
import GameComponent from '@/components/game/Game';

const GamePage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isMultiplayer, leaveGame } = useMultiplayer();
  const { gameState, resetGame } = useGameState();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="relative w-full max-w-md aspect-[9/16] bg-black overflow-hidden rounded-lg shadow-lg">
        <GameComponent />
      </div>
    </div>
  );
};

export default GamePage;
