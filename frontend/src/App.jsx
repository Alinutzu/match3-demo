import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import LevelMap from './components/LevelMap';
import GameBoard from './components/GameBoard';

const AppContent = () => {
  const { currentScreen } = useGame();

  return (
    <div className="min-h-screen">
      {currentScreen === 'map' ? <LevelMap /> : <GameBoard />}
    </div>
  );
};

function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

export default App;
