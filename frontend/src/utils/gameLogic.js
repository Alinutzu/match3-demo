// Gem types
export const GEM_TYPES = {
  RED: 0,
  BLUE: 1,
  GREEN: 2,
  YELLOW: 3,
  PURPLE: 4,
  ORANGE: 5,
  INGREDIENT: 6,
  STRIPED_H: 7, // Horizontal striped
  STRIPED_V: 8, // Vertical striped
  BOMB: 9,      // Color bomb
  LIGHTNING: 10, // New powerup
  PORTAL: 11,
  LOCKED: 12,
};

export const GEM_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

// Generate level objectives based on difficulty
export function generateLevelData(level) {
  const objectives = [
    { type: 'score', target: 200 + level * 50 },
    { type: 'color', color: level % 6, target: 8 + level * 2 },
  ];

  // Add ingredient objective after level 3
  if (level >= 3) {
    objectives.push({
      type: 'ingredient',
      count: Math.min(1 + Math.floor(level / 2), 5),
    });
  }

  return objectives;
}

// Generate time limit for level
export function getLevelTimeLimit(level) {
  return 60 + level * 10;
}

// Generate moves for level
export function getLevelMoves(level) {
  return 15 + 5 * (level - 1);
}

// Random normal gem
export function randomNormalGem() {
  return Math.floor(Math.random() * 6);
}

// Initialize grid
export function initializeGrid(size, level, ingredientType, ingredientCount) {
  const grid = Array(size).fill(null).map(() => Array(size).fill(0));
  
  // Fill with random gems
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      grid[y][x] = randomNormalGem();
    }
  }

  // Place ingredients (if level has them)
  if (level >= 3 && ingredientCount > 0) {
    let placed = 0;
    while (placed < ingredientCount) {
      const x = Math.floor(Math.random() * size);
      const y = Math.floor(Math.random() * Math.floor(size / 2));
      if (grid[y][x] < 6) {
        grid[y][x] = ingredientType;
        placed++;
      }
    }
  }

  // Place portals
  const portalPairs = [
    [[0, 0], [size - 1, size - 1]],
    [[0, size - 1], [size - 1, 0]],
  ];

  for (const [a, b] of portalPairs) {
    grid[a[0]][a[1]] = GEM_TYPES.PORTAL;
    grid[b[0]][b[1]] = GEM_TYPES.PORTAL;
  }

  // Place locked gems
  const lockCount = 2 + level;
  const lockPositions = [];
  for (let i = 0; i < lockCount; i++) {
    const x = Math.floor(Math.random() * size);
    const y = Math.floor(Math.random() * size);
    if (grid[y][x] < 6) {
      grid[y][x] = GEM_TYPES.LOCKED;
      lockPositions.push([y, x]);
    }
  }

  // Place bonus powerups
  const bonusPowerups = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < bonusPowerups; i++) {
    const x = Math.floor(Math.random() * size);
    const y = Math.floor(Math.random() * size);
    if (grid[y][x] < 6) {
      grid[y][x] = 7 + Math.floor(Math.random() * 4); // Random powerup
    }
  }

  return { grid, portalPairs, lockPositions };
}

// Check if two positions are adjacent
export function isAdjacent(x1, y1, x2, y2) {
  return (
    (Math.abs(x1 - x2) === 1 && y1 === y2) ||
    (Math.abs(y1 - y2) === 1 && x1 === x2)
  );
}

// Swap two positions
export function swap(grid, x1, y1, x2, y2) {
  const temp = grid[y1][x1];
  grid[y1][x1] = grid[y2][x2];
  grid[y2][x2] = temp;
}

// Detect matches in the grid
export function detectMatches(grid, size) {
  const toRemove = Array(size).fill(null).map(() => Array(size).fill(false));
  const powerups = [];

  // Check horizontal matches
  for (let y = 0; y < size; y++) {
    let count = 1;
    for (let x = 1; x < size; x++) {
      if (
        grid[y][x] !== -1 &&
        grid[y][x] < 6 &&
        grid[y][x] === grid[y][x - 1]
      ) {
        count++;
      } else {
        if (count >= 3) {
          for (let k = 0; k < count; k++) {
            toRemove[y][x - k - 1] = true;
          }
          if (count === 4) powerups.push({ y, x: x - 2, type: GEM_TYPES.STRIPED_H });
          if (count === 5) powerups.push({ y, x: x - 3, type: GEM_TYPES.STRIPED_V });
          if (count >= 6) powerups.push({ y, x: x - 4, type: GEM_TYPES.BOMB });
        }
        count = 1;
      }
    }
    if (count >= 3) {
      for (let k = 0; k < count; k++) {
        toRemove[y][size - k - 1] = true;
      }
      if (count === 4) powerups.push({ y, x: size - 2, type: GEM_TYPES.STRIPED_H });
      if (count === 5) powerups.push({ y, x: size - 3, type: GEM_TYPES.STRIPED_V });
      if (count >= 6) powerups.push({ y, x: size - 4, type: GEM_TYPES.BOMB });
    }
  }

  // Check vertical matches
  for (let x = 0; x < size; x++) {
    let count = 1;
    for (let y = 1; y < size; y++) {
      if (
        grid[y][x] !== -1 &&
        grid[y][x] < 6 &&
        grid[y][x] === grid[y - 1][x]
      ) {
        count++;
      } else {
        if (count >= 3) {
          for (let k = 0; k < count; k++) {
            toRemove[y - k - 1][x] = true;
          }
          if (count === 4) powerups.push({ y: y - 2, x, type: GEM_TYPES.STRIPED_V });
          if (count === 5) powerups.push({ y: y - 3, x, type: GEM_TYPES.STRIPED_H });
          if (count >= 6) powerups.push({ y: y - 4, x, type: GEM_TYPES.BOMB });
        }
        count = 1;
      }
    }
    if (count >= 3) {
      for (let k = 0; k < count; k++) {
        toRemove[size - k - 1][x] = true;
      }
      if (count === 4) powerups.push({ y: size - 2, x, type: GEM_TYPES.STRIPED_V });
      if (count === 5) powerups.push({ y: size - 3, x, type: GEM_TYPES.STRIPED_H });
      if (count >= 6) powerups.push({ y: size - 4, x, type: GEM_TYPES.BOMB });
    }
  }

  return { toRemove, powerups };
}

