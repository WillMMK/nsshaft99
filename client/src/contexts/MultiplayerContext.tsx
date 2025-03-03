import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NetworkManager } from '@/lib/game/network';
import { Player, AttackType } from '@/types';
import { DEFAULT_GAME_ID } from '@/lib/game/constants';

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
  joinGame: (name: string, gameId?: string) => Promise<void>;
  leaveGame: () => void;
  updateScore: (score: number) => void;
  sendAttack: (targetId: string, attackType: AttackType) => void;
  reportDeath: () => void;
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
  const [isGameActive, setIsGameActive] = useState<boolean>(false);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  
  // Define initializeNetwork as a ref to avoid dependency issues
  const initializeNetworkRef = React.useRef<() => Promise<void>>();

  // Initialize socket connection when component mounts
  useEffect(() => {
    const initializeNetwork = async () => {
      try {
        console.log('Initializing network connection for multiplayer...');
        await networkManager.initialize();
        setIsConnected(true);
        setPlayerId(networkManager.getSocketId());
        console.log('Network connection established successfully');
        
        // Set up event listeners
        networkManager.onPlayerJoined((data) => {
          console.log('Player joined:', data);
          setPlayers(data.players);
        });
        
        networkManager.onPlayerLeft((data) => {
          console.log('Player left:', data);
          setPlayers(data.players);
        });
        
        networkManager.onScoreUpdated((data) => {
          setPlayers(data.players);
        });
        
        networkManager.onGameStarted((data) => {
          console.log('Game started:', data);
          setIsGameActive(true);
          setGameStartTime(data.startTime);
          setPlayers(data.players);
        });
        
        networkManager.onGameOver((data) => {
          console.log('Game over:', data);
          setIsGameActive(false);
        });
        
        networkManager.onGameReset((data) => {
          console.log('Game reset:', data);
          setPlayers(data.players);
          setIsGameActive(false);
          setGameStartTime(null);
        });
        
        networkManager.onDisconnect(() => {
          console.log('Disconnected from server');
          setIsConnected(false);
          setIsGameActive(false);
          setGameId(null);
          setPlayers({});
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to initialize network:', errorMessage);
        setIsConnected(false);
        
        // Retry connection after a delay
        setTimeout(() => {
          if (isMultiplayer) {
            console.log('Retrying network connection...');
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
      }
    };
  }, [isMultiplayer]);

  // Join a game
  const joinGame = async (name: string, customGameId: string = DEFAULT_GAME_ID) => {
    if (!isConnected) {
      try {
        console.log('Not connected, initializing network...');
        await networkManager.initialize();
        setIsConnected(true);
        setPlayerId(networkManager.getSocketId());
        console.log('Network initialized successfully, socket ID:', networkManager.getSocketId());
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to connect:', errorMessage);
        throw new Error(`Failed to connect to server: ${errorMessage}`);
      }
    }
    
    try {
      console.log('Attempting to join game with name:', name, 'and gameId:', customGameId);
      const response = await networkManager.joinGame(name, customGameId);
      if (response.success) {
        console.log('Successfully joined game:', response);
        setPlayerName(name);
        setGameId(response.gameId);
        setPlayers(response.players || {});
        return;
      } else {
        console.error('Failed to join game with response:', response);
        throw new Error(response.error || 'Failed to join game');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to join game:', errorMessage);
      
      // If we failed to join, try to reconnect and join again
      if (isConnected && networkManager.getSocketId() === null) {
        console.log('Socket ID is null despite being connected, attempting to reconnect...');
        setIsConnected(false);
        
        // Retry after a short delay
        setTimeout(() => {
          if (isMultiplayer && initializeNetworkRef.current) {
            console.log('Retrying connection...');
            initializeNetworkRef.current();
          }
        }, 1000);
      }
      
      throw error;
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
    setIsMultiplayer(false);
  };

  // Update player score
  const updateScore = (score: number) => {
    if (isConnected && isMultiplayer) {
      networkManager.updateScore(score);
    }
  };

  // Send an attack to another player
  const sendAttack = (targetId: string, attackType: AttackType) => {
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
        joinGame,
        leaveGame,
        updateScore,
        sendAttack,
        reportDeath,
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