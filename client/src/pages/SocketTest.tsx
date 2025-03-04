import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SERVER_URL } from '@/lib/game/constants';

const SocketTest: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [serverUrl, setServerUrl] = useState(SERVER_URL);

  useEffect(() => {
    // Log the server URL
    console.log('Attempting to connect to:', serverUrl);
    
    // Create a new socket connection
    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    });
    
    // Set up event listeners
    newSocket.on('connect', () => {
      console.log('Connected to server with ID:', newSocket.id);
      setConnected(true);
      setError(null);
      addMessage(`Connected to server with ID: ${newSocket.id}`);
    });
    
    newSocket.on('welcome', (data) => {
      console.log('Received welcome message:', data);
      addMessage(`Received welcome message: ${JSON.stringify(data)}`);
    });
    
    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setConnected(false);
      setError(`Connection error: ${err.message}`);
      addMessage(`Connection error: ${err.message}`);
    });
    
    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from server. Reason:', reason);
      setConnected(false);
      addMessage(`Disconnected from server. Reason: ${reason}`);
    });
    
    // Save the socket
    setSocket(newSocket);
    
    // Clean up on unmount
    return () => {
      console.log('Cleaning up socket connection');
      newSocket.disconnect();
    };
  }, [serverUrl]);
  
  const addMessage = (message: string) => {
    setMessages((prev) => [...prev, `${new Date().toISOString()}: ${message}`]);
  };
  
  const handleConnect = () => {
    if (socket) {
      socket.connect();
    }
  };
  
  const handleDisconnect = () => {
    if (socket) {
      socket.disconnect();
    }
  };
  
  const handleSendPing = () => {
    if (socket && connected) {
      addMessage('Sending ping to server');
      socket.emit('ping', { timestamp: new Date().toISOString() }, (response: any) => {
        addMessage(`Received pong: ${JSON.stringify(response)}`);
      });
    } else {
      addMessage('Cannot send ping: not connected');
    }
  };
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Socket.IO Connection Test</h1>
      
      <div className="mb-4">
        <div className="flex items-center mb-2">
          <span className="mr-2">Status:</span>
          <span className={`px-2 py-1 rounded ${connected ? 'bg-green-500' : 'bg-red-500'} text-white`}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="mb-4">
          <label className="block mb-2">Server URL:</label>
          <div className="flex">
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="border p-2 flex-grow"
            />
          </div>
        </div>
        
        <div className="flex space-x-2 mb-4">
          <button
            onClick={handleConnect}
            disabled={connected}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            Connect
          </button>
          
          <button
            onClick={handleDisconnect}
            disabled={!connected}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            Disconnect
          </button>
          
          <button
            onClick={handleSendPing}
            disabled={!connected}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            Send Ping
          </button>
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-bold mb-2">Event Log:</h2>
        <div className="bg-gray-100 p-4 rounded h-64 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-500">No events yet</p>
          ) : (
            <ul className="list-disc pl-5">
              {messages.map((message, index) => (
                <li key={index} className="mb-1 font-mono text-sm">
                  {message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default SocketTest; 