import React from 'react';
import { useGame } from '../context/GameContext';

const LevelMap = () => {
  const { 
    lives, 
    getLifeTimer, 
    mapProgress, 
    leaderboard, 
    startLevel, 
    MAX_LEVELS, 
    INITIAL_LIVES,
    toggleDarkMode,
    toggleLanguage,
    darkMode,
    language,
    t 
  } = useGame();

  const renderLevelButton = (level) => {
    const completed = mapProgress[level]?.win;
    const locked = !completed && level > 1 && !mapProgress[level - 1]?.win;
    const stars = mapProgress[level]?.stars || 0;

    return (
      <button
        key={level}
        onClick={() => !locked && lives > 0 && startLevel(level)}
        disabled={locked || lives <= 0}
        className={`
          relative px-6 py-4 rounded-lg font-bold text-lg transition-all shadow-lg
          ${completed ? 'bg-gradient-to-br from-green-400 to-green-600 text-white' : 'bg-gradient-to-br from-blue-400 to-blue-600 text-white'}
          ${locked ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-xl'}
          ${lives <= 0 ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className="flex flex-col items-center gap-1">
          <span>{t.level} {level}</span>
          {locked && <span className="text-2xl">🔒</span>}
          {completed && (
            <div className="flex gap-0.5">
              {Array.from({ length: stars }).map((_, i) => (
                <span key={i} className="text-yellow-300">⭐</span>
              ))}
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">{t.title}</h1>
          <p className="text-xl text-purple-200">{t.subtitle}</p>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={toggleDarkMode}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg transition-all"
          >
            {darkMode ? '☀️ ' + t.lightMode : '🌙 ' + t.darkMode}
          </button>
          <button
            onClick={toggleLanguage}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg transition-all"
          >
            {language === 'ro' ? '🇬🇧 English' : '🇷🇴 Română'}
          </button>
        </div>

        {/* Lives Display */}
        <div className="text-center mb-8">
          <div className="inline-block bg-white/10 backdrop-blur-md rounded-lg px-6 py-4 shadow-xl">
            <div className="text-white text-xl mb-2">
              {t.lives}: {' '}
              <span className="text-2xl">
                {'❤️'.repeat(Math.max(0, lives))}
                {'🤍'.repeat(Math.max(0, INITIAL_LIVES - lives))}
              </span>
            </div>
            <div className="text-purple-200 text-sm">
              {lives < INITIAL_LIVES && `Reîncărcare: ${getLifeTimer()}`}
            </div>
          </div>
        </div>

        {/* Level Grid */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {Array.from({ length: MAX_LEVELS }, (_, i) => i + 1).map(level =>
              renderLevelButton(level)
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 shadow-xl">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">{t.leaderboard}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="py-2 px-4 text-left">{t.level}</th>
                    <th className="py-2 px-4 text-left">{t.score}</th>
                    <th className="py-2 px-4 text-left">{t.stars}</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.slice(0, 10).map((entry, idx) => (
                    <tr key={idx} className="border-b border-white/10 hover:bg-white/5">
                      <td className="py-2 px-4">{entry.level}</td>
                      <td className="py-2 px-4">{entry.score}</td>
                      <td className="py-2 px-4">{'⭐'.repeat(entry.stars)}</td>
                    </tr>
                  ))}
                  {leaderboard.length === 0 && (
                    <tr>
                      <td colSpan="3" className="py-4 text-center text-purple-200">
                        No scores yet. Start playing!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelMap;
