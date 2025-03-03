import { io, Socket } from 'socket.io-client';
import { Player, AttackType } from '@/types';

// The URL of the WebSocket server - hardcoded for now
const SERVER_URL = 'http://localhost:3001';

export class NetworkManager {
  private socket: Socket | null = null;
  private connecting: boolean = false;
  private connectionCallbacks: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];

  // Initialize the socket connection
  public async initialize(): Promise<void> {
    if (this.socket && this.socket.connected) {
      return Promise.resolve();
    }

    if (this.connecting) {
      // Return a promise that will be resolved when the connection is established
      return new Promise<void>((resolve, reject) => {
        this.connectionCallbacks.push({ resolve, reject });
      });
    }

    this.connecting = true;

    return new Promise<void>((resolve, reject) => {
      this.connectionCallbacks.push({ resolve, reject });

      try {
        this.socket = io(SERVER_URL, {
          transports: ['websocket'],
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
          console.log('Connected to server with ID:', this.socket?.id);
          this.connecting = false;
          
          // Resolve all pending connection promises
          this.connectionCallbacks.forEach(callback => callback.resolve());
          this.connectionCallbacks = [];
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          if (this.connectionCallbacks.length > 0) {
            this.connectionCallbacks.forEach(callback => callback.reject(new Error('Failed to connect to server')));
            this.connectionCallbacks = [];
          }
          this.connecting = false;
        });

        this.socket.on('disconnect', () => {
          console.log('Disconnected from server');
        });
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
            error: 'Unable to connect to server. Please try again.' 
          };
        }
      } catch (error) {
        console.error('Failed to initialize socket:', error);
        return { 
          success: false, 
          error: 'Failed to connect to server. Please check your connection.' 
        };
      }
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      console.log('Emitting join_game event with:', { name, gameId });
      this.socket.emit('join_game', { name, gameId }, (response: any) => {
        console.log('Received join_game response:', response);
        if (response.success) {
          resolve({
            success: true,
            gameId: response.gameId,
            players: response.players
          });
        } else {
          resolve({
            success: false,
            error: response.error || 'Failed to join game'
          });
        }
      });
      
      // Add a timeout in case the server doesn't respond
      setTimeout(() => {
        if (this.socket?.connected) {
          resolve({
            success: false,
            error: 'Server did not respond in time. Please try again.'
          });
        }
      }, 5000);
    });
  }

  // Update player score
  public updateScore(score: number): void {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit('update_score', { score });
  }

  // Send an attack to another player
  public sendAttack(targetId: string, attackType: AttackType): void {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit('send_attack', { targetId, attackType });
  }

  // Report player death
  public reportDeath(): void {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit('player_died');
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

  public onReceiveAttack(callback: (data: { attackerId: string; attackerName: string; attackType: AttackType }) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('receive_attack', callback);
    return () => this.socket?.off('receive_attack', callback);
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

  public onDisconnect(callback: () => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('disconnect', callback);
    return () => this.socket?.off('disconnect', callback);
  }
} 