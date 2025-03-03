import React, { useState, useEffect, useRef } from 'react';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { useGameState } from '@/contexts/GameStateContext';
import GameCanvas from './GameCanvas';
import StartScreen from './StartScreen';
import MultiplayerLobby from '../multiplayer/MultiplayerLobby';
import GameOverScreen from './GameOverScreen';
import { AttackType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

const Game: React.FC = () => {
  const { isMultiplayer, setIsMultiplayer, onReceiveAttack, onGameStarted, onGameOver, leaveGame } = useMultiplayer();
  const { gameState, setGameState, resetGame } = useGameState();
  const { currentUser, userProfile, refreshUserProfile } = useAuth();
  const [showLobby, setShowLobby] = useState<boolean>(false);
  const [showGameOver, setShowGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<{ id: string; name: string } | null>(null);
  const gameRef = useRef<HTMLDivElement>(null);

  // Handle multiplayer attacks
  useEffect(() => {
    if (!isMultiplayer) return;

    const handleAttack = (data: { attackerId: string; attackerName: string; attackType: AttackType }) => {
      console.log('Received attack:', data);
      
      // Apply the attack effect based on the type
      switch (data.attackType) {
        case AttackType.SPIKE_PLATFORM:
          setGameState(prev => ({
            ...prev,
            activeEffects: {
              ...prev.activeEffects,
              spikePlatforms: true
            },
            attackNotification: {
              attackerName: data.attackerName,
              attackType: data.attackType,
              timestamp: Date.now()
            }
          }));
          
          // Clear the effect after a duration
          setTimeout(() => {
            setGameState(prev => ({
              ...prev,
              activeEffects: {
                ...prev.activeEffects,
                spikePlatforms: false
              }
            }));
          }, 10000); // 10 seconds
          break;
          
        case AttackType.SPEED_UP:
          setGameState(prev => ({
            ...prev,
            activeEffects: {
              ...prev.activeEffects,
              speedUp: true
            },
            attackNotification: {
              attackerName: data.attackerName,
              attackType: data.attackType,
              timestamp: Date.now()
            }
          }));
          
          // Clear the effect after a duration
          setTimeout(() => {
            setGameState(prev => ({
              ...prev,
              activeEffects: {
                ...prev.activeEffects,
                speedUp: false
              }
            }));
          }, 8000); // 8 seconds
          break;
          
        case AttackType.NARROW_PLATFORM:
          setGameState(prev => ({
            ...prev,
            activeEffects: {
              ...prev.activeEffects,
              narrowPlatforms: true
            },
            attackNotification: {
              attackerName: data.attackerName,
              attackType: data.attackType,
              timestamp: Date.now()
            }
          }));
          
          // Clear the effect after a duration
          setTimeout(() => {
            setGameState(prev => ({
              ...prev,
              activeEffects: {
                ...prev.activeEffects,
                narrowPlatforms: false
              }
            }));
          }, 12000); // 12 seconds
          break;
          
        case AttackType.REVERSE_CONTROLS:
          setGameState(prev => ({
            ...prev,
            activeEffects: {
              ...prev.activeEffects,
              reverseControls: true
            },
            attackNotification: {
              attackerName: data.attackerName,
              attackType: data.attackType,
              timestamp: Date.now()
            }
          }));
          
          // Clear the effect after a duration
          setTimeout(() => {
            setGameState(prev => ({
              ...prev,
              activeEffects: {
                ...prev.activeEffects,
                reverseControls: false
              }
            }));
          }, 6000); // 6 seconds
          break;
      }
    };

    const unsubscribe = onReceiveAttack(handleAttack);
    return unsubscribe;
  }, [isMultiplayer, onReceiveAttack, setGameState]);

  // Handle game started event
  useEffect(() => {
    if (!isMultiplayer) return;

    const handleGameStarted = () => {
      console.log('Game started!');
      setShowLobby(false);
      resetGame();
      setGameState(prev => ({
        ...prev,
        isRunning: true,
        isPaused: false
      }));
    };

    const unsubscribe = onGameStarted(handleGameStarted);
    return unsubscribe;
  }, [isMultiplayer, onGameStarted, resetGame, setGameState]);

  // Handle game over event
  useEffect(() => {
    if (!isMultiplayer) return;

    const handleGameOver = (data: { winnerId: string; winnerName: string }) => {
      console.log('Game over! Winner:', data.winnerName);
      setWinner({
        id: data.winnerId,
        name: data.winnerName
      });
      setShowGameOver(true);
      setGameState(prev => ({
        ...prev,
        isRunning: false,
        isPaused: true
      }));
      
      // Update user stats in Firestore
      updateUserStats();
    };

    const unsubscribe = onGameOver(handleGameOver);
    return unsubscribe;
  }, [isMultiplayer, onGameOver, setGameState]);
  
  // Watch for game state changes to detect game over in single player mode
  useEffect(() => {
    // If the game was running but is now not running, and we're not in multiplayer mode,
    // and we're not showing the game over screen yet, then show it
    if (!gameState.isRunning && !isMultiplayer && !showGameOver && gameState.score > 0) {
      setShowGameOver(true);
      updateUserStats();
    }
  }, [gameState.isRunning, isMultiplayer, showGameOver, gameState.score]);
  
  // Update user stats when game ends
  const updateUserStats = async () => {
    const finalScore = gameState.score;
    
    if (currentUser && finalScore > 0) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        
        // Get the latest user data to ensure we have the current high score
        const userDoc = await getDoc(userRef);
        
        const userData = userDoc.data();
        const currentHighScore = userData?.highScore || 0;
        
        // Only update if the new score is higher
        if (finalScore > currentHighScore) {
          await updateDoc(userRef, {
            highScore: finalScore,
            gamesPlayed: increment(1),
            totalScore: increment(finalScore)
          });
          
          // Refresh the user profile to show the updated high score
          refreshUserProfile();
        } else {
          // Just update games played and total score
          await updateDoc(userRef, {
            gamesPlayed: increment(1),
            totalScore: increment(finalScore)
          });
        }
      } catch (error) {
        console.error("Error updating user stats:", error);
      }
    }
  };

  const handleStartGame = () => {
    console.log('Starting single player game');
    
    // First, ensure the game is stopped
    setGameState(prev => ({
      ...prev,
      isRunning: false
    }));
    
    // Use setTimeout to ensure the game loop has time to clean up
    setTimeout(() => {
      // Ensure multiplayer is off
      setIsMultiplayer(false);
      
      // Reset game state completely
      setGameState(prev => ({
        ...prev,
        score: 0,
        health: 100,
        activeEffects: {
          spikePlatforms: false,
          speedUp: false,
          narrowPlatforms: false,
          reverseControls: false
        },
        attackNotification: null
      }));
      
      // Use another setTimeout to ensure state updates have been processed
      setTimeout(() => {
        // Start the game
        setGameState(prev => ({
          ...prev,
          isRunning: true,
          isPaused: false
        }));
      }, 100);
    }, 100);
  };

  const handleStartMultiplayer = () => {
    console.log('Starting multiplayer mode');
    setIsMultiplayer(true);
    setShowLobby(true);
  };

  const handleJoinMultiplayer = () => {
    console.log('Joining multiplayer from game over');
    // First reset the game state
    resetGame();
    
    // Then switch to multiplayer
    setIsMultiplayer(true);
    setShowLobby(true);
  };

  const handleJoinGame = () => {
    console.log('Joining multiplayer game');
    setShowLobby(false);
    resetGame();
    setGameState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false
    }));
  };

  const handleCancelJoin = () => {
    console.log('Canceling multiplayer join');
    setShowLobby(false);
    setIsMultiplayer(false);
  };

  const handlePlayAgain = () => {
    console.log('Starting handlePlayAgain');
    
    // First, stop the current game completely
    setGameState(prev => ({
      ...prev,
      isRunning: false
    }));
    
    // Use setTimeout to ensure the game loop has time to clean up
    setTimeout(() => {
      // Clear the game over state and reset multiplayer mode
      setShowGameOver(false);
      setIsMultiplayer(false); // Ensure the new game is single-player
      
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
        
        console.log('Finished handlePlayAgain');
      }, 100);
    }, 100);
  };

  const handleGameOver = () => {
    setGameState(prev => ({
      ...prev,
      isRunning: false
    }));
    
    if (isMultiplayer) {
      leaveGame();
    } else {
      setShowGameOver(true);
      updateUserStats();
    }
  };

  return (
    <div ref={gameRef} className="relative w-full h-full overflow-hidden">
      {!gameState.isRunning && !showGameOver && !showLobby && (
        <StartScreen 
          onStartGame={handleStartGame} 
          onStartMultiplayer={handleStartMultiplayer} 
        />
      )}
      
      <GameCanvas onJoinMultiplayer={handleJoinMultiplayer} />
      
      {showLobby && (
        <MultiplayerLobby onJoin={handleJoinGame} onCancel={handleCancelJoin} />
      )}
      
      {showGameOver && (
        <GameOverScreen 
          winner={winner} 
          onPlayAgain={handlePlayAgain} 
        />
      )}
    </div>
  );
};

export default Game; 