// Check if there are any matches
export function hasAnyMatch(matches, size) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matches[y][x]) return true;
    }
  }
  return false;
}

// Find a valid move (for hint system)
export function findValidMove(grid, size) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x] === GEM_TYPES.PORTAL || grid[y][x] === GEM_TYPES.LOCKED) continue;

      // Try right
      if (x < size - 1 && grid[y][x + 1] >= 0 && grid[y][x + 1] !== GEM_TYPES.PORTAL && grid[y][x + 1] !== GEM_TYPES.LOCKED) {
        swap(grid, x, y, x + 1, y);
        const { toRemove } = detectMatches(grid, size);
        swap(grid, x, y, x + 1, y);
        if (hasAnyMatch(toRemove, size)) {
          return { x1: x, y1: y, x2: x + 1, y2: y };
        }
      }

      // Try down
      if (y < size - 1 && grid[y + 1][x] >= 0 && grid[y + 1][x] !== GEM_TYPES.PORTAL && grid[y + 1][x] !== GEM_TYPES.LOCKED) {
        swap(grid, x, y, x, y + 1);
        const { toRemove } = detectMatches(grid, size);
        swap(grid, x, y, x, y + 1);
        if (hasAnyMatch(toRemove, size)) {
          return { x1: x, y1: y, x2: x, y2: y + 1 };
        }
      }
    }
  }
  return null;
}

// Check if powerup combo
export function tryPowerCombo(grid, x1, y1, x2, y2, size) {
  const p1 = grid[y1][x1];
  const p2 = grid[y2][x2];

  // Striped + Striped combo
  if ((p1 === GEM_TYPES.STRIPED_H && p2 === GEM_TYPES.STRIPED_V) || 
      (p1 === GEM_TYPES.STRIPED_V && p2 === GEM_TYPES.STRIPED_H)) {
    for (let i = 0; i < size; i++) {
      grid[y1][i] = -1;
      grid[i][x2] = -1;
    }
    return { combo: true, score: size * size * 10 };
  }

  // Bomb + Striped combo
  if ((p1 === GEM_TYPES.BOMB && (p2 === GEM_TYPES.STRIPED_H || p2 === GEM_TYPES.STRIPED_V)) ||
      (p2 === GEM_TYPES.BOMB && (p1 === GEM_TYPES.STRIPED_H || p1 === GEM_TYPES.STRIPED_V))) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        grid[y][x] = -1;
      }
    }
    return { combo: true, score: size * size * 20 };
  }

  // Bomb + Bomb combo
  if (p1 === GEM_TYPES.BOMB && p2 === GEM_TYPES.BOMB) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        grid[y][x] = -1;
      }
    }
    return { combo: true, score: size * size * 25 };
  }

  return { combo: false, score: 0 };
}

// Collapse grid (gravity)
export function collapseGrid(grid, size, ingredientType, lockPositions) {
  for (let x = 0; x < size; x++) {
    const newCol = Array(size).fill(-1);
    let fillPtr = size - 1;

    // Collect items from bottom to top
    for (let y = size - 1; y >= 0; y--) {
      const val = grid[y][x];

      // Keep special items in place
      if (val === GEM_TYPES.PORTAL || val === GEM_TYPES.LOCKED || val >= 7) {
        newCol[y] = val;
      }
      // Move ingredients down
      else if (val === ingredientType) {
        while (
          fillPtr >= 0 &&
          (newCol[fillPtr] === GEM_TYPES.PORTAL ||
            newCol[fillPtr] === GEM_TYPES.LOCKED ||
            newCol[fillPtr] >= 7 ||
            newCol[fillPtr] === ingredientType)
        ) {
          fillPtr--;
        }
        if (fillPtr >= 0) {
          newCol[fillPtr] = ingredientType;
          fillPtr--;
        }
      }
      // Move normal gems down
      else if (val >= 0 && val <= 5) {
        while (
          fillPtr >= 0 &&
          (newCol[fillPtr] === GEM_TYPES.PORTAL ||
            newCol[fillPtr] === GEM_TYPES.LOCKED ||
            newCol[fillPtr] >= 7 ||
            newCol[fillPtr] === ingredientType)
        ) {
          fillPtr--;
        }
        if (fillPtr >= 0) {
          newCol[fillPtr] = val;
          fillPtr--;
        }
      }
    }

    // Keep locks in their positions
    for (const [ly, lx] of lockPositions) {
      if (lx === x) {
        newCol[ly] = GEM_TYPES.LOCKED;
      }
    }

    // Fill empty spaces with new gems
    for (let y = 0; y < size; y++) {
      if (newCol[y] === -1) {
        newCol[y] = randomNormalGem();
      }
    }

    // Copy column back to grid
    for (let y = 0; y < size; y++) {
      grid[y][x] = newCol[y];
    }
  }

  return grid;
}
