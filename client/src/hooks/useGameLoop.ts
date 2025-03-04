import { useRef, useEffect, useCallback, useState } from 'react';
import { GameEngine } from '@/lib/game/engine';
import { Player, AttackType } from '@/types';

interface UseGameLoopProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  health: number;
  setHealth: (health: number) => void;
  score: number;
  setScore: (score: number) => void;
  gameActive: boolean;
  onGameOver: () => void;
  isMultiplayer?: boolean;
  playerId?: string | null;
  players?: Record<string, Player>;
  updateScore?: (score: number) => void;
  reportDeath?: () => void;
}

export default function useGameLoop({
  canvasRef,
  health,
  setHealth,
  score,
  setScore,
  gameActive,
  onGameOver,
  isMultiplayer = false,
  playerId = null,
  players = {},
  updateScore = () => {},
  reportDeath = () => {}
}: UseGameLoopProps) {
  const gameEngineRef = useRef<GameEngine | null>(null);
  const animationFrameIdRef = useRef<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
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

  // Initialize game engine and start game loop
  useEffect(() => {
    // Only initialize if the game is active and not already initialized
    if (gameActive && !isInitialized && canvasRef.current) {
      try {
        console.log("Initializing game engine");
        
        // Create game engine
        gameEngineRef.current = new GameEngine(
          canvasRef.current as HTMLCanvasElement,
          (newHealth: number) => {
            setHealth(newHealth);
            
            // Check if player died
            if (newHealth <= 0) {
              console.log("Player died");
              
              if (isMultiplayer) {
                // Report death to server in multiplayer mode
                reportDeath();
              }
              
              // Call onGameOver callback
              onGameOver();
            }
          },
          (newScore: number) => {
            setScore(newScore);
            
            // Update score on server in multiplayer mode
            if (isMultiplayer) {
              updateScore(newScore);
            }
          },
          onGameOver,
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
  }, [canvasRef, gameActive, setHealth, setScore, onGameOver, gameLoop, isMultiplayer, reportDeath, cleanupGameLoop, isInitialized, updateScore]);

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