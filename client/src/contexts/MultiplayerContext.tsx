import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { NetworkManager } from '@/lib/game/network';
import { Player, AttackType } from '@/types';
import { DEFAULT_GAME_ID, PLAYER_COLORS } from '@/lib/game/constants';

interface MultiplayerContextType {
  isMultiplayer: boolean;
  setIsMultiplayer: (value: boolean) => void;
  isConnected: boolean;
  playerId: string | null;
  playerName: string | null;
  gameId: string | null;
  players: Record<string, Player>;
  isGameActive: boolean;
  gameStartTime: number | null;
  countdownSeconds: number | null;
  playerColors: Record<string, string>;
  joinGame: (name: string, gameId?: string) => Promise<void>;
  leaveGame: () => void;
  updateScore: (score: number) => void;
  sendAttack: (attackType: AttackType, targetId?: string) => void;
  reportDeath: () => void;
  requestPlayerList: () => void;
  onReceiveAttack: (callback: (data: { attackerId: string; attackerName: string; attackType: AttackType }) => void) => () => void;
  onGameStarted: (callback: (data: { gameId: string; players: Record<string, Player>; startTime: number }) => void) => () => void;
  onGameOver: (callback: (data: { winnerId: string; winnerName: string; players: Record<string, Player> }) => void) => () => void;
  onGameReset: (callback: (data: { gameId: string; players: Record<string, Player> }) => void) => () => void;
}

const MultiplayerContext = createContext<MultiplayerContextType | undefined>(undefined);

// Initialize the network manager
const networkManager = new NetworkManager();

