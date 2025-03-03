import React from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="bg-game-dark text-game-light min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto bg-gray-800 p-8 rounded-lg shadow-lg">
          <h1 className="text-center text-game-yellow font-pixel text-2xl mb-6">NS-SHAFT</h1>
          <p className="text-center">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 