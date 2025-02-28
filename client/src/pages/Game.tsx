import { useState, useEffect, useRef } from 'react';
import GameCanvas from '@/components/game/GameCanvas';
import StartScreen from '@/components/game/StartScreen';
import GameOverScreen from '@/components/game/GameOverScreen';
import { INITIAL_HEALTH } from '@/lib/game/constants';

const Game = () => {
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [health, setHealth] = useState(INITIAL_HEALTH);
  const [score, setScore] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const startGame = () => {
    setGameActive(true);
    setGameOver(false);
    setHealth(INITIAL_HEALTH);
    setScore(0);
  };
  
  const endGame = () => {
    setGameActive(false);
    setGameOver(true);
  };
  
  const restartGame = () => {
    setGameActive(false);
    setGameOver(false);
    // Wait longer before starting a new game to make sure 
    // everything is properly cleaned up and reset
    setTimeout(() => {
      startGame();
    }, 200); // Increased timeout to ensure cleanup completes
  };
  
  useEffect(() => {
    if (health <= 0) {
      endGame();
    }
  }, [health]);
  
  return (
    <div className="bg-game-dark text-game-light min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto flex flex-col items-center">
        <h1 className="text-center text-game-yellow font-pixel text-2xl mb-4 animate-bobbing">NS-SHAFT</h1>
        
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
