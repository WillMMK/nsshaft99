import { useEffect, useRef } from 'react';
import GameEngine from '../lib/game/engine';

export default function useGameLoop(canvasRef, gameActive, setHealth, setScore, onGameOver) {
  const animationFrameIdRef = useRef(null);
  const gameEngineRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !gameActive) return;

    console.log("Game loop initializing");
    const canvas = canvasRef.current;

    // Initialize game engine once
    gameEngineRef.current = new GameEngine(
      canvas,
      (newHealth) => setHealth(newHealth),
      (newScore) => setScore(newScore),
      onGameOver
    );
    console.log("Game engine initialized");

    // Game loop function
    const gameLoop = () => {
      if (!gameEngineRef.current || !gameActive) return;
      gameEngineRef.current.update();
      animationFrameIdRef.current = requestAnimationFrame(gameLoop);
    };

    // Start the game loop
    animationFrameIdRef.current = requestAnimationFrame(gameLoop);
    console.log("Game loop started");

    // Cleanup on unmount or game stop
    return () => {
      console.log("Cleaning up game loop");
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      gameEngineRef.current = null;
    };
  }, [gameActive, canvasRef]); // Only re-run if gameActive changes

  return gameEngineRef;
}