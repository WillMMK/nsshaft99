import { useRef, useEffect, useCallback, useState } from 'react';
import { GameEngine } from '@/lib/game/engine';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { AttackType } from '@/types';

interface UseGameLoopProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  health: number;
  setHealth: (health: number) => void;
  score: number;
  setScore: (score: number) => void;
  gameActive: boolean;
  onGameOver: () => void;
  isMultiplayer?: boolean;
}

export default function useGameLoop({
  canvasRef,
  health,
  setHealth,
  score,
  setScore,
  gameActive,
  onGameOver,
  isMultiplayer = false
}: UseGameLoopProps) {
  const gameEngineRef = useRef<GameEngine | null>(null);
  const animationFrameIdRef = useRef<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const { 
    playerId, 
    players, 
    updateScore,
    reportDeath
  } = useMultiplayer();
  
  // Track processed attacks to avoid applying them multiple times
  const processedAttackIds = useRef<Set<string>>(new Set());

  const gameLoop = useCallback(() => {
    if (gameEngineRef.current && gameActive) {
      try {
        // Update the game engine
        gameEngineRef.current.update();
        
        // If in multiplayer mode, sync the score with the server
        if (isMultiplayer && gameEngineRef.current.score !== score) {
          updateScore(gameEngineRef.current.score);
        }
      } catch (err) {
        console.error("Error in game update:", err);
        cancelAnimationFrame(animationFrameIdRef.current);
        return; // Don't request another frame if there's an error
      }
      
      // Only request next frame if still active
      if (gameActive) {
        animationFrameIdRef.current = requestAnimationFrame(gameLoop);
      }
    }
  }, [gameActive, isMultiplayer, score, updateScore]);

  // Clean up function to properly cancel animation frame and reset game engine
  const cleanupGameLoop = useCallback(() => {
    console.log("Cleaning up game loop");
    
    // Clean up the game engine first
    if (gameEngineRef.current) {
      gameEngineRef.current.destroy();
    }
    
    // Cancel animation frame
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = 0;
    }
    
    // Clear references
    gameEngineRef.current = null;
    processedAttackIds.current.clear();
    setIsInitialized(false);
  }, []);

  // Initialize game engine only once when gameActive becomes true
  useEffect(() => {
    // Only initialize if gameActive is true, canvas exists, and we haven't initialized yet
    if (gameActive && canvasRef.current && !isInitialized) {
      console.log("Game active changed:", gameActive);
      console.log("Initializing new game engine");
      
      try {
        // Create a new game engine
        gameEngineRef.current = new GameEngine(
          canvasRef.current,
          setHealth,
          setScore,
          () => {
            // Report death to server if in multiplayer mode
            if (isMultiplayer) {
              reportDeath();
            }
            onGameOver();
          },
          isMultiplayer
        );
        
        // Start the game loop
        console.log("Starting game loop");
        animationFrameIdRef.current = requestAnimationFrame(gameLoop);
        setIsInitialized(true);
      } catch (err) {
        console.error("Error initializing game:", err);
      }
    } 
    // Clean up when game becomes inactive
    else if (!gameActive && isInitialized) {
      cleanupGameLoop();
    }
  }, [canvasRef, gameActive, setHealth, setScore, onGameOver, gameLoop, isMultiplayer, reportDeath, cleanupGameLoop, isInitialized]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupGameLoop();
    };
  }, [cleanupGameLoop]);

  // Update multiplayer data when players change
  useEffect(() => {
    if (isMultiplayer && gameEngineRef.current && playerId) {
      gameEngineRef.current.setMultiplayerData(players, playerId);
    }
  }, [isMultiplayer, players, playerId]);

  const updateMovement = useCallback((isMovingLeft: boolean, isMovingRight: boolean) => {
    if (gameEngineRef.current) {
      gameEngineRef.current.updateMovement(isMovingLeft, isMovingRight);
    }
  }, []);

  return { updateMovement };
}