import { useRef, useEffect, useCallback, useState } from 'react';
import { GameEngine } from '@/lib/game/engine';
import { Player, AttackType, NetworkPlayer } from '@/types';
import { GameState } from '@/contexts/GameStateContext';

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
  players?: Record<string, NetworkPlayer>;
  updateScore?: (score: number) => void;
  reportDeath?: () => void;
  onUpdateGameState?: (state: Partial<GameState>) => void;
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
  reportDeath = () => {},
  onUpdateGameState
}: UseGameLoopProps) {
  const gameEngineRef = useRef<GameEngine | null>(null);
  const animationFrameIdRef = useRef<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  // Track processed attacks to avoid applying them multiple times
  const processedAttackIds = useRef<Set<string>>(new Set());

  const gameLoop = useCallback(() => {
    const engine = gameEngineRef.current;
    if (engine && gameActive) {
      try {
        // Update the game engine
        engine.update();
        
        // If in multiplayer mode, sync the score with the server
        if (isMultiplayer && engine.score !== score) {
          updateScore(engine.score);
        }
      } catch (err) {
        console.error("Error in game update:", err);
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
        }
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
    
    // Cancel animation frame first
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = 0;
    }
    
    // Remove global reference
    if ((window as any).__gameEngine === gameEngineRef.current) {
      (window as any).__gameEngine = null;
    }
    
    // Clean up the game engine
    if (gameEngineRef.current) {
      // Make sure all effects are removed when cleaning up
      if (gameEngineRef.current.isControlsReversed) {
        gameEngineRef.current.isControlsReversed = false;
        
        // Reset canvas rotation if it was applied
        if (gameEngineRef.current.canvas) {
          gameEngineRef.current.canvas.style.transform = 'rotate(0deg)';
        }
      }
      
      gameEngineRef.current.destroy();
      gameEngineRef.current = null;
    }
    
    // Clear references and state
    processedAttackIds.current.clear();
    setIsInitialized(false);
  }, []);

  // Initialize game engine and start game loop
  useEffect(() => {
    // Only initialize if not already initialized and game is active
    if (!isInitialized && gameActive && canvasRef.current) {
      try {
        console.log("Initializing game engine");
        
        // Initialize game engine
        gameEngineRef.current = new GameEngine(
          canvasRef.current,
          setHealth,
          setScore,
          onGameOver,
          isMultiplayer,
          onUpdateGameState
        );
        
        // Expose the game engine globally for debugging and access from other components
        (window as any).__gameEngine = gameEngineRef.current;
        
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
  }, [canvasRef, gameActive, isInitialized, isMultiplayer, onGameOver, setHealth, setScore, onUpdateGameState]);

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