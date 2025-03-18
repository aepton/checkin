import React, { useState, useEffect } from 'react';
import Tile, { TileState } from './Tile';
import './Grid.css';
import { AppState } from '../utils/digitalOceanStorage';

type GridProps = {
  rows: number;
  columns: number;
  states: TileState[];
  initialState?: AppState | null;
  onStateChange?: (state: AppState) => void;
};

const Grid: React.FC<GridProps> = ({ rows, columns, states, initialState, onStateChange }) => {
  // Generate column headings with dates for current week
  const getWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate Monday's date (go back to Monday of current week)
    const monday = new Date(today);
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // Handle Sunday as special case
    monday.setDate(today.getDate() - daysFromMonday);
    
    // Generate array of dates for Monday-Friday
    const weekDates = [];
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      
      const dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i];
      const formattedDate = `${dayName} ${date.getMonth() + 1}/${date.getDate()}`;
      
      weekDates.push(formattedDate);
    }
    
    return weekDates;
  };
  
  const columnHeadings = getWeekDates();
  
  // Generate row headings
  const rowHeadings = ['AM 🍓', 'AM 🫐', 'PM 🍓', 'PM 🫐', 'Dinner'];

  // Store the state of all tiles in the grid
  const [gridState, setGridState] = useState<
    { rowIndex: number; colIndex: number; stateIndex: number }[]
  >([]);

  // Initialize grid state
  useEffect(() => {
    if (initialState && initialState.gridState) {
      setGridState(initialState.gridState);
    } else {
      // Initialize with default values (all tiles at state 0)
      const initialGridState = [];
      for (let r = 0; r < rowHeadings.length; r++) {
        for (let c = 0; c < columnHeadings.length; c++) {
          initialGridState.push({ rowIndex: r, colIndex: c, stateIndex: 0 });
        }
      }
      setGridState(initialGridState);
    }
  }, [initialState, rowHeadings.length, columnHeadings.length]);

  // Notify parent component of state changes
  useEffect(() => {
    if (gridState.length > 0 && onStateChange) {
      onStateChange({ gridState });
    }
  }, [JSON.stringify(gridState)]);

  // Handle tile click and update the grid state
  const handleTileStateChange = (rowIndex: number, colIndex: number, newStateIndex: number) => {
    setGridState(prevState => {
      const newState = [...prevState];
      const tileIndex = newState.findIndex(
        tile => tile.rowIndex === rowIndex && tile.colIndex === colIndex
      );
      
      if (tileIndex >= 0) {
        newState[tileIndex] = { ...newState[tileIndex], stateIndex: newStateIndex };
      } else {
        newState.push({ rowIndex, colIndex, stateIndex: newStateIndex });
      }
      
      return newState;
    });
  };

  // Find the state index for a specific tile
  const getTileState = (rowIndex: number, colIndex: number): number => {
    const tile = gridState.find(t => t.rowIndex === rowIndex && t.colIndex === colIndex);
    return tile ? tile.stateIndex : 0;
  };

  return (
    <div className="grid-container">
      {/* Top row with column headings */}
      <div className="grid-row header-row">
        <div className="grid-cell corner-cell"></div>
        {columnHeadings.map((heading, index) => (
          <div key={`col-${index}`} className="grid-cell header-cell">
            {heading}
          </div>
        ))}
      </div>

      {/* Grid rows with row headings and tiles */}
      {rowHeadings.map((rowHeading, rowIndex) => (
        <div key={`row-${rowIndex}`} className="grid-row">
          <div className="grid-cell header-cell">{rowHeading}</div>
          {Array.from({ length: columns }, (_, colIndex) => (
            <div key={`tile-${rowIndex}-${colIndex}`} className="grid-cell">
              <Tile 
                states={states} 
                initialState={getTileState(rowIndex, colIndex)}
                onStateChange={(newStateIndex) => 
                  handleTileStateChange(rowIndex, colIndex, newStateIndex)
                }
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Grid;