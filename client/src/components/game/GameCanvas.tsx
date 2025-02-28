import React, { useRef, useEffect } from 'react';
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

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  canvasRef, 
  health, 
  setHealth, 
  score, 
  setScore, 
  gameActive,
  onGameOver 
}) => {
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

  // Handle keyboard controls with direct event listeners
  useEffect(() => {
    console.log("Setting up keyboard controls");
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        movingLeft.current = true;
        updateMovement(true, movingRight.current);
        console.log("LEFT key down");
      } else if (e.key === 'ArrowRight') {
        movingRight.current = true;
        updateMovement(movingLeft.current, true);
        console.log("RIGHT key down");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        movingLeft.current = false;
        updateMovement(false, movingRight.current);
        console.log("LEFT key up");
      } else if (e.key === 'ArrowRight') {
        movingRight.current = false;
        updateMovement(movingLeft.current, false);
        console.log("RIGHT key up");
      }
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [updateMovement]);

  // Initialize canvas size when container size changes
  useEffect(() => {
    const resizeCanvas = () => {
      if (containerRef.current && canvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        console.log("Canvas resized to:", width, height);
      }
    };

    // Initial resize
    resizeCanvas();
    
    // Listen for window resize
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [canvasRef]);

  // Mobile control handlers
  const handleMoveLeft = () => {
    movingLeft.current = true;
    updateMovement(true, movingRight.current);
    console.log("Mobile LEFT pressed");
  };

  const handleStopMoveLeft = () => {
    movingLeft.current = false;
    updateMovement(false, movingRight.current);
    console.log("Mobile LEFT released");
  };

  const handleMoveRight = () => {
    movingRight.current = true;
    updateMovement(movingLeft.current, true);
    console.log("Mobile RIGHT pressed");
  };

  const handleStopMoveRight = () => {
    movingRight.current = false;
    updateMovement(movingLeft.current, false);
    console.log("Mobile RIGHT released");
  };

  return (
    <div ref={containerRef} className="absolute inset-0">
      {/* Game UI */}
      <div className="absolute top-0 left-0 w-full p-2 flex justify-between items-center z-10 bg-black bg-opacity-70">
        <HealthBar health={health} />
        <div className="font-mono text-yellow-400 text-lg">
          <span>SCORE: </span>
          <span id="score-value">{score}</span>
        </div>
      </div>

      {/* Debug info */}
      <div className="absolute top-16 left-2 text-white text-xs z-10">
        <div>Controls: Arrow Keys</div>
        <div>Movement: {movingLeft.current ? 'LEFT ' : ''}{movingRight.current ? 'RIGHT' : ''}</div>
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