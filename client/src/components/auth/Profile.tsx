import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

const Profile: React.FC = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const [error, setError] = useState('');
  const [, navigate] = useLocation();

  async function handleLogout() {
    setError('');
    
    try {
      await logout();
      navigate('/login');
    } catch (error: any) {
      setError('Failed to log out');
    }
  }

  if (!currentUser || !userProfile) {
    return (
      <div className="bg-game-dark text-game-light min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto bg-gray-800 p-8 rounded-lg shadow-lg">
          <h1 className="text-center text-game-yellow font-pixel text-2xl mb-6">NS-SHAFT</h1>
          <p className="text-center">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-game-dark text-game-light min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto bg-gray-800 p-8 rounded-lg shadow-lg">
        <h1 className="text-center text-game-yellow font-pixel text-2xl mb-6">NS-SHAFT</h1>
        <h2 className="text-center text-game-light font-pixel text-xl mb-6">Profile</h2>
        
        {error && (
          <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-500 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="flex flex-col items-center mb-6">
          {currentUser.photoURL ? (
            <img 
              src={currentUser.photoURL} 
              alt="Profile" 
              className="w-24 h-24 rounded-full mb-4"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-game-blue flex items-center justify-center mb-4">
              <span className="text-white text-2xl font-bold">
                {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
          )}
          <h3 className="text-xl font-bold">{currentUser.displayName}</h3>
          <p className="text-gray-400">{currentUser.email}</p>
        </div>
        
        <div className="bg-gray-700 p-4 rounded-lg mb-6">
          <h4 className="font-pixel text-game-yellow mb-4">Game Stats</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400">High Score</p>
              <p className="text-xl font-bold">{userProfile.highScore}</p>
            </div>
            <div>
              <p className="text-gray-400">Games Played</p>
              <p className="text-xl font-bold">{userProfile.gamesPlayed}</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-2 bg-game-blue hover:bg-opacity-80 text-white font-pixel rounded-lg transition-all"
          >
            Play Game
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-red-600 hover:bg-opacity-80 text-white font-pixel rounded-lg transition-all"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile; 