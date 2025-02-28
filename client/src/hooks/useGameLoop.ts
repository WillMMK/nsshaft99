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

  const gameLoop = useCallback(() => {
    if (gameEngineRef.current && gameActive) {
      try {
        gameEngineRef.current.update();
      } catch (err) {
        console.error("Error in game update:", err);
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    }
    animationFrameIdRef.current = requestAnimationFrame(gameLoop);
  }, [gameActive]);

  useEffect(() => {
    if (!canvasRef.current || !gameActive) return;

    // Only initialize if not already initialized
    if (!gameEngineRef.current) {
      console.log("Game loop initializing");
      try {
        gameEngineRef.current = new GameEngine(
          canvasRef.current,
          setHealth,
          setScore,
          onGameOver
        );
        console.log("Game engine initialized");
        animationFrameIdRef.current = requestAnimationFrame(gameLoop);
        console.log("Game loop started");
      } catch (err) {
        console.error("Error initializing game:", err);
      }
    }

    // Cleanup only when gameActive becomes false
    return () => {
      if (!gameActive) {
        console.log("Cleaning up game loop");
        cancelAnimationFrame(animationFrameIdRef.current);
        gameEngineRef.current = null;
      }
    };
  }, [canvasRef, gameActive, setHealth, setScore, onGameOver, gameLoop]);

  const updateMovement = useCallback((isMovingLeft: boolean, isMovingRight: boolean) => {
    if (gameEngineRef.current) {
      gameEngineRef.current.updateMovement(isMovingLeft, isMovingRight);
    }
  }, []);

  return { updateMovement };
}