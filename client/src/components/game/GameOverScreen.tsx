import React, { useEffect } from 'react';
import { playSound } from '@/lib/game/audio';
import { useAuth } from '@/contexts/AuthContext';

interface GameOverScreenProps {
  score: number;
  onRestart: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ score, onRestart }) => {
  const { userProfile } = useAuth();
  const isHighScore = userProfile && score > userProfile.highScore;
  
  useEffect(() => {
    // Play game over sound when screen appears
    playSound('gameover');
  }, []);
  
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-game-dark bg-opacity-90 z-20">
      <h2 className="font-pixel text-danger-red text-xl mb-4">GAME OVER</h2>
      <div className="mb-6">
        <p className="font-mono text-game-light text-lg">
          FINAL SCORE: <span>{score}</span>
        </p>
        
        {userProfile && (
          <p className="font-mono text-game-light text-sm mt-2">
            HIGH SCORE: <span className={isHighScore ? "text-game-yellow" : ""}>{isHighScore ? score : userProfile.highScore}</span>
            {isHighScore && <span className="text-game-yellow ml-2">NEW!</span>}
          </p>
        )}
      </div>
      
      <button 
        onClick={onRestart}
        className="px-6 py-3 bg-game-red hover:bg-opacity-80 text-white font-pixel rounded-lg transition-all"
      >
        TRY AGAIN
      </button>
    </div>
  );
};

export default GameOverScreen;
