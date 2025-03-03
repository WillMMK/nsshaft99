async initialize(): Promise<void> {
    try {
      // Get the origin from the current window - this works in Replit
      const host = window.location.host;
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
      const serverUrl = `${protocol}://${host}`;

      console.log('Attempting to connect to server at', serverUrl);
      this.socket = io(serverUrl);

      this.socket.on('connect', () => {
        console.log('Connected to server');
        // Add any other connection logic here.
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from server');
        // Add any disconnection logic here.
      });


      //Example event listener
      this.socket.on('update_game_state', (gameState) => {
        // Handle the game state update
        this.updateGameState(gameState);
      })

    } catch (error) {
      console.error('Error connecting to server:', error);
      // Add error handling logic here.
    }
  }