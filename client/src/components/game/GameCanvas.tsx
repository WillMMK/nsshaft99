import React, { useRef, useEffect, useCallback } from 'react';
import HealthBar from './HealthBar';
import MobileControls from './MobileControls';
import useGameLoop from '@/hooks/useGameLoop';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { useGameState } from '@/contexts/GameStateContext';
import PlayerList from '@/components/multiplayer/PlayerList';
import AttackNotification, { LastAttackSentNotification } from '@/components/multiplayer/AttackNotification';

interface GameCanvasProps {
  onJoinMultiplayer: () => void;
  onGameOver: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ onJoinMultiplayer }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const movingLeft = useRef(false);
  const movingRight = useRef(false);
  
  const { gameState, setGameState } = useGameState();
  const { health, score, isRunning, isPaused, activeEffects, attackNotification } = gameState;
  
  const { isMultiplayer, playerId, players, updateScore, reportDeath } = useMultiplayer();

  // Use useCallback to prevent infinite loops
  const setHealth = useCallback((newHealth: number) => {
    setGameState(prev => ({
      ...prev,
      health: newHealth
    }));
  }, [setGameState]);

  const setScore = useCallback((newScore: number) => {
    setGameState(prev => ({
      ...prev,
      score: newScore
    }));
    
    // Update score in multiplayer if active
    if (isMultiplayer) {
      updateScore(newScore);
    }
  }, [setGameState, isMultiplayer, updateScore]);

  const handleGameOver = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isRunning: false
    }));
  }, [setGameState]);

  const { updateMovement } = useGameLoop({
    canvasRef,
    health,
    setHealth,
    score,
    setScore,
    gameActive: isRunning && !isPaused,
    onGameOver: () => {
      if (isMultiplayer) {
        // In multiplayer, report death to the server
        console.log('Player died in multiplayer, reporting to server');
        reportDeath();
        // Call the parent component's onGameOver to update UI state
        handleGameOver();
      } else {
        // In single player, we handle it locally
        setGameState(prev => ({
          ...prev,
          isRunning: false
        }));
      }
    },
    isMultiplayer,
    playerId,
    players,
    updateScore,
    reportDeath,
    onUpdateGameState: (state) => {
      setGameState(prev => ({
        ...prev,
        activeEffects: {
          ...prev.activeEffects,
          ...state.activeEffects
        }
      }));
    }
  });

  // Handle direct attack events that need to be passed to the game engine
  useEffect(() => {
    // This function will be used to create an event bus for attack handling
    const attackHandler = (event: CustomEvent) => {
      console.log("Attack event received:", event.detail);
      
      // Update the game state to reflect the attack
      setGameState(prev => ({
        ...prev,
        activeEffects: {
          ...prev.activeEffects,
          [event.detail.type]: true
        }
      }));
      
      // Set timeout to clear the effect
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          activeEffects: {
            ...prev.activeEffects,
            [event.detail.type]: false
          }
        }));
      }, event.detail.duration || 5000);
    };
    
    // Add event listener for the attack event
    document.addEventListener('apply-attack', attackHandler as EventListener);
    
    return () => {
      // Clean up event listener
      document.removeEventListener('apply-attack', attackHandler as EventListener);
    };
  }, [setGameState]);
  
  // Sync the game state active effects with the game engine
  useEffect(() => {
    // Access the game engine directly from the hook
    const syncGameEffects = () => {
      // Expose the game engine from the hook's context
      const gameEngine = (window as any).__gameEngine;
      
      if (gameEngine) {
        // Call the new sync method
        gameEngine.syncGameState(gameState);
      }
    };
    
    // Try to sync effects
    syncGameEffects();
    
    return () => {
      // Any cleanup needed
    };
  }, [gameState.activeEffects]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isRunning) return;
      
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        movingLeft.current = true;
        movingRight.current = false;
        updateMovement(true, false);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        movingRight.current = true;
        movingLeft.current = false;
        updateMovement(false, true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isRunning) return;
      
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        movingLeft.current = false;
        updateMovement(false, movingRight.current);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        movingRight.current = false;
        updateMovement(movingLeft.current, false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isRunning, updateMovement]);

  const handleTouchStart = (direction: 'left' | 'right') => {
    if (!isRunning) return;
    
    if (direction === 'left') {
      movingLeft.current = true;
      movingRight.current = false;
      updateMovement(true, false);
    } else {
      movingRight.current = true;
      movingLeft.current = false;
      updateMovement(false, true);
    }
  };

  const handleTouchEnd = () => {
    if (!isRunning) return;
    
    movingLeft.current = false;
    movingRight.current = false;
    updateMovement(false, false);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={273}
        height={492}
        className="absolute top-0 left-0 w-full h-full"
      />
      
      {/* Game UI Panel - No background, with text shadow for readability */}
      <div className="absolute top-[120px] left-0 w-full px-3">
        {/* Main Game Stats Panel */}
        <div className="flex items-center justify-between drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
          {/* HP Bar Section */}
          <div className="flex-1 scale-90 origin-left">
            <HealthBar health={health} />
          </div>
          
          {/* Score Section - Enhanced contrast */}
          <div className="ml-2 flex flex-col items-end">
            <div className="text-game-yellow font-pixel text-[10px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">SCORE</div>
            <div id="score-value" className="text-white font-mono text-base font-bold leading-none mt-0.5 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
              {score}
            </div>
          </div>
        </div>
      </div>
      
      {/* Attack notifications - Keep original position */}
      {isMultiplayer && isRunning && !isPaused && !gameState.isGameOver && (
        <div className="absolute top-[180px] right-3">
          <AttackNotification />
          <LastAttackSentNotification />
        </div>
      )}
      
      {/* Multiplayer Player List - Right side panel with scroll, adjusted position */}
      {isMultiplayer && (
        <div className="fixed right-0 top-[140px] h-[calc(100%-180px)] flex items-start">
          <div className="bg-game-dark bg-opacity-90 max-h-full w-[180px] rounded-l-lg overflow-hidden flex flex-col shadow-xl">
            {/* Header */}
            <div className="bg-game-blue p-2 text-center">
              <h3 className="text-white font-pixel text-sm">PLAYERS</h3>
              <div className="text-game-yellow text-xs mt-1">
                {Object.keys(players).length} Online
              </div>
            </div>
            
            {/* Scrollable player list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              <PlayerList />
            </div>
          </div>
        </div>
      )}
      
      {/* Multiplayer Join Button */}
      {!isMultiplayer && !isRunning && (
        <button 
          onClick={onJoinMultiplayer}
          className="absolute bottom-24 right-4 bg-game-blue hover:bg-game-blue-dark text-white px-4 py-2 rounded-lg text-sm font-pixel transition-colors"
        >
          Multiplayer
        </button>
      )}
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.4);
        }
      `}</style>
      
      <MobileControls onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} />
    </div>
  );
};

export default GameCanvas;