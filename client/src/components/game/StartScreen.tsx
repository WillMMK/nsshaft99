import React from 'react';

interface StartScreenProps {
  onStartGame: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStartGame }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-game-dark bg-opacity-90 z-20">
      <h2 className="font-pixel text-game-yellow text-xl mb-6">NS-SHAFT</h2>
      <div className="mb-8 text-center">
        <div className="font-mono text-game-light text-md mb-4">CONTROLS:</div>
        <div className="flex justify-center space-x-4 mb-2">
          <div className="w-10 h-10 border-2 border-game-light rounded flex items-center justify-center">
            <i className="ri-arrow-left-s-line text-xl"></i>
          </div>
          <div className="w-10 h-10 border-2 border-game-light rounded flex items-center justify-center">
            <i className="ri-arrow-right-s-line text-xl"></i>
          </div>
        </div>
        <p className="font-sans text-sm text-game-light">Move left and right to survive!</p>
      </div>
      <button 
        onClick={onStartGame}
        className="px-6 py-3 bg-game-blue hover:bg-opacity-80 text-white font-pixel rounded-lg transition-all"
      >
        START GAME
      </button>
    </div>
  );
};

export default StartScreen;
