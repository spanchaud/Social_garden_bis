import React from 'react';
import { GardenState } from '../types';

interface GardenVisualizerProps {
  state: GardenState;
  className?: string;
}

const PlantIcon: React.FC<{ type: string, delay: number }> = ({ type, delay }) => {
  const style = { animationDelay: `${delay}ms` };
  
  // Simple SVG representations or Emoji wrappers
  switch (type) {
    case 'tournesol':
      return <div className="text-4xl absolute bottom-4 animate-grow origin-bottom" style={{ ...style, left: `${Math.random() * 80 + 10}%` }}>🌻</div>;
    case 'rose':
      return <div className="text-4xl absolute bottom-2 animate-grow origin-bottom" style={{ ...style, left: `${Math.random() * 80 + 10}%` }}>🌹</div>;
    case 'chêne':
      return <div className="text-6xl absolute bottom-4 animate-grow origin-bottom" style={{ ...style, left: `${Math.random() * 80 + 10}%` }}>🌳</div>;
    case 'bambou':
      return <div className="text-5xl absolute bottom-2 animate-grow origin-bottom" style={{ ...style, left: `${Math.random() * 80 + 10}%` }}>🎍</div>;
    case 'lavande':
      return <div className="text-3xl absolute bottom-1 animate-grow origin-bottom" style={{ ...style, left: `${Math.random() * 80 + 10}%` }}>🪻</div>;
    default:
      return <div className="text-3xl absolute bottom-2 animate-grow origin-bottom" style={{ ...style, left: `${Math.random() * 80 + 10}%` }}>🌱</div>;
  }
};

const WeatherOverlay = ({ meteo }: { meteo: GardenState['meteo'] }) => {
  if (meteo === 'pluie') {
    return (
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-slate-400 z-10 flex flex-col justify-around">
         {/* Rain simulation with simple divs */}
         {[...Array(20)].map((_, i) => (
             <div key={i} className="w-0.5 h-4 bg-blue-300 animate-pulse absolute" style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }}></div>
         ))}
      </div>
    );
  }
  if (meteo === 'orage') {
     return <div className="absolute inset-0 bg-slate-700/40 z-10 mix-blend-multiply"></div>
  }
  return null;
};

const Sun = ({ meteo }: { meteo: GardenState['meteo'] }) => {
  if (meteo === 'orage' || meteo === 'pluie') return null;
  return (
    <div className={`absolute top-10 right-10 w-16 h-16 bg-yellow-300 rounded-full blur-xl animate-pulse-slow ${meteo === 'nuages' ? 'opacity-50' : 'opacity-100'}`}></div>
  );
};

export const GardenVisualizer: React.FC<GardenVisualizerProps> = ({ state, className }) => {
  const bgColor = 
    state.meteo === 'soleil' ? 'bg-sky-100' :
    state.meteo === 'nuages' ? 'bg-slate-200' :
    state.meteo === 'pluie' ? 'bg-slate-300' :
    'bg-slate-400';

  return (
    <div className={`relative w-full h-64 md:h-80 rounded-2xl overflow-hidden shadow-inner transition-colors duration-1000 ${bgColor} ${className}`}>
      
      {/* Sky Elements */}
      <Sun meteo={state.meteo} />
      <WeatherOverlay meteo={state.meteo} />
      
      {/* Clouds */}
      {(state.meteo === 'nuages' || state.meteo === 'pluie') && (
        <>
          <div className="absolute top-8 left-1/4 text-6xl text-white opacity-80 animate-float">☁️</div>
          <div className="absolute top-16 right-1/3 text-6xl text-white opacity-60 animate-float" style={{ animationDelay: '2s' }}>☁️</div>
        </>
      )}

      {/* Ground */}
      <div className="absolute bottom-0 w-full h-12 bg-sage-300 rounded-b-2xl"></div>
      
      {/* Compost Indicator */}
      {state.mauvaises_herbes_compostees && (
        <div className="absolute bottom-4 right-4 text-xs bg-terra-100 text-terra-800 px-2 py-1 rounded-full shadow-sm animate-grow">
          🍂 Conflit composté
        </div>
      )}

      {/* Plants */}
      <div className="absolute inset-x-0 bottom-6 h-32 flex justify-center pointer-events-none">
        {state.plantes?.map((plant, idx) => (
          <PlantIcon key={`${plant}-${idx}`} type={plant} delay={idx * 300} />
        ))}
      </div>
    </div>
  );
};
