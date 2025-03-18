import React, { useState, useEffect } from 'react';
import './Tile.css';

export interface TileState {
  label: string,
  color: string
}

type TileProps = {
  states: TileState[];
  initialState?: number;
  onStateChange?: (stateIndex: number) => void;
};

const Tile: React.FC<TileProps> = ({ states, initialState = 0, onStateChange }) => {
  const [currentState, setCurrentState] = useState<number>(initialState);

  // Update when initialState prop changes
  useEffect(() => {
    setCurrentState(initialState);
  }, [initialState]);

  // Notify parent component when state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange(currentState);
    }
  }, [currentState]);

  const handleClick = () => {
    setCurrentState((prevState) => (prevState + 1) % states.length);
  };

  return (
    <div className="tile" onClick={handleClick}>
      <div className="tile-content" style={{ backgroundColor: states[currentState].color }}>
        <span className="tile-letter">{states[currentState].label}</span>
      </div>
    </div>
  );
};

export default Tile;