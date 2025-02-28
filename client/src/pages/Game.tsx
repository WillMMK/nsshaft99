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
    // Wait a frame before starting a new game to make sure 
    // everything is reset properly
    setTimeout(() => {
      startGame();
    }, 50);
  };
  
  useEffect(() => {
    if (health <= 0) {
      endGame();
    }
  }, [health]);
  
  return (
    <div className="bg-game-dark text-game-light min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full mx-auto">
        <h1 className="text-center text-game-yellow font-pixel text-2xl mb-4 animate-bobbing">NS-SHAFT</h1>
        
        <div className="relative bg-game-dark border-4 border-game-blue rounded-lg overflow-hidden" 
             style={{ height: '500px', maxHeight: '80vh', aspectRatio: '9/16' }}>
          
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
