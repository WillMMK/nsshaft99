import { io, Socket } from 'socket.io-client';
import { Player, AttackType } from '@/types';
import { SERVER_URL } from './constants';

// The URL of the WebSocket server is now imported from constants
// const SERVER_URL = 'http://localhost:3001';

export class NetworkManager {
  private socket: Socket | null = null;
  private connecting: boolean = false;
  private connectionCallbacks: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];

  // Initialize the socket connection
  public async initialize(): Promise<void> {
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected');
      return;
    }
    
    if (this.connecting) {
      console.log('Already attempting to connect...');
      return new Promise((resolve, reject) => {
        this.connectionCallbacks.push({ resolve, reject });
      });
    }
    
    this.connecting = true;
    
    return new Promise((resolve, reject) => {
      try {
        this.connectionCallbacks.push({ resolve, reject });
        
        // Get the origin from the current window - this works in Replit
        const host = window.location.host;
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        
        // Use the same origin as the client
        const serverUrl = window.location.origin;
        
        console.log(`Attempting to connect to server at ${serverUrl}`);
        
        // Configure socket options
        const socketOptions: Partial<ManagerOptions & SocketOptions> = {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
          autoConnect: true,
          forceNew: true
        };
        
        // Initialize socket
        console.log('Initializing socket with options:', socketOptions);
        this.socket = io(serverUrl, socketOptions);
        
        // Set up connection event handlers
        this.socket.on('connect', () => {
          console.log('Connected to server with ID:', this.socket?.id);
          this.connecting = false;
          this.connectionCallbacks.forEach(callback => callback.resolve());
          this.connectionCallbacks = [];
        });
        
        this.socket.on('connect_error', (error) => {
          console.error('Failed to connect to:', serverUrl, error);
          // Only reject if we've been trying for a while
          if (this.socket?.io?.attempts && this.socket.io.attempts >= 3) {
            this.connecting = false;
            this.connectionCallbacks.forEach(callback => callback.reject(new Error(`Failed to connect to server at ${serverUrl}: ${error.message}`)));
            this.connectionCallbacks = [];
          }
        });
        
        this.socket.on('disconnect', (reason) => {
          console.log('Disconnected from server:', reason);
        });
        
        // Set up a timeout in case the connection takes too long
        setTimeout(() => {
          if (this.connecting) {
            console.error('Connection timeout');
            this.connecting = false;
            this.connectionCallbacks.forEach(callback => callback.reject(new Error('Connection timeout')));
            this.connectionCallbacks = [];
          }
        }, 15000);
        
      } catch (error) {
        console.error('Error initializing socket:', error);
        this.connecting = false;
        reject(error);
      }
    });
  }

  // Get the socket ID
  public getSocketId(): string | null {
    return this.socket?.id || null;
  }

  // Join a game
  public async joinGame(name: string, gameId: string): Promise<{ success: boolean; gameId?: string; players?: Record<string, Player>; error?: string }> {
    if (!this.socket || !this.socket.connected) {
      console.log('Socket not connected, attempting to initialize...');
      try {
        await this.initialize();
        
        // Double check connection after initialization
        if (!this.socket || !this.socket.connected) {
          console.error('Socket still not connected after initialization');
          return { 
            success: false, 
            error: `Unable to connect to server at ${SERVER_URL}. Please try again.` 
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to initialize socket:', errorMessage);
        return { 
          success: false, 
          error: `Failed to connect to server at ${SERVER_URL}. Error: ${errorMessage}` 
        };
      }
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      console.log('Emitting join_game event with:', { name, gameId });
      
      // Set a timeout in case the server doesn't respond
      const timeoutId = setTimeout(() => {
        if (this.socket?.connected) {
          console.error('Server did not respond to join_game event in time');
          resolve({
            success: false,
            error: 'Server did not respond in time. Please try again.'
          });
        }
      }, 10000); // Increased from 5000 to 10000 ms
      
      try {
        this.socket.emit('join_game', { name, gameId }, (response: any) => {
          clearTimeout(timeoutId); // Clear the timeout since we got a response
          
          console.log('Received join_game response:', response);
          if (response && response.success) {
            resolve({
              success: true,
              gameId: response.gameId,
              players: response.players
            });
          } else {
            resolve({
              success: false,
              error: (response && response.error) || 'Failed to join game'
            });
          }
        });
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Error emitting join_game event:', error);
        resolve({
          success: false,
          error: 'Error connecting to server: ' + (error instanceof Error ? error.message : String(error))
        });
      }
    });
  }

  // Update player score
  public updateScore(score: number): void {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit('update_score', { score });
  }

  // Send an attack to another player
  public sendAttack(targetId?: string, attackType?: AttackType): void {
    if (!this.socket || !this.socket.connected) return;
    
    // If no attack type is specified, use a random one
    const actualAttackType = attackType || Object.values(AttackType)[Math.floor(Math.random() * Object.values(AttackType).length)];
    
    this.socket.emit('sendAttack', { 
      targetPlayerId: targetId, // If undefined, server will pick a random target
      attackType: actualAttackType 
    });
  }

  // Report player death
  public reportDeath(): void {
    if (!this.socket || !this.socket.connected) return;
    console.log('Reporting player death to server');
    this.socket.emit('report_death');
  }

  // Disconnect from the server
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Event listeners
  public onPlayerJoined(callback: (data: { player: Player; players: Record<string, Player> }) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('player_joined', callback);
    return () => this.socket?.off('player_joined', callback);
  }

  public onPlayerLeft(callback: (data: { playerId: string; playerName: string; players: Record<string, Player> }) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('player_left', callback);
    return () => this.socket?.off('player_left', callback);
  }

  public onScoreUpdated(callback: (data: { playerId: string; score: number; players: Record<string, Player> }) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('score_updated', callback);
    return () => this.socket?.off('score_updated', callback);
  }

  // Register callback for receiving attacks
  public onReceiveAttack(callback: (data: { attackerId: string; attackerName: string; attackType: AttackType }) => void): () => void {
    if (!this.socket) return () => {};
    
    const handler = (data: { attackerId: string; attackerName: string; attackType: AttackType }) => {
      console.log('Received attack:', data);
      callback(data);
    };
    
    this.socket.on('receive_attack', handler);
    return () => {
      this.socket?.off('receive_attack', handler);
    };
  }

  public onGameStarted(callback: (data: { gameId: string; players: Record<string, Player>; startTime: number }) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('game_started', callback);
    return () => this.socket?.off('game_started', callback);
  }

  public onGameOver(callback: (data: { winnerId: string; winnerName: string; players: Record<string, Player> }) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('game_over', callback);
    return () => this.socket?.off('game_over', callback);
  }

  public onGameReset(callback: (data: { gameId: string; players: Record<string, Player> }) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('game_reset', callback);
    return () => this.socket?.off('game_reset', callback);
  }

  public onCountdownUpdate(callback: (data: { secondsLeft: number }) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('countdown_update', callback);
    return () => this.socket?.off('countdown_update', callback);
  }

  public onDisconnect(callback: () => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('disconnect', callback);
    return () => this.socket?.off('disconnect', callback);
  }
} 