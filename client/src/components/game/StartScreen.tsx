import React from 'react';
import { useGameState } from '@/contexts/GameStateContext';

interface StartScreenProps {
  onStartGame: () => void;
  onStartMultiplayer: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStartGame, onStartMultiplayer }) => {
  const { resetGame, setGameState } = useGameState();

  const handleStartGame = () => {
    resetGame();
    setGameState(prev => ({
      ...prev,
      isRunning: true
    }));
    onStartGame();
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-game-dark bg-opacity-80 z-10">
      <h1 className="font-pixel text-game-yellow text-2xl mb-8">NS-SHAFT</h1>
      
      <div className="flex flex-col gap-4">
        <button 
          onClick={handleStartGame}
          className="px-6 py-3 bg-game-red hover:bg-opacity-80 text-white font-pixel rounded-lg transition-all"
        >
          START GAME
        </button>
        
        <button 
          onClick={onStartMultiplayer}
          className="px-6 py-3 bg-game-blue hover:bg-opacity-80 text-white font-pixel rounded-lg transition-all"
        >
          MULTIPLAYER
        </button>
      </div>
    </div>
  );
};

export default StartScreen;
