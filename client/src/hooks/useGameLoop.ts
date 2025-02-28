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
  
  // This function will be called by the key handlers
  const updateMovement = useCallback((isMovingLeft: boolean, isMovingRight: boolean) => {
    if (gameEngineRef.current) {
      console.log("Movement update called:", isMovingLeft, isMovingRight);
      gameEngineRef.current.updateMovement(isMovingLeft, isMovingRight);
    }
  }, []);
  
  // Simple animation loop with fixed timestep
  const gameLoop = useCallback(() => {
    if (gameEngineRef.current) {
      // Update the game state (no delta time needed as we use fixed values now)
      gameEngineRef.current.update();
    }
    
    // Continue the loop
    animationFrameIdRef.current = requestAnimationFrame(gameLoop);
  }, []);
  
  // Initialize game engine and start game loop
  useEffect(() => {
    if (!canvasRef.current || !gameActive) return;
    
    console.log("Game loop initializing");
    console.log("Canvas reference:", canvasRef.current);
    
    try {
      // Initialize game engine with the canvas
      gameEngineRef.current = new GameEngine(
        canvasRef.current,
        (newHealth: number) => setHealth(newHealth),
        (newScore: number) => setScore(newScore),
        onGameOver
      );
      
      console.log("Game engine initialized");
      
      // Start the game loop
      animationFrameIdRef.current = requestAnimationFrame(gameLoop);
      console.log("Game loop started");
    } catch (err) {
      console.error("Error initializing game:", err);
    }
    
    // Cleanup function
    return () => {
      console.log("Cleaning up game loop");
      cancelAnimationFrame(animationFrameIdRef.current);
      gameEngineRef.current = null;
    };
  }, [canvasRef, gameActive, setHealth, setScore, onGameOver, gameLoop]);
  
  return { updateMovement };
}