import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '../context/GameContext';
import Gem from './Gem';
import {
  initializeGrid,
  detectMatches,
  hasAnyMatch,
  isAdjacent,
  swap,
  findValidMove,
  tryPowerCombo,
  collapseGrid,
  generateLevelData,
  getLevelTimeLimit,
  getLevelMoves,
  GEM_TYPES,
} from '../utils/gameLogic';

const GRID_SIZE = 8;

const GameBoard = () => {
  const { currentLevel, goToMap, updateMapProgress, addToLeaderboard, updateHighscore, t } = useGame();
  
  const [grid, setGrid] = useState([]);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(15);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [objectives, setObjectives] = useState([]);
  const [missionColorProgress, setMissionColorProgress] = useState(0);
  const [ingredientDelivered, setIngredientDelivered] = useState(0);
  const [lockPositions, setLockPositions] = useState([]);
  const [portalPairs, setPortalPairs] = useState([]);
  const [hintMove, setHintMove] = useState(null);
  const [fadeMap, setFadeMap] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [levelWon, setLevelWon] = useState(false);
  
  const audioRef = useRef({
    swap: new Audio('/sounds/swap.mp3'),
    match: new Audio('/sounds/match.mp3'),
    pop: new Audio('/sounds/pop.mp3'),
    explosion: new Audio('/sounds/explosion.mp3'),
    win: new Audio('/sounds/win.mp3'),
    fail: new Audio('/sounds/fail.mp3'),
  });

  const playSound = (soundName) => {
    try {
      const audio = audioRef.current[soundName];
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log('Audio play failed:', e));
      }
    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  // Initialize level
  useEffect(() => {
    const objs = generateLevelData(currentLevel);
    setObjectives(objs);
    setMoves(getLevelMoves(currentLevel));
    setTimeLeft(getLevelTimeLimit(currentLevel));
    setScore(0);
    setMissionColorProgress(0);
    setIngredientDelivered(0);
    setGameOver(false);
    setShowEndModal(false);
    
    const ingredientType = GEM_TYPES.INGREDIENT;
    const ingredientCount = objs.find(o => o.type === 'ingredient')?.count || 0;
    
    const { grid: newGrid, portalPairs: pp, lockPositions: lp } = initializeGrid(
      GRID_SIZE,
      currentLevel,
      ingredientType,
      ingredientCount
    );
    
    setGrid(newGrid);
    setPortalPairs(pp);
    setLockPositions(lp);
    setFadeMap(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(1)));
    
    // Check for initial matches
    setTimeout(() => {
      const { toRemove, powerups } = detectMatches(newGrid, GRID_SIZE);
      if (hasAnyMatch(toRemove, GRID_SIZE)) {
        setTimeout(() => processCascade(newGrid), 200);
      }
    }, 100);
  }, [currentLevel]);

  // Timer
  useEffect(() => {
    if (gameOver || paused) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameOver(true);
          setLevelWon(false);
          setShowEndModal(true);
          playSound('fail');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameOver, paused]);

  // Hint system
  useEffect(() => {
    if (gameOver || isProcessing) return;
    
    const hintTimer = setTimeout(() => {
      const move = findValidMove([...grid.map(row => [...row])], GRID_SIZE);
      setHintMove(move);
    }, 5000);

    return () => clearTimeout(hintTimer);
  }, [grid, gameOver, isProcessing]);

  const processCascade = useCallback((currentGrid) => {
    setIsProcessing(true);
    const newGrid = currentGrid.map(row => [...row]);
    const { toRemove, powerups } = detectMatches(newGrid, GRID_SIZE);
    
    if (hasAnyMatch(toRemove, GRID_SIZE)) {
      // Animate removal
      const newFadeMap = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(1));
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          if (toRemove[y][x]) {
            newFadeMap[y][x] = 0;
          }
        }
      }
      setFadeMap(newFadeMap);
      
      playSound('match');
      
      setTimeout(() => {
        // Remove matches
        let removed = 0;
        let colorRemoved = 0;
        const missionColor = objectives.find(o => o.type === 'color')?.color;
        
        for (let y = 0; y < GRID_SIZE; y++) {
          for (let x = 0; x < GRID_SIZE; x++) {
            if (toRemove[y][x]) {
              if (newGrid[y][x] === missionColor) colorRemoved++;
              if (newGrid[y][x] !== GEM_TYPES.INGREDIENT) {
                newGrid[y][x] = -1;
                removed++;
              }
            }
          }
        }
        
        // Place powerups
        for (const p of powerups) {
          newGrid[p.y][p.x] = p.type;
        }
        
        setScore(prev => prev + removed * 10);
        setMissionColorProgress(prev => prev + colorRemoved);
        
        if (removed >= 10) playSound('pop');
        if (powerups.length) playSound('explosion');
        
        // Unlock locks
        const newLockPositions = [...lockPositions];
        for (let i = newLockPositions.length - 1; i >= 0; i--) {
          const [ly, lx] = newLockPositions[i];
          let unlocked = false;
          
          for (const [dy, dx] of [[0,1], [1,0], [0,-1], [-1,0]]) {
            const yy = ly + dy;
            const xx = lx + dx;
            if (yy >= 0 && yy < GRID_SIZE && xx >= 0 && xx < GRID_SIZE) {
              if (toRemove[yy][xx]) {
                unlocked = true;
                break;
              }
            }
          }
          
          if (unlocked) {
            newLockPositions.splice(i, 1);
            newGrid[ly][lx] = Math.floor(Math.random() * 6);
            playSound('explosion');
          }
        }
        setLockPositions(newLockPositions);
        
        // Collapse grid
        const collapsedGrid = collapseGrid(newGrid, GRID_SIZE, GEM_TYPES.INGREDIENT, newLockPositions);
        
        // Check ingredient delivery
        let newIngredientDelivered = ingredientDelivered;
        for (let x = 0; x < GRID_SIZE; x++) {
          if (collapsedGrid[GRID_SIZE - 1][x] === GEM_TYPES.INGREDIENT) {
            newIngredientDelivered++;
            collapsedGrid[GRID_SIZE - 1][x] = Math.floor(Math.random() * 6);
            playSound('pop');
          }
        }
        setIngredientDelivered(newIngredientDelivered);
        
        setGrid(collapsedGrid);
        setFadeMap(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(1)));
        
        setTimeout(() => {
          processCascade(collapsedGrid);
        }, 300);
      }, 300);
    } else {
      // No more matches
      const validMove = findValidMove([...newGrid.map(row => [...row])], GRID_SIZE);
      if (!validMove) {
        alert(t.noMoves);
        playSound('fail');
        // Reinitialize grid
        const { grid: freshGrid, portalPairs: pp, lockPositions: lp } = initializeGrid(
          GRID_SIZE,
          currentLevel,
          GEM_TYPES.INGREDIENT,
          objectives.find(o => o.type === 'ingredient')?.count || 0
        );
        setGrid(freshGrid);
        setPortalPairs(pp);
        setLockPositions(lp);
      }
      setIsProcessing(false);
    }
  }, [objectives, ingredientDelivered, lockPositions, t, currentLevel]);

  const handleGemClick = (x, y) => {
    if (gameOver || paused || isProcessing) return;
    
    setHintMove(null);
    
    const gemType = grid[y][x];
    
    // Click on powerup
    if (gemType >= GEM_TYPES.STRIPED_H && gemType <= GEM_TYPES.LIGHTNING) {
      activatePowerup(x, y);
      return;
    }
    
    // Can't click portal or locked
    if (gemType === GEM_TYPES.PORTAL || gemType === GEM_TYPES.LOCKED) return;
    
    if (selected) {
      if (isAdjacent(selected.x, selected.y, x, y)) {
        // Try swap
        const newGrid = grid.map(row => [...row]);
        
        // Check for powerup combo
        const comboResult = tryPowerCombo(newGrid, selected.x, selected.y, x, y, GRID_SIZE);
        if (comboResult.combo) {
          playSound('explosion');
          setGrid(newGrid);
          setScore(prev => prev + comboResult.score);
          setMoves(prev => prev - 1);
          setSelected(null);
          setTimeout(() => processCascade(newGrid), 200);
          return;
        }
        
        // Normal swap
        swap(newGrid, selected.x, selected.y, x, y);
        playSound('swap');
        setGrid(newGrid);
        
        setTimeout(() => {
          const { toRemove } = detectMatches(newGrid, GRID_SIZE);
          
          if (!hasAnyMatch(toRemove, GRID_SIZE)) {
            // Invalid move - swap back
            swap(newGrid, selected.x, selected.y, x, y);
            setGrid(newGrid);
            playSound('fail');
            setSelected(null);
          } else {
            // Valid move
            setMoves(prev => {
              const newMoves = prev - 1;
              if (newMoves <= 0) {
                setGameOver(true);
                setLevelWon(checkLevelComplete());
                setShowEndModal(true);
                if (checkLevelComplete()) {
                  playSound('win');
                } else {
                  playSound('fail');
                }
              }
              return newMoves;
            });
            setSelected(null);
            setTimeout(() => processCascade(newGrid), 200);
          }
        }, 250);
      } else {
        setSelected({ x, y });
      }
    } else {
      setSelected({ x, y });
    }
  };

  const activatePowerup = (x, y) => {
    const newGrid = grid.map(row => [...row]);
    const powerupType = newGrid[y][x];
    
    if (powerupType === GEM_TYPES.STRIPED_H) {
      for (let i = 0; i < GRID_SIZE; i++) {
        if (newGrid[y][i] !== GEM_TYPES.INGREDIENT) {
          newGrid[y][i] = -1;
        }
      }
      playSound('explosion');
      setScore(prev => prev + GRID_SIZE * 10);
    } else if (powerupType === GEM_TYPES.STRIPED_V) {
      for (let i = 0; i < GRID_SIZE; i++) {
        if (newGrid[i][x] !== GEM_TYPES.INGREDIENT) {
          newGrid[i][x] = -1;
        }
      }
      playSound('explosion');
      setScore(prev => prev + GRID_SIZE * 10);
    } else if (powerupType === GEM_TYPES.BOMB) {
      const color = prompt(t.choosePowerup + ' (0-5)');
      const colorNum = Number(color);
      if (!isNaN(colorNum) && colorNum >= 0 && colorNum <= 5) {
        for (let yy = 0; yy < GRID_SIZE; yy++) {
          for (let xx = 0; xx < GRID_SIZE; xx++) {
            if (newGrid[yy][xx] === colorNum) {
              newGrid[yy][xx] = -1;
            }
          }
        }
        playSound('explosion');
        setScore(prev => prev + GRID_SIZE * GRID_SIZE * 5);
      }
    }
    
    setGrid(newGrid);
    setMoves(prev => prev - 1);
    setTimeout(() => processCascade(newGrid), 200);
  };

  const checkLevelComplete = () => {
    const scoreObj = objectives.find(o => o.type === 'score');
    const colorObj = objectives.find(o => o.type === 'color');
    const ingredientObj = objectives.find(o => o.type === 'ingredient');
    
    const scoreComplete = !scoreObj || score >= scoreObj.target;
    const colorComplete = !colorObj || missionColorProgress >= colorObj.target;
    const ingredientComplete = !ingredientObj || ingredientDelivered >= ingredientObj.count;
    
    return scoreComplete && colorComplete && ingredientComplete;
  };

  const getStars = () => {
    const stars = [];
    const scoreObj = objectives.find(o => o.type === 'score');
    const colorObj = objectives.find(o => o.type === 'color');
    const ingredientObj = objectives.find(o => o.type === 'ingredient');
    
    if (scoreObj && score >= scoreObj.target) stars.push(1);
    if (colorObj && missionColorProgress >= colorObj.target) stars.push(2);
    if (ingredientObj && ingredientDelivered >= ingredientObj.count) stars.push(3);
    
    return stars.length;
  };

  const handleEndModalClose = () => {
    const won = checkLevelComplete();
    const stars = getStars();
    
    updateMapProgress(currentLevel, { win: won, stars });
    addToLeaderboard(currentLevel, score, stars);
    updateHighscore(score);
    
    if (won) {
      // Go to next level or map
      goToMap();
    } else {
      // Restart level
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-white text-center mb-6">
          <h1 className="text-4xl font-bold mb-2">{t.level} {currentLevel}</h1>
          <div className="flex justify-center gap-8 text-lg">
            <div>{t.score}: <span className="font-bold">{score}</span></div>
            <div>{t.moves}: <span className="font-bold">{moves}</span></div>
            <div>{t.timeLeft}: <span className="font-bold">{timeLeft}s</span></div>
          </div>
          <div className="mt-2 text-sm">
            {objectives.map((obj, idx) => (
              <div key={idx}>
                {obj.type === 'score' && `${t.scoreTarget}: ${obj.target}`}
                {obj.type === 'color' && `${t.collectTarget} ${obj.target} gems (${missionColorProgress}/${obj.target})`}
                {obj.type === 'ingredient' && `${t.deliverIngredients} ${obj.count} ${t.down} (${ingredientDelivered}/${obj.count})`}
              </div>
            ))}
          </div>
          <div className="mt-2">
            {t.stars}: {'⭐'.repeat(getStars())}
          </div>
        </div>

        {/* Game Board */}
        <div className="flex justify-center">
          <div
            className="grid gap-1 bg-purple-800/50 p-4 rounded-lg shadow-2xl"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
              width: 'fit-content',
            }}
          >
            {grid.map((row, y) =>
              row.map((gem, x) => (
                <div
                  key={`${x}-${y}`}
                  className="w-16 h-16 bg-purple-900/30 rounded cursor-pointer hover:bg-purple-800/50 transition-all"
                  onClick={() => handleGemClick(x, y)}
                >
                  {gem !== -1 && (
                    <Gem
                      type={gem}
                      isSelected={selected?.x === x && selected?.y === y}
                      isHint={hintMove && ((hintMove.x1 === x && hintMove.y1 === y) || (hintMove.x2 === x && hintMove.y2 === y))}
                      opacity={fadeMap[y]?.[x] ?? 1}
                      scale={fadeMap[y]?.[x] ?? 1}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-lg transition-all"
          >
            {t.restart}
          </button>
          <button
            onClick={goToMap}
            className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-lg transition-all"
          >
            {t.backToMap}
          </button>
          <button
            onClick={() => setPaused(!paused)}
            className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg shadow-lg transition-all"
          >
            {paused ? t.resume : t.pause}
          </button>
        </div>

        {/* End Modal */}
        {showEndModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 shadow-2xl text-center max-w-md">
              <h2 className="text-3xl font-bold mb-4">
                {checkLevelComplete() ? '✅ ' + t.levelComplete : '❌ ' + t.levelFailed}
              </h2>
              <div className="mb-4">
                <div className="text-xl">{t.score}: <span className="font-bold">{score}</span></div>
                <div className="text-xl">{t.stars}: {'⭐'.repeat(getStars())}</div>
              </div>
              <button
                onClick={handleEndModalClose}
                className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xl shadow-lg transition-all"
              >
                {t.ok}
              </button>
            </div>
          </div>
        )}

        {/* Pause Modal */}
        {paused && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 shadow-2xl text-center">
              <h2 className="text-3xl font-bold mb-4">⏸ {t.pause}</h2>
              <button
                onClick={() => setPaused(false)}
                className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xl shadow-lg transition-all"
              >
                {t.resume}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;
