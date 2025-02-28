import React, { useState } from 'react';

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
  const [leftActive, setLeftActive] = useState(false);
  const [rightActive, setRightActive] = useState(false);
  
  // Handle touch and mouse events with active state tracking
  const handleLeftStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent default to avoid double events
    setLeftActive(true);
    onMoveLeft();
  };
  
  const handleLeftEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setLeftActive(false);
    onStopMoveLeft();
  };
  
  const handleRightStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setRightActive(true);
    onMoveRight();
  };
  
  const handleRightEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setRightActive(false);
    onStopMoveRight();
  };
  
  return (
    <div className="absolute bottom-0 left-0 w-full p-6 flex justify-between items-center z-30 lg:hidden">
      <button 
        className={`w-20 h-20 ${leftActive ? 'bg-blue-600' : 'bg-blue-500'} bg-opacity-70 
                   rounded-full flex items-center justify-center shadow-lg transition-colors duration-150
                   active:bg-blue-600 active:shadow-inner border-2 border-white border-opacity-30`}
        onTouchStart={handleLeftStart}
        onTouchEnd={handleLeftEnd}
        onTouchCancel={handleLeftEnd}
        onMouseDown={handleLeftStart}
        onMouseUp={handleLeftEnd}
        onMouseLeave={handleLeftEnd}
        aria-label="Move Left"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      
      <button 
        className={`w-20 h-20 ${rightActive ? 'bg-blue-600' : 'bg-blue-500'} bg-opacity-70
                   rounded-full flex items-center justify-center shadow-lg transition-colors duration-150
                   active:bg-blue-600 active:shadow-inner border-2 border-white border-opacity-30`}
        onTouchStart={handleRightStart}
        onTouchEnd={handleRightEnd}
        onTouchCancel={handleRightEnd}
        onMouseDown={handleRightStart}
        onMouseUp={handleRightEnd}
        onMouseLeave={handleRightEnd}
        aria-label="Move Right"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
};

export default MobileControls;
