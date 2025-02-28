import { useRef } from 'react';

export default function GameCanvas({ gameActive }) {
  const canvasRef = useRef(null);

  return (
    <canvas
      ref={canvasRef}
      width={273}
      height={492}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '273px',  // Explicitly set CSS width
        height: '492px', // Explicitly set CSS height
      }}
    />
  );
}