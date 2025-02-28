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
  const lastFrameTimeRef = useRef<number>(0);
  const animationFrameIdRef = useRef<number>(0);
  
  const updateMovement = useCallback((isMovingLeft: boolean, isMovingRight: boolean) => {
    if (gameEngineRef.current) {
      gameEngineRef.current.updateMovement(isMovingLeft, isMovingRight);
    }
  }, []);
  
  // Game loop
  const gameLoop = useCallback((timestamp: number) => {
    if (!canvasRef.current) return;
    
    // Calculate delta time (capped to prevent large jumps if tab was inactive)
    const deltaTime = Math.min(33, timestamp - lastFrameTimeRef.current);
    lastFrameTimeRef.current = timestamp;
    
    // Update game state
    if (gameEngineRef.current) {
      gameEngineRef.current.update(deltaTime);
    }
    
    // Continue the loop
    animationFrameIdRef.current = requestAnimationFrame(gameLoop);
  }, [canvasRef]);
  
  // Initialize game engine and start game loop
  useEffect(() => {
    if (!canvasRef.current || !gameActive) return;
    
    // Initialize game engine
    gameEngineRef.current = new GameEngine(
      canvasRef.current,
      (newHealth: number) => setHealth(newHealth),
      (newScore: number) => setScore(newScore),
      onGameOver
    );
    
    // Start game loop
    lastFrameTimeRef.current = performance.now();
    animationFrameIdRef.current = requestAnimationFrame(gameLoop);
    
    // Cleanup function
    return () => {
      cancelAnimationFrame(animationFrameIdRef.current);
      gameEngineRef.current = null;
    };
  }, [canvasRef, gameActive, setHealth, setScore, onGameOver, gameLoop]);
  
  return { updateMovement };
}
