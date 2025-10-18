import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';

const GameContext = createContext();

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};

const MAX_LEVELS = 30;
const INITIAL_LIVES = 10;
const LIFE_REGEN_MINUTES = 1;

export const GameProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => localStorage.getItem('gameLanguage') || 'ro');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('gameDarkMode') === 'true');
  const [lives, setLives] = useState(() => Number(localStorage.getItem('gameLives')) || INITIAL_LIVES);
  const [lastLifeLoss, setLastLifeLoss] = useState(() => Number(localStorage.getItem('gameLastLifeLoss')) || Date.now());
  const [mapProgress, setMapProgress] = useState(() => JSON.parse(localStorage.getItem('gameMapProgress') || '{}'));
  const [leaderboard, setLeaderboard] = useState(() => JSON.parse(localStorage.getItem('gameLeaderboard') || '[]'));
  const [highscore, setHighscore] = useState(() => Number(localStorage.getItem('gameHighscore')) || 0);
  const [currentScreen, setCurrentScreen] = useState('map'); // 'map' or 'game'
  const [currentLevel, setCurrentLevel] = useState(1);

  const t = translations[language];

  // Save to localStorage when values change
  useEffect(() => {
    localStorage.setItem('gameLanguage', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('gameDarkMode', darkMode);
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('gameLives', lives);
  }, [lives]);

  useEffect(() => {
    localStorage.setItem('gameLastLifeLoss', lastLifeLoss);
  }, [lastLifeLoss]);

  useEffect(() => {
    localStorage.setItem('gameMapProgress', JSON.stringify(mapProgress));
  }, [mapProgress]);

  useEffect(() => {
    localStorage.setItem('gameLeaderboard', JSON.stringify(leaderboard));
  }, [leaderboard]);

  useEffect(() => {
    localStorage.setItem('gameHighscore', highscore);
  }, [highscore]);

  // Life regeneration timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (lives < INITIAL_LIVES) {
        const nextLife = lastLifeLoss + LIFE_REGEN_MINUTES * 60000;
        const now = Date.now();
        if (now >= nextLife) {
          setLives(prev => Math.min(prev + 1, INITIAL_LIVES));
          setLastLifeLoss(now);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lives, lastLifeLoss]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ro' ? 'en' : 'ro');
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const startLevel = (level) => {
    if (lives <= 0) {
      alert(t.noLives);
      return;
    }
    setLives(prev => Math.max(0, prev - 1));
    setLastLifeLoss(Date.now());
    setCurrentLevel(level);
    setCurrentScreen('game');
  };

  const updateMapProgress = (level, data) => {
    setMapProgress(prev => ({
      ...prev,
      [level]: data,
    }));
  };

  const addToLeaderboard = (level, score, stars) => {
    const newEntry = { level, score, stars, timestamp: Date.now() };
    setLeaderboard(prev => {
      const updated = [newEntry, ...prev].slice(0, 50);
      return updated.sort((a, b) => b.score - a.score);
    });
  };

  const updateHighscore = (score) => {
    if (score > highscore) {
      setHighscore(score);
    }
  };

  const goToMap = () => {
    setCurrentScreen('map');
  };

  const getLifeTimer = () => {
    if (lives >= INITIAL_LIVES) return '--:--';
    const nextLife = lastLifeLoss + LIFE_REGEN_MINUTES * 60000;
    const ms = Math.max(0, nextLife - Date.now());
    const mm = Math.floor(ms / 60000);
    const ss = Math.floor((ms % 60000) / 1000);
    return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  };

  return (
    <GameContext.Provider
      value={{
        language,
        toggleLanguage,
        darkMode,
        toggleDarkMode,
        lives,
        setLives,
        getLifeTimer,
        mapProgress,
        updateMapProgress,
        leaderboard,
        addToLeaderboard,
        highscore,
        updateHighscore,
        currentScreen,
        setCurrentScreen,
        currentLevel,
        startLevel,
        goToMap,
        t,
        MAX_LEVELS,
        INITIAL_LIVES,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
