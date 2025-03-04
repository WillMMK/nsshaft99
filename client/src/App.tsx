import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Game from "@/pages/Game";
import Login from "@/components/auth/Login";
import Signup from "@/components/auth/Signup";
import ForgotPassword from "@/components/auth/ForgotPassword";
import Profile from "@/components/auth/Profile";
import NavBar from "@/components/layout/NavBar";
import { AuthProvider } from "@/contexts/AuthContext";
import { MultiplayerProvider } from "@/contexts/MultiplayerContext";
import { GameStateProvider } from "@/contexts/GameStateContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import SocketTest from "@/pages/SocketTest";

function Router() {
  return (
    <>
      <NavBar />
      <Switch>
        <Route path="/" component={() => (
          <ProtectedRoute>
            <Game />
          </ProtectedRoute>
        )} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/profile" component={() => (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        )} />
        <Route path="/socket-test" component={SocketTest} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MultiplayerProvider>
          <GameStateProvider>
            <Router />
            <Toaster />
          </GameStateProvider>
        </MultiplayerProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
