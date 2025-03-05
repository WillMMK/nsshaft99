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

  // Handle multiplayer attacks
  useEffect(() => {
    if (!isMultiplayer) return;

    const handleAttack = (data: { attackerId: string; attackerName: string; attackType: AttackType }) => {
      console.log('Received attack:', data);
      
      // Apply the attack effect based on the type
      setGameState(prev => ({
        ...prev,
        attackNotification: {
          attackerId: data.attackerId,
          attackerName: data.attackerName,
          attackType: data.attackType,
          timestamp: Date.now()
        },
        activeEffects: {
          ...prev.activeEffects,
          [data.attackType]: true
        }
      }));
      
      // Set a timeout to clear the effect
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          activeEffects: {
            ...prev.activeEffects,
            [data.attackType]: false
          }
        }));
      }, 5000); // Effects last for 5 seconds
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
          reverseControls: false
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
    resetGame();
    setGameState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false
    }));
  };
  
  // Handle start multiplayer
  const handleStartMultiplayer = () => {
    console.log('Starting multiplayer mode');
    setIsMultiplayer(true);
    setShowLobby(true);
  };
  
  // Handle join multiplayer from game over
  const handleJoinMultiplayer = () => {
    console.log('Joining multiplayer from game over');
    // First reset the game state
    resetGame();
    
    // Then switch to multiplayer
    setIsMultiplayer(true);
    setShowLobby(true);
  };
  
  // Handle join game
  const handleJoinGame = () => {
    console.log('Joining multiplayer game');
    setShowLobby(false);
  };
  
  // Handle cancel join
  const handleCancelJoin = () => {
    console.log('Cancelling multiplayer join');
    setIsMultiplayer(false);
    setShowLobby(false);
    leaveGame();
  };
  
  // Handle play again
  const handlePlayAgain = () => {
    setShowGameOver(false);
    
    if (isMultiplayer) {
      // In multiplayer mode, navigate back to the multiplayer lobby with 60s countdown
      resetGame();
      setIsMultiplayer(true);
      setShowLobby(true);
      // Leave current game and join the lobby
      leaveGame();
      return;
    }
    
    // Single player mode flow continues as before
    setIsTransitioning(true);
    
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
            reverseControls: false
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
    
    // Reset game state
    resetGame();
    
    // Leave multiplayer mode if active
    if (isMultiplayer) {
      setIsMultiplayer(false);
      leaveGame();
    }
    
    // Show start screen
    setIsDead(false);
    setShowLobby(false);
    setGameState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false
    }));
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
      {!gameState.isRunning && !showGameOver && !showLobby && !isDead && (
        <StartScreen 
          onStartGame={handleStartGame} 
          onStartMultiplayer={handleStartMultiplayer} 
        />
      )}
      
      {showLobby && (
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
          onMultiplayer={handleJoinMultiplayer}
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