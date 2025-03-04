import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGameState } from '@/contexts/GameStateContext';

interface GameOverScreenProps {
  winner: { id: string; name: string } | null;
  onPlayAgain: () => void;
  onMultiplayer?: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ winner, onPlayAgain, onMultiplayer }) => {
  const { userProfile } = useAuth();
  const { gameState } = useGameState();
  const isMultiplayer = !!winner;
  
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-game-dark bg-opacity-90 z-30">
      <div className="bg-game-dark border-2 border-game-blue p-6 rounded-lg w-full max-w-md text-center">
        <h2 className="font-pixel text-game-yellow text-2xl mb-4">Game Over!</h2>
        
        {isMultiplayer ? (
          <div className="mb-6">
            <p className="text-game-light text-lg mb-2">Winner:</p>
            <p className="text-game-blue text-xl font-bold">{winner.name}</p>
          </div>
        ) : (
          <div className="mb-6">
            <p className="text-game-light text-lg mb-2">Your Score:</p>
            <p className="text-game-blue text-xl font-bold">{gameState.score}</p>
            
            {userProfile?.highScore && (
              <div className="mt-4">
                <p className="text-game-light text-sm">High Score:</p>
                <p className="text-game-yellow text-lg">
                  {Math.max(userProfile.highScore, gameState.score)}
                </p>
              </div>
            )}
          </div>
        )}
        
        <div className="flex space-x-4 mt-6">
          <button 
            onClick={onPlayAgain}
            className="bg-game-blue hover:bg-game-blue-dark text-white font-bold py-2 px-4 rounded"
          >
            Play Again
          </button>
          
          {!isMultiplayer && onMultiplayer && (
            <button 
              onClick={onMultiplayer}
              className="bg-game-green hover:bg-game-green-dark text-white font-bold py-2 px-4 rounded"
            >
              Multiplayer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameOverScreen;
