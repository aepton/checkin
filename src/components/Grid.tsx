import React, { useState, useEffect } from 'react';
import Tile, { TileState } from './Tile';
import { getMondayWithOffset } from '../utils/dates';
import './Grid.css';
import { AppState } from '../utils/digitalOceanStorage';

type GridProps = {
  rows: number;
  columns: number;
  states: TileState[];
  initialState?: AppState | null;
  onStateChange?: (state: AppState) => void;
  weekOffset?: number;
  onWeekChange?: (offset: number) => void;
};

const Grid: React.FC<GridProps> = ({ 
  rows, 
  columns, 
  states, 
  initialState, 
  onStateChange,
  weekOffset = 0,
  onWeekChange
}) => {
  // Generate column headings with dates for current week with offset
  const getWeekDates = () => {
    const monday = getMondayWithOffset(weekOffset);
    
    // Generate array of dates for Monday-Friday
    const weekDates = [];
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      
      const dayName = ['M', 'T', 'W', 'T', 'F'][i];
      let formattedDate;
      
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        formattedDate = `${dayName}`;
      } else {
        formattedDate = `${['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i]} ${date.getMonth() + 1}/${date.getDate()}`;
      }
      
      weekDates.push(formattedDate);
    }
    
    return weekDates;
  };
  
  const [columnHeadings, setColumnHeadings] = useState<string[]>(getWeekDates());
  
  // Update headings when window resizes or week offset changes
  useEffect(() => {
    const handleResize = () => {
      setColumnHeadings(getWeekDates());
    };
    
    // Set column headings when week offset changes
    setColumnHeadings(getWeekDates());
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [weekOffset]);
  
  // Generate row headings
  const getRowHeadings = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return ['AM🍓', 'AM🫐', 'PM🍓', 'PM🫐', '🍽️'];
    } else {
      return ['AM 🍓', 'AM 🫐', 'PM 🍓', 'PM 🫐', 'Dinner'];
    }
  };
  
  const [rowHeadings, setRowHeadings] = useState<string[]>(getRowHeadings());
  
  // Update row headings on window resize
  useEffect(() => {
    const handleResize = () => {
      setRowHeadings(getRowHeadings());
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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
  }, [initialState, rowHeadings.length, columnHeadings.length, weekOffset]);

  // Notify parent component of state changes only when gridState changes
  useEffect(() => {
    if (gridState.length > 0 && onStateChange) {
      onStateChange({ gridState });
    }
  }, [gridState]);  // Remove onStateChange from deps to prevent infinite loops

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
    <div className="grid-container-wrapper">
      {/* Navigation controls */}
      <div className="grid-navigation">
        <button 
          className="nav-button nav-prev"
          onClick={() => onWeekChange && onWeekChange(weekOffset - 1)}
          aria-label="Previous week"
        >
          ←
        </button>
        <button 
          className="nav-button nav-next"
          onClick={() => onWeekChange && onWeekChange(weekOffset + 1)}
          aria-label="Next week"
        >
          →
        </button>
      </div>

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
    </div>
  );
};

export default Grid;