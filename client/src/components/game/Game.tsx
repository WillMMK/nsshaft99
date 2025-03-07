import React, { useState, useEffect, useRef } from 'react';
import { useGameState } from '@/contexts/GameStateContext';
import GameCanvas from './GameCanvas';
import StartScreen from './StartScreen';
import MultiplayerLobby from '../multiplayer/MultiplayerLobby';
import GameOverScreen from './GameOverScreen';
import { AttackType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { MultiplayerProvider, useMultiplayer } from '@/contexts/MultiplayerContext';

// Create a wrapper component that uses the useMultiplayer hook
const GameWithMultiplayer: React.FC = () => {
  const { isMultiplayer, setIsMultiplayer, onReceiveAttack, onGameStarted, onGameOver, leaveGame, reportDeath } = useMultiplayer();
  const { gameState, setGameState, resetGame } = useGameState();
  const { currentUser, userProfile, refreshUserProfile } = useAuth();
  const [showLobby, setShowLobby] = useState<boolean>(false);
  const [showGameOver, setShowGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<{ id: string; name: string } | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [isDead, setIsDead] = useState<boolean>(false);
  const gameRef = useRef<HTMLDivElement>(null);

  // Track player movement for defense system
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setGameState(prev => ({
          ...prev,
          isMovingLeft: true
        }));
      } else if (e.key === 'ArrowRight') {
        setGameState(prev => ({
          ...prev,
          isMovingRight: true
        }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setGameState(prev => ({
          ...prev,
          isMovingLeft: false
        }));
      } else if (e.key === 'ArrowRight') {
        setGameState(prev => ({
          ...prev,
          isMovingRight: false
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setGameState]);

  // Handle multiplayer attacks
  useEffect(() => {
    if (!isMultiplayer) return;

    const handleAttack = (data: { attackerId: string; attackerName: string; attackType: AttackType }) => {
      console.log('Received attack:', data);
      
      // Update game state with attack notification
      setGameState(prev => ({
        ...prev,
        attackNotification: {
          attackType: data.attackType,
          attackerName: data.attackerName,
          timestamp: Date.now()
        },
        activeEffects: {
          ...prev.activeEffects,
          spikePlatforms: data.attackType === AttackType.SPIKE_PLATFORM ? true : prev.activeEffects.spikePlatforms,
          speedUp: data.attackType === AttackType.SPEED_UP ? true : prev.activeEffects.speedUp,
          narrowPlatforms: data.attackType === AttackType.NARROW_PLATFORM ? true : prev.activeEffects.narrowPlatforms,
          reverseControls: data.attackType === AttackType.REVERSE_CONTROLS ? true : prev.activeEffects.reverseControls,
          trueReverse: data.attackType === AttackType.TRUE_REVERSE ? true : prev.activeEffects.trueReverse
        }
      }));
      
      // Clear attack notification after 5 seconds if not defended
      setTimeout(() => {
        setGameState(prev => {
          // Only clear if this is still the same attack notification
          if (prev.attackNotification?.timestamp === data.timestamp) {
            return {
              ...prev,
              attackNotification: null
            };
          }
          return prev;
        });
      }, 5000);
    };
    
    // Register the attack handler
    const unsubscribe = onReceiveAttack(handleAttack);
    
    return () => {
      unsubscribe();
    };
  }, [isMultiplayer, onReceiveAttack, setGameState]);
  
  // Handle game started event
  useEffect(() => {
    if (!isMultiplayer) return;
    
    const handleGameStarted = () => {
      console.log('Game started event received');
      setShowLobby(false);
      
      // Reset all active effects
      setGameState(prev => ({
        ...prev,
        activeEffects: {
          spikePlatforms: false,
          speedUp: false,
          narrowPlatforms: false,
          reverseControls: false,
          trueReverse: false
        },
        attackNotification: null,
        score: 0,
        health: 100,
        isRunning: true,
        isPaused: false
      }));
    };
    
    // Register the game started handler
    const unsubscribe = onGameStarted(handleGameStarted);
    
    return () => {
      unsubscribe();
    };
  }, [isMultiplayer, onGameStarted, setGameState]);
  
  // Handle game over event
  useEffect(() => {
    if (!isMultiplayer) return;
    
    const handleGameOver = (data: { winnerId: string; winnerName: string }) => {
      console.log('Game over event received:', data);
      
      setWinner({
        id: data.winnerId,
        name: data.winnerName
      });
      
      setGameState(prev => ({
        ...prev,
        isRunning: false
      }));
      
      setShowGameOver(true);
      setIsDead(false); // Reset death state
    };
    
    // Register the game over handler
    const unsubscribe = onGameOver(handleGameOver);
    
    return () => {
      unsubscribe();
    };
  }, [isMultiplayer, onGameOver, setGameState]);
  
  // Update user stats when game ends
  const updateUserStats = async () => {
    if (!currentUser || !gameState.score) return;
    
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      
      // Get current stats
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.data();
      
      // Update stats
      await updateDoc(userDocRef, {
        totalGames: increment(1),
        totalScore: increment(gameState.score),
        highScore: userData && userData.highScore > gameState.score 
          ? userData.highScore 
          : gameState.score
      });
      
      // Refresh user profile to show updated stats
      refreshUserProfile();
      
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  };
  
  // Handle game over
  useEffect(() => {
    if (!gameState.isRunning && gameState.score > 0 && !showGameOver) {
      updateUserStats();
      setShowGameOver(true);
    }
  }, [gameState.isRunning, gameState.score]);
  
  // Handle start game
  const handleStartGame = () => {
    setIsTransitioning(true);
    resetGame();
    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        isRunning: true,
        isPaused: false
      }));
      setIsTransitioning(false);
    }, 300);
  };
  
  // Handle start multiplayer
  const handleStartMultiplayer = () => {
    console.log('Starting multiplayer mode');
    setIsTransitioning(true);
    // Delay slightly to avoid flashing
    setTimeout(() => {
      setIsMultiplayer(true);
      setShowLobby(true);
      setIsTransitioning(false);
    }, 300);
  };
  
  // Handle join multiplayer from game over
  const handleJoinMultiplayer = () => {
    console.log('Joining multiplayer from game over');
    setIsTransitioning(true);
    // First reset the game state
    resetGame();
    
    // Then switch to multiplayer after a short delay
    setTimeout(() => {
      setIsMultiplayer(true);
      setShowLobby(true);
      setIsTransitioning(false);
    }, 300);
  };
  
  // Handle join game
  const handleJoinGame = () => {
    console.log('Joining multiplayer game');
    setIsTransitioning(true);
    setTimeout(() => {
      setShowLobby(false);
      setIsTransitioning(false);
    }, 300);
  };
  
  // Handle cancel join
  const handleCancelJoin = () => {
    console.log('Cancelling multiplayer join');
    setIsTransitioning(true);
    setIsMultiplayer(false);
    leaveGame();
    setTimeout(() => {
      setShowLobby(false);
      setIsTransitioning(false);
    }, 300);
  };
  
  // Handle play again
  const handlePlayAgain = () => {
    setShowGameOver(false);
    // Set transitioning state immediately to prevent showing the start screen
    setIsTransitioning(true);
    
    if (isMultiplayer) {
      // In multiplayer mode, navigate back to the multiplayer lobby with 60s countdown
      resetGame();
      
      // Full reset of game state to ensure a clean state
      setGameState(prev => ({
        ...prev,
        isRunning: false,
        isPaused: false,
        activeEffects: {
          spikePlatforms: false,
          speedUp: false,
          narrowPlatforms: false,
          reverseControls: false,
          trueReverse: false
        },
        attackNotification: null,
        score: 0,
        health: 100
      }));
      
      // First leave the current game to clean up server-side state
      leaveGame();
      
      // Add a small delay before showing the lobby to ensure socket connection is re-established
      setTimeout(() => {
        setIsMultiplayer(true);
        setShowLobby(true);
        setIsTransitioning(false); // Reset transition state once lobby is shown
      }, 300);
      
      return;
    }
    
    // Single player mode flow continues as before
    
    // Use setTimeout to ensure state updates have been processed
    setTimeout(() => {
      // Reset all active effects
      setGameState(prev => {
        console.log('Resetting initial game state');
        return {
          ...prev,
          activeEffects: {
            spikePlatforms: false,
            speedUp: false,
            narrowPlatforms: false,
            reverseControls: false,
            trueReverse: false
          },
          attackNotification: null,
          score: 0,
          health: 100
        };
      });
      
      // Use another setTimeout to ensure state updates have been processed
      setTimeout(() => {
        console.log('Starting new game');
        // Start the game
        setGameState(prev => ({
          ...prev,
          isRunning: true,
          isPaused: false
        }));
        
        // Reset transitioning state
        setIsTransitioning(false);
        
        console.log('Finished handlePlayAgain');
      }, 100);
    }, 100);
  };
  
  // Handle back to main menu
  const handleBackToMainMenu = () => {
    console.log('Navigating back to main menu');
    setShowGameOver(false);
    setIsTransitioning(true);
    
    // Reset game state
    resetGame();
    
    // Leave multiplayer mode if active
    if (isMultiplayer) {
      setIsMultiplayer(false);
      leaveGame();
    }
    
    // Show start screen after a short delay to avoid flashing
    setTimeout(() => {
      setIsDead(false);
      setShowLobby(false);
      setGameState(prev => ({
        ...prev,
        isRunning: false,
        isPaused: false,
        activeEffects: {
          spikePlatforms: false,
          speedUp: false,
          narrowPlatforms: false,
          reverseControls: false,
          trueReverse: false
        },
        attackNotification: null,
        score: 0,
        health: 100
      }));
      setIsTransitioning(false);
    }, 300);
  };
  
  const handleGameOver = () => {
    if (isMultiplayer) {
      setIsDead(true); // Mark player as dead but keep game running for updates
      // Report death to server so it can determine if game is over
      console.log('Reporting player death to server');
      reportDeath();
    } else {
      setGameState(prev => ({
        ...prev,
        isRunning: false
      }));
      setShowGameOver(true);
    }
  };
  
  return (
    <div ref={gameRef} className="relative w-full h-full">
      {/* Only show the start screen if we're not transitioning and not in any other mode */}
      {!gameState.isRunning && !showGameOver && !showLobby && !isDead && !isTransitioning && (
        <StartScreen 
          onStartGame={handleStartGame} 
          onStartMultiplayer={handleStartMultiplayer} 
        />
      )}
      
      {/* Show a loading screen during transitions */}
      {isTransitioning && !showLobby && !gameState.isRunning && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-game-dark bg-opacity-90 z-30">
          <div className="animate-spin w-10 h-10 border-4 border-game-blue border-t-transparent rounded-full mb-4"></div>
          <p className="text-game-light font-pixel">Loading...</p>
        </div>
      )}
      
      {/* Show the multiplayer lobby when needed, but not during transitions */}
      {showLobby && !isTransitioning && (
        <MultiplayerLobby 
          onJoin={handleJoinGame} 
          onCancel={handleCancelJoin} 
        />
      )}
      
      <GameCanvas 
        onJoinMultiplayer={handleJoinMultiplayer}
        onGameOver={handleGameOver}
      />
      
      {isDead && !showGameOver && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50">
          <p className="text-white text-2xl">You died. Waiting for the game to end...</p>
        </div>
      )}
      
      {showGameOver && (
        <GameOverScreen 
          winner={winner}
          onPlayAgain={handlePlayAgain} 
          onBackToMainMenu={handleBackToMainMenu}
        />
      )}
    </div>
  );
};

// Main Game component that doesn't use the useMultiplayer hook directly
const Game: React.FC = () => {
  return (
    <MultiplayerProvider>
      <GameWithMultiplayer />
    </MultiplayerProvider>
  );
};

export default Game; 