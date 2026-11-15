import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './Tile.css';

export interface TileState {
  label: string,
  color: string
}

type TileProps = {
  states: TileState[];
  initialState?: number;
  onStateChange?: (stateIndex: number) => void;
  time?: string;
  onTimeChange?: (time: string | undefined) => void;
};

const Tile: React.FC<TileProps> = ({ states, initialState = 0, onStateChange, time, onTimeChange }) => {
  const [currentState, setCurrentState] = useState<number>(initialState);
  const [isTimeModalOpen, setIsTimeModalOpen] = useState<boolean>(false);
  const [timeInputValue, setTimeInputValue] = useState<string>(time || '');

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

  const openTimeModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTimeInputValue(time || '');
    setIsTimeModalOpen(true);
  };

  const closeTimeModal = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsTimeModalOpen(false);
  };

  const handleSaveTime = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTimeChange?.(timeInputValue || undefined);
    setIsTimeModalOpen(false);
  };

  const handleClearTime = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTimeInputValue('');
    onTimeChange?.(undefined);
    setIsTimeModalOpen(false);
  };

  return (
    <div className="tile" onClick={handleClick}>
      <div className="tile-content" style={{ backgroundColor: states[currentState].color }}>
        <span className="tile-letter">{states[currentState].label}</span>
        {time && <span className="tile-time-badge">{time}</span>}
      </div>
      <button
        type="button"
        className={`tile-time-icon${time ? ' has-time' : ''}`}
        onClick={openTimeModal}
        aria-label={time ? `Edit time (${time})` : 'Set time'}
        title={time ? `Time: ${time}` : 'Set time'}
      >
        🕐
      </button>

      {isTimeModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => closeTimeModal()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-button"
              onClick={closeTimeModal}
              aria-label="Close"
              title="Close"
            >
              &times;
            </button>
            <h3>Set Time</h3>
            <input
              type="time"
              className="tile-time-input"
              value={timeInputValue}
              onChange={(e) => setTimeInputValue(e.target.value)}
              autoFocus
            />
            <div className="modal-buttons">
              <button type="button" className="pill-button pill-button-save" onClick={handleSaveTime}>
                Save
              </button>
              {time && (
                <button type="button" className="pill-button pill-button-outline" onClick={handleClearTime}>
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Tile;