export const MultiplayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isMultiplayer, setIsMultiplayer] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [playerColors, setPlayerColors] = useState<Record<string, string>>({});
  const [isGameActive, setIsGameActive] = useState<boolean>(false);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  
  // Define initializeNetwork as a ref to avoid dependency issues
  const initializeNetworkRef = React.useRef<() => Promise<void>>();

  // Initialize socket connection when component mounts
  useEffect(() => {
    const initializeNetwork = async () => {
      try {
        await networkManager.initialize();
        setIsConnected(true);
        setPlayerId(networkManager.getSocketId());
        
        // Make networkManager globally available for debugging and polling
        if (typeof window !== 'undefined') {
          (window as any).networkManager = networkManager;
        }
        
        // Set up event listeners
        networkManager.onPlayerJoined((data) => {
          setPlayers(data.players);
        });
        
        networkManager.onPlayerLeft((data) => {
          setPlayers(data.players);
        });
        
        networkManager.onScoreUpdated((data) => {
          setPlayers(data.players);
        });
        
        networkManager.onGameStarted((data) => {
          setIsGameActive(true);
          setGameStartTime(data.startTime);
          setPlayers(data.players);
          setCountdownSeconds(null); // Clear countdown when game starts
        });
        
        networkManager.onGameOver((data) => {
          setIsGameActive(false);
        });
        
        networkManager.onGameReset((data) => {
          setPlayers(data.players);
          setIsGameActive(false);
          setGameStartTime(null);
        });
        
        networkManager.onCountdownUpdate((data) => {
          setCountdownSeconds(data.secondsLeft);
          
          // When countdown is at 30s, AI players might be added - request fresh player list
          if (data.secondsLeft === 30 || data.secondsLeft === 29) {
            networkManager.requestPlayerList();
          }
        });
        
        networkManager.onPlayerListUpdate((players) => {
          setPlayers(players);
        });
        
        // Add handler for individual player updates
        networkManager.onPlayerUpdated((data) => {
          // Update only the specific player in the players state
          setPlayers(prevPlayers => ({
            ...prevPlayers,
            [data.playerId]: data.playerState
          }));
        });
        
        networkManager.onDisconnect(() => {
          setIsConnected(false);
          setIsGameActive(false);
          setGameId(null);
          setPlayers({});
          setCountdownSeconds(null);
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to initialize network:', errorMessage);
        setIsConnected(false);
        
        // Retry connection after a delay
        setTimeout(() => {
          if (isMultiplayer) {
            initializeNetwork();
          }
        }, 3000);
      }
    };
    
    // Store the function in the ref
    initializeNetworkRef.current = initializeNetwork;

    if (isMultiplayer) {
      initializeNetwork();
    }

    return () => {
      if (isMultiplayer) {
        console.log('Cleaning up network connection');
        networkManager.disconnect();
        setIsConnected(false);
        setPlayerId(null);
        setGameId(null);
        setPlayers({});
        setIsGameActive(false);
        setCountdownSeconds(null);
      }
    };
  }, [isMultiplayer]);

  // Generate player colors when players change
  useEffect(() => {
    const newPlayerColors: Record<string, string> = {};
    Object.keys(players).forEach((playerId, index) => {
      newPlayerColors[playerId] = PLAYER_COLORS[index % PLAYER_COLORS.length];
    });
    setPlayerColors(newPlayerColors);
  }, [players]);

  // Join a game
  const joinGame = async (name: string, customGameId: string = DEFAULT_GAME_ID) => {
    if (!isConnected) {
      try {
        await networkManager.initialize();
        setIsConnected(true);
        setPlayerId(networkManager.getSocketId());
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to connect:', errorMessage);
        throw new Error(`Failed to connect to server: ${errorMessage}`);
      }
    }
    
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        const response = await networkManager.joinGame(name, customGameId);
        if (response.success) {
          setPlayerName(name);
          setGameId(response.gameId);
          setPlayers(response.players || {});
          return;
        } else {
          if (retryCount === maxRetries) {
            throw new Error(response.error || 'Failed to join game after multiple attempts');
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
          retryCount++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (retryCount === maxRetries) {
          throw error;
        }
        
        if (isConnected && networkManager.getSocketId() === null) {
          setIsConnected(false);
          try {
            await networkManager.initialize();
            setIsConnected(true);
            setPlayerId(networkManager.getSocketId());
          } catch (reconnectError) {
            console.error('Failed to reconnect:', reconnectError);
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        retryCount++;
      }
    }
  };

  // Leave the current game
  const leaveGame = () => {
    networkManager.disconnect();
    setIsConnected(false);
    setPlayerId(null);
    setPlayerName(null);
    setGameId(null);
    setPlayers({});
    setIsGameActive(false);
    setGameStartTime(null);
    setCountdownSeconds(null);
    setIsMultiplayer(false);
    
    // Add a slight delay before reconnecting to ensure a clean state
    setTimeout(() => {
      // Reinitialize the network connection
      if (initializeNetworkRef.current) {
        initializeNetworkRef.current();
      }
    }, 300);
  };

  // Update player score
  const updateScore = (score: number) => {
    if (isConnected && isMultiplayer) {
      networkManager.updateScore(score);
    }
  };

  // Send an attack to another player
  const sendAttack = (attackType: AttackType, targetId?: string) => {
    if (isConnected && isMultiplayer) {
      networkManager.sendAttack(targetId, attackType);
    }
  };

  // Report player death
  const reportDeath = () => {
    if (isConnected && isMultiplayer) {
      networkManager.reportDeath();
    }
  };

  // Register callback for receiving attacks
  const onReceiveAttack = (callback: (data: { attackerId: string; attackerName: string; attackType: AttackType }) => void) => {
    return networkManager.onReceiveAttack(callback);
  };

  // Register callback for game started event
  const onGameStarted = (callback: (data: { gameId: string; players: Record<string, Player>; startTime: number }) => void) => {
    return networkManager.onGameStarted(callback);
  };

  // Register callback for game over event
  const onGameOver = (callback: (data: { winnerId: string; winnerName: string; players: Record<string, Player> }) => void) => {
    return networkManager.onGameOver(callback);
  };

  // Register callback for game reset event
  const onGameReset = (callback: (data: { gameId: string; players: Record<string, Player> }) => void) => {
    return networkManager.onGameReset(callback);
  };

  // Add requestPlayerList function to context
  const requestPlayerList = () => {
    if (networkManager) {
      try {
        networkManager.requestPlayerList();
      } catch (error) {
        console.error('Error requesting player list:', error);
      }
    }
  };

  return (
    <MultiplayerContext.Provider
      value={{
        isMultiplayer,
        setIsMultiplayer,
        isConnected,
        playerId,
        playerName,
        gameId,
        players,
        isGameActive,
        gameStartTime,
        countdownSeconds,
        playerColors,
        joinGame,
        leaveGame,
        updateScore,
        sendAttack,
        reportDeath,
        requestPlayerList,
        onReceiveAttack,
        onGameStarted,
        onGameOver,
        onGameReset
      }}
    >
      {children}
    </MultiplayerContext.Provider>
  );
};

export const useMultiplayer = () => {
  const context = useContext(MultiplayerContext);
  if (context === undefined) {
    throw new Error('useMultiplayer must be used within a MultiplayerProvider');
  }
  return context;
};

export default MultiplayerContext; 