import React from 'react';
import { GEM_TYPES } from '../utils/gameLogic';

const Gem = ({ type, isSelected, isHint, opacity = 1, scale = 1 }) => {
  const getGemContent = () => {
    switch (type) {
      case GEM_TYPES.RED:
        return <GemShape color="red" />;
      case GEM_TYPES.BLUE:
        return <GemShape color="blue" />;
      case GEM_TYPES.GREEN:
        return <GemShape color="green" />;
      case GEM_TYPES.YELLOW:
        return <GemShape color="yellow" />;
      case GEM_TYPES.PURPLE:
        return <GemShape color="purple" />;
      case GEM_TYPES.ORANGE:
        return <GemShape color="orange" />;
      case GEM_TYPES.INGREDIENT:
        return <IngredientGem />;
      case GEM_TYPES.STRIPED_H:
        return <StripedGem direction="horizontal" />;
      case GEM_TYPES.STRIPED_V:
        return <StripedGem direction="vertical" />;
      case GEM_TYPES.BOMB:
        return <BombGem />;
      case GEM_TYPES.LIGHTNING:
        return <LightningGem />;
      case GEM_TYPES.PORTAL:
        return <PortalGem />;
      case GEM_TYPES.LOCKED:
        return <LockedGem />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`gem-piece relative w-full h-full flex items-center justify-center ${
        isSelected ? 'selected ring-4 ring-yellow-400' : ''
      } ${isHint ? 'ring-4 ring-yellow-300 animate-pulse' : ''}`}
      style={{
        opacity,
        transform: `scale(${scale})`,
        transition: 'all 0.2s ease',
      }}
    >
      {getGemContent()}
    </div>
  );
};

const GemShape = ({ color }) => {
  const colorClasses = {
    red: 'bg-gradient-to-br from-red-400 via-red-500 to-red-700',
    blue: 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700',
    green: 'bg-gradient-to-br from-green-400 via-green-500 to-green-700',
    yellow: 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600',
    purple: 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-700',
    orange: 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-700',
  };

  return (
    <div className={`w-12 h-12 rounded-full ${colorClasses[color]} gem-${color} animate-gem-shine shadow-lg`}>
      <div className="w-full h-full rounded-full bg-gradient-to-tr from-white/40 to-transparent" />
    </div>
  );
};

const IngredientGem = () => {
  return (
    <div className="w-12 h-12 flex items-center justify-center">
      <div className="text-4xl">🍎</div>
    </div>
  );
};

const StripedGem = ({ direction }) => {
  return (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-pink-700 relative overflow-hidden shadow-lg">
      <div className="w-full h-full rounded-full bg-gradient-to-tr from-white/40 to-transparent" />
      <div
        className={`absolute ${
          direction === 'horizontal' ? 'w-full h-2 top-5' : 'h-full w-2 left-5'
        } bg-white/80`}
      />
    </div>
  );
};

const BombGem = () => {
  return (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-800 via-gray-900 to-black relative shadow-2xl animate-pulse">
      <div className="w-full h-full rounded-full bg-gradient-to-tr from-white/20 to-transparent" />
      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-3 bg-orange-500 rounded-t-full animate-float" />
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">💥</div>
    </div>
  );
};

const LightningGem = () => {
  return (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 relative shadow-lg animate-pulse">
      <div className="w-full h-full rounded-full bg-gradient-to-tr from-white/60 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center text-2xl">⚡</div>
    </div>
  );
};

const PortalGem = () => {
  return (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 via-indigo-700 to-purple-900 relative shadow-xl animate-spin" style={{ animationDuration: '3s' }}>
      <div className="w-full h-full rounded-full border-4 border-purple-300 border-dashed animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
      <div className="absolute inset-0 flex items-center justify-center text-xl">🌀</div>
    </div>
  );
};

const LockedGem = () => {
  return (
    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-500 via-gray-600 to-gray-800 relative shadow-lg">
      <div className="w-full h-full rounded-lg bg-gradient-to-tr from-white/20 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center text-2xl">🔒</div>
    </div>
  );
};

export default Gem;
