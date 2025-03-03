import { useState, useRef, useEffect } from 'react';
import { Link } from 'wouter';
import GameCanvas from '@/components/game/GameCanvas';
import StartScreen from '@/components/game/StartScreen';
import GameOverScreen from '@/components/game/GameOverScreen';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

const Game = () => {
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [health, setHealth] = useState(100);
  const [score, setScore] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentUser, userProfile } = useAuth();

  const startGame = () => {
    setGameActive(true);
    setGameOver(false);
    setHealth(100);
    setScore(0);
  };

  const endGame = async () => {
    setGameActive(false);
    setGameOver(true);

    // Update user stats in Firestore
    if (currentUser) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        
        // Update games played count
        await updateDoc(userRef, {
          gamesPlayed: increment(1)
        });

        // Update high score if current score is higher
        if (userProfile && score > userProfile.highScore) {
          await updateDoc(userRef, {
            highScore: score
          });
        }
      } catch (error) {
        console.error('Error updating user stats:', error);
      }
    }
  };

  const restartGame = () => {
    startGame();
  };

  return (
    <div className="bg-game-dark text-game-light min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-4">
          <h1 className="text-game-yellow font-pixel text-2xl animate-bobbing">NS-SHAFT</h1>
          <Link href="/profile">
            <a className="px-3 py-1 bg-game-blue hover:bg-opacity-80 text-white font-pixel rounded-lg transition-all text-sm">
              Profile
            </a>
          </Link>
        </div>
        
        {/* Canvas container with proper centering and aspect ratio */}
        <div 
          className="game-container game-center bg-game-dark border-4 border-game-blue rounded-lg no-select" 
          style={{ 
            width: '100%', 
            maxWidth: '273px',  /* Match canvas width */
            height: 'auto',
            aspectRatio: '273/492' /* Exact canvas aspect ratio */
          }}
        >
          {gameActive && (
            <GameCanvas 
              canvasRef={canvasRef}
              health={health}
              setHealth={setHealth}
              score={score}
              setScore={setScore}
              gameActive={gameActive}
              onGameOver={endGame}
            />
          )}
          
          {!gameActive && !gameOver && (
            <StartScreen onStartGame={startGame} />
          )}
          
          {gameOver && (
            <GameOverScreen 
              score={score} 
              onRestart={restartGame} 
            />
          )}
        </div>
        
        <div className="mt-4 text-center">
          <p className="font-sans text-sm text-game-light mb-1">Avoid spikes, don't fall too fast!</p>
          <p className="font-sans text-sm text-game-light">Land on platforms to gain health.</p>
        </div>
      </div>
    </div>
  );
};

export default Game;
