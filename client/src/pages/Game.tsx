import { useState } from 'react';
import GameCanvas from '@/components/game/GameCanvas';

const Game = () => {
  const [gameActive, setGameActive] = useState(true);
  
  return (
    <div className="bg-black text-white min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full mx-auto">
        <h1 className="text-center text-yellow-500 text-2xl mb-4">NS-SHAFT</h1>
        
        <div className="relative bg-gray-900 border-4 border-blue-500 rounded-lg overflow-hidden" 
             style={{ height: '500px', maxHeight: '80vh', width: '273px', margin: '0 auto' }}>
          
          <GameCanvas gameActive={gameActive} />
          
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-300 mb-1">Avoid spikes, don't fall too fast!</p>
          <p className="text-sm text-gray-300">Land on platforms to gain health.</p>
        </div>
      </div>
    </div>
  );
};

export default Game;
