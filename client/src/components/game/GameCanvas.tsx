import { useRef, useEffect } from 'react';
import HealthBar from './HealthBar';
import MobileControls from './MobileControls';
import useGameLoop from '@/hooks/useGameLoop';

interface GameCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  health: number;
  setHealth: (health: number) => void;
  score: number;
  setScore: (score: number) => void;
  gameActive: boolean;
  onGameOver: () => void;
}

const GameCanvas = ({ 
  canvasRef, 
  health, 
  setHealth, 
  score, 
  setScore, 
  gameActive,
  onGameOver 
}: GameCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const movingLeft = useRef(false);
  const movingRight = useRef(false);

  const { updateMovement } = useGameLoop({
    canvasRef,
    health,
    setHealth,
    score,
    setScore,
    gameActive,
    onGameOver
  });

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        movingLeft.current = true;
        updateMovement(true, false);
      } else if (e.key === 'ArrowRight') {
        movingRight.current = true;
        updateMovement(false, true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        movingLeft.current = false;
        updateMovement(false, movingRight.current);
      } else if (e.key === 'ArrowRight') {
        movingRight.current = false;
        updateMovement(movingLeft.current, false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [updateMovement]);

  // Initialize canvas size
  useEffect(() => {
    const resizeCanvas = () => {
      if (containerRef.current && canvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [canvasRef]);

  const handleMoveLeft = () => {
    movingLeft.current = true;
    updateMovement(true, movingRight.current);
  };

  const handleStopMoveLeft = () => {
    movingLeft.current = false;
    updateMovement(false, movingRight.current);
  };

  const handleMoveRight = () => {
    movingRight.current = true;
    updateMovement(movingLeft.current, true);
  };

  const handleStopMoveRight = () => {
    movingRight.current = false;
    updateMovement(movingLeft.current, false);
  };

  return (
    <div ref={containerRef} className="absolute inset-0">
      {/* Game UI */}
      <div className="absolute top-0 left-0 w-full p-2 flex justify-between items-center z-10 bg-game-dark bg-opacity-70">
        <HealthBar health={health} />
        <div className="font-mono text-game-yellow text-lg">
          <span>SCORE:</span>
          <span id="score-value">{score}</span>
        </div>
      </div>

      {/* Canvas for the game */}
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 w-full h-full"
      />

      {/* Mobile controls */}
      <MobileControls 
        onMoveLeft={handleMoveLeft}
        onStopMoveLeft={handleStopMoveLeft}
        onMoveRight={handleMoveRight}
        onStopMoveRight={handleStopMoveRight}
      />
    </div>
  );
};

export default GameCanvas;
