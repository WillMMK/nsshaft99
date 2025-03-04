import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

const NavBar: React.FC = () => {
  const { currentUser } = useAuth();
  const [location] = useLocation();

  if (!currentUser) return null;

  return (
    <nav className="absolute top-0 left-0 right-0 bg-gray-800 bg-opacity-80 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center">
            <Link href="/">
              <a className="font-pixel text-game-yellow text-lg">NS-SHAFT</a>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link href="/">
              <a className={`font-pixel text-sm ${location === '/' ? 'text-game-yellow' : 'text-game-light hover:text-game-yellow'}`}>
                Play
              </a>
            </Link>
            
            <Link href="/profile">
              <a className={`font-pixel text-sm ${location === '/profile' ? 'text-game-yellow' : 'text-game-light hover:text-game-yellow'}`}>
                Profile
              </a>
            </Link>
            
            <Link href="/socket-test">
              <a className={`font-pixel text-sm ${location === '/socket-test' ? 'text-game-yellow' : 'text-game-light hover:text-game-yellow'}`}>
                Socket Test
              </a>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar; 