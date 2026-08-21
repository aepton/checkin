import React, { useEffect, useState } from 'react';
import {
  MAX_WEEK_TASK_CAP,
  MAX_WEIGHT,
  MIN_WEEK_TASK_CAP,
  MIN_WEIGHT,
  WEIGHT_STEP,
  WellnessTask,
  makeTaskId,
} from '../utils/wellness';

type WellnessModalProps = {
  isOpen: boolean;
  tasks: WellnessTask[];
  cap: number;
  onCancel: () => void;
  onSaveDefault: (tasks: WellnessTask[], cap: number) => void;
  onGenerateOneDay: (tasks: WellnessTask[], cap: number) => void;
};

// Formats a fractional weight without trailing zeros, e.g. 0.50 -> "0.5", 4.00 -> "4"
const formatWeight = (value: number): string => String(parseFloat(value.toFixed(2)));

const CapSlider: React.FC<{
  cap: number;
  onChange: (value: number) => void;
}> = ({ cap, onChange }) => (
  <div className="wellness-weight-grid wellness-cap-grid">
    <label className="wellness-weight-row">
      <span className="wellness-weight-label">Weekly task cap</span>
      <input
        type="range"
        min={MIN_WEEK_TASK_CAP}
        max={MAX_WEEK_TASK_CAP}
        step={1}
        value={cap}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
      />
      <span className="wellness-weight-value">{cap}</span>
    </label>
  </div>
);

const WellnessModal: React.FC<WellnessModalProps> = ({
  isOpen,
  tasks,
  cap,
  onCancel,
  onSaveDefault,
  onGenerateOneDay,
}) => {
  const [localTasks, setLocalTasks] = useState<WellnessTask[]>(tasks);
  const [localCap, setLocalCap] = useState<number>(cap);
  const [newTaskText, setNewTaskText] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setLocalTasks(tasks);
      setLocalCap(cap);
      setNewTaskText('');
    }
  }, [isOpen, tasks, cap]);

  if (!isOpen) return null;

  const updateTask = (id: string, updates: Partial<WellnessTask>) => {
    setLocalTasks(prev => prev.map(task => (task.id === id ? { ...task, ...updates } : task)));
  };

  const removeTask = (id: string) => {
    setLocalTasks(prev => prev.filter(task => task.id !== id));
  };

  const addTask = () => {
    const text = newTaskText.trim();
    if (!text) return;
    setLocalTasks(prev => [...prev, { id: makeTaskId(), text, weight: 1 }]);
    setNewTaskText('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button
          type="button"
          className="modal-close-button"
          onClick={onCancel}
          aria-label="Close"
          title="Close"
        >
          &times;
        </button>
        <h3>Wellness Tasks</h3>

        <p className="wellness-modal-hint">Tasks &amp; weights</p>
        <div className="wellness-custom-task-list">
          {localTasks.map(task => (
            <div key={task.id} className="wellness-custom-task-row">
              <input
                type="text"
                value={task.text}
                onChange={(e) => updateTask(task.id, { text: e.target.value })}
              />
              <input
                type="range"
                min={MIN_WEIGHT}
                max={MAX_WEIGHT}
                step={WEIGHT_STEP}
                value={task.weight}
                onChange={(e) => updateTask(task.id, { weight: parseFloat(e.target.value) })}
              />
              <span className="wellness-weight-value">{formatWeight(task.weight)}</span>
              <button
                type="button"
                className="wellness-remove-button"
                onClick={() => removeTask(task.id)}
                aria-label={`Remove ${task.text}`}
                title="Remove task"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
        <div className="wellness-add-task-row">
          <input
            type="text"
            placeholder="Add a task..."
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTask();
              }
            }}
          />
          <button type="button" className="pill-button pill-button-outline" onClick={addTask}>
            Add
          </button>
        </div>

        <CapSlider cap={localCap} onChange={setLocalCap} />

        <div className="modal-buttons">
          <button
            className="pill-button pill-button-save"
            onClick={() => onSaveDefault(localTasks, localCap)}
          >
            Save defaults
          </button>
          <button
            className="pill-button pill-button-wellness"
            onClick={() => onGenerateOneDay(localTasks, localCap)}
            title="Generate one day's worth"
          >
            Save Today
          </button>
        </div>
      </div>
    </div>
  );
};

export default WellnessModal;
