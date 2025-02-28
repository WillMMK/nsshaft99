import { useRef, useEffect, useCallback } from 'react';
import { GameEngine } from '@/lib/game/engine';

interface UseGameLoopProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  health: number;
  setHealth: (health: number) => void;
  score: number;
  setScore: (score: number) => void;
  gameActive: boolean;
  onGameOver: () => void;
}

export default function useGameLoop({
  canvasRef,
  health,
  setHealth,
  score,
  setScore,
  gameActive,
  onGameOver
}: UseGameLoopProps) {
  const gameEngineRef = useRef<GameEngine | null>(null);
  const animationFrameIdRef = useRef<number>(0);
  
  // This function will be called from the key handlers
  const updateMovement = useCallback((isMovingLeft: boolean, isMovingRight: boolean) => {
    if (gameEngineRef.current) {
      gameEngineRef.current.updateMovement(isMovingLeft, isMovingRight);
    }
  }, []);
  
  // Game loop with fixed time step for consistent physics
  const gameLoop = useCallback(() => {
    if (!canvasRef.current || !gameEngineRef.current) return;
    
    // Use a fixed time step for more stable physics
    const FIXED_DELTA = 16.67; // ~60fps
    
    // Update game state with fixed timestep
    gameEngineRef.current.update(FIXED_DELTA);
    
    // Continue the loop
    animationFrameIdRef.current = requestAnimationFrame(gameLoop);
  }, [canvasRef]);
  
  // Initialize game engine and start game loop
  useEffect(() => {
    if (!canvasRef.current || !gameActive) return;
    
    console.log("Initializing game engine");
    
    // Initialize game engine
    gameEngineRef.current = new GameEngine(
      canvasRef.current,
      (newHealth: number) => setHealth(newHealth),
      (newScore: number) => setScore(newScore),
      onGameOver
    );
    
    // Immediately start game loop
    animationFrameIdRef.current = requestAnimationFrame(gameLoop);
    
    // Log initial state for debugging
    console.log("Game initialized", {
      canvasWidth: canvasRef.current.width,
      canvasHeight: canvasRef.current.height,
      gameEngine: gameEngineRef.current
    });
    
    // Cleanup function
    return () => {
      console.log("Cleaning up game engine");
      cancelAnimationFrame(animationFrameIdRef.current);
      gameEngineRef.current = null;
    };
  }, [canvasRef, gameActive, setHealth, setScore, onGameOver, gameLoop]);
  
  return { updateMovement };
}
