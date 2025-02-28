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
    // Only initialize if canvas is available and game is active
    if (!canvasRef.current || !gameActive) return;
    
    // Only initialize if we don't already have a game engine instance
    if (gameEngineRef.current) {
      console.log("Game engine already exists, not reinitializing");
      return;
    }
    
    console.log("Game loop initializing");
    console.log("Canvas reference:", canvasRef.current);
    
    try {
      // Ensure canvas is fully initialized
      if (!canvasRef.current.width || !canvasRef.current.height) {
        canvasRef.current.width = 273;
        canvasRef.current.height = 492;
        console.log("Set canvas dimensions explicitly:", canvasRef.current.width, canvasRef.current.height);
      }
      
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
    
    // Cleanup function - only runs when component unmounts or gameActive becomes false
    return () => {
      console.log("Cleaning up game loop");
      cancelAnimationFrame(animationFrameIdRef.current);
      gameEngineRef.current = null;
    };
  }, [canvasRef, gameActive, setHealth, setScore, onGameOver, gameLoop]);
  
  // Add another effect to handle game restarting
  useEffect(() => {
    // If game becomes inactive, we'll clean up for a potential restart
    if (!gameActive && gameEngineRef.current) {
      console.log("Game became inactive, cleaning up for potential restart");
      cancelAnimationFrame(animationFrameIdRef.current);
      gameEngineRef.current = null;
    }
  }, [gameActive]);
  
  return { updateMovement };
}