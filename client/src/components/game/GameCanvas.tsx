import React, { useRef, useEffect, useCallback } from 'react';
import HealthBar from './HealthBar';
import MobileControls from './MobileControls';
import useGameLoop from '@/hooks/useGameLoop';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { useGameState } from '@/contexts/GameStateContext';
import PlayerList from '@/components/multiplayer/PlayerList';
import AttackNotification from '@/components/multiplayer/AttackNotification';
import AttackButton from '@/components/multiplayer/AttackButton';

interface GameCanvasProps {
  onJoinMultiplayer: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ onJoinMultiplayer }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const movingLeft = useRef(false);
  const movingRight = useRef(false);
  
  const { gameState, setGameState } = useGameState();
  const { health, score, isRunning } = gameState;
  
  const { isMultiplayer, playerId, players, updateScore } = useMultiplayer();

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
    gameActive: isRunning,
    onGameOver: handleGameOver,
    isMultiplayer
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isRunning) return;
      
      // Check if controls are reversed due to an attack
      const isReversed = gameState.activeEffects.reverseControls;
      
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        movingLeft.current = true;
        movingRight.current = false;
        updateMovement(isReversed ? false : true, isReversed ? true : false);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        movingRight.current = true;
        movingLeft.current = false;
        updateMovement(isReversed ? true : false, isReversed ? false : true);
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
  }, [isRunning, updateMovement, gameState.activeEffects.reverseControls]);

  const handleTouchStart = (direction: 'left' | 'right') => {
    if (!isRunning) return;
    
    // Check if controls are reversed due to an attack
    const isReversed = gameState.activeEffects.reverseControls;
    
    if (direction === 'left') {
      movingLeft.current = true;
      movingRight.current = false;
      updateMovement(isReversed ? false : true, isReversed ? true : false);
    } else {
      movingRight.current = true;
      movingLeft.current = false;
      updateMovement(isReversed ? true : false, isReversed ? false : true);
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
      
      <div className="absolute top-0 left-0 w-full p-2">
        <HealthBar health={health} />
        <div id="score-value" className="text-white font-mono text-sm mt-1">
          {score}
        </div>
      </div>
      
      {isMultiplayer && (
        <div className="absolute top-12 right-2 flex flex-col items-end">
          <PlayerList />
          <AttackNotification />
          <AttackButton score={score} />
        </div>
      )}
      
      {!isMultiplayer && !isRunning && (
        <button 
          onClick={onJoinMultiplayer}
          className="absolute bottom-20 right-2 bg-game-blue text-white px-2 py-1 rounded text-xs"
        >
          Multiplayer
        </button>
      )}
      
      <MobileControls onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} />
    </div>
  );
};

export default GameCanvas;