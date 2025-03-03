import React, { useEffect, useState } from 'react';
import { playSound } from '@/lib/game/audio';
import { useAuth } from '@/contexts/AuthContext';

interface GameOverScreenProps {
  score: number;
  onRestart: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ score, onRestart }) => {
  const { userProfile, refreshUserProfile } = useAuth();
  const [highScore, setHighScore] = useState(userProfile?.highScore || 0);
  const isHighScore = score > highScore;
  
  useEffect(() => {
    // Play game over sound when screen appears
    playSound('gameover');
    
    // Refresh user profile to get updated high score
    const updateProfile = async () => {
      await refreshUserProfile();
      if (userProfile) {
        setHighScore(userProfile.highScore);
      }
    };
    
    updateProfile();
  }, [refreshUserProfile]);
  
  // Update high score when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setHighScore(userProfile.highScore);
    }
  }, [userProfile]);
  
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-game-dark bg-opacity-90 z-20">
      <h2 className="font-pixel text-danger-red text-xl mb-4">GAME OVER</h2>
      <div className="mb-6">
        <p className="font-mono text-game-light text-lg">
          FINAL SCORE: <span>{score}</span>
        </p>
        
        <p className="font-mono text-game-light text-sm mt-2">
          HIGH SCORE: <span className={isHighScore ? "text-game-yellow" : ""}>{isHighScore ? score : highScore}</span>
          {isHighScore && <span className="text-game-yellow ml-2">NEW!</span>}
        </p>
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
