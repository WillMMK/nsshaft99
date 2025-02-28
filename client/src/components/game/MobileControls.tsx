import React from 'react';

interface MobileControlsProps {
  onMoveLeft: () => void;
  onStopMoveLeft: () => void;
  onMoveRight: () => void;
  onStopMoveRight: () => void;
}

const MobileControls: React.FC<MobileControlsProps> = ({
  onMoveLeft,
  onStopMoveLeft,
  onMoveRight,
  onStopMoveRight
}) => {
  return (
    <div className="absolute bottom-0 left-0 w-full p-4 flex justify-between items-center z-30 lg:hidden">
      <button 
        className="w-16 h-16 bg-game-blue bg-opacity-50 rounded-full flex items-center justify-center"
        onTouchStart={onMoveLeft}
        onTouchEnd={onStopMoveLeft}
        onMouseDown={onMoveLeft}
        onMouseUp={onStopMoveLeft}
        onMouseLeave={onStopMoveLeft}
      >
        <i className="ri-arrow-left-s-line text-3xl text-white"></i>
      </button>
      <button 
        className="w-16 h-16 bg-game-blue bg-opacity-50 rounded-full flex items-center justify-center"
        onTouchStart={onMoveRight}
        onTouchEnd={onStopMoveRight}
        onMouseDown={onMoveRight}
        onMouseUp={onStopMoveRight}
        onMouseLeave={onStopMoveRight}
      >
        <i className="ri-arrow-right-s-line text-3xl text-white"></i>
      </button>
    </div>
  );
};

export default MobileControls;
