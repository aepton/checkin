import React, { useEffect, useState } from 'react';
import {
  ACTIVITY_LABELS,
  ACTIVITY_TYPES,
  ActivityType,
  MAX_WEEK_TASK_CAP,
  MIN_WEEK_TASK_CAP,
  WellnessWeights,
} from '../utils/wellness';

type WellnessModalProps = {
  isOpen: boolean;
  defaultWeights: WellnessWeights;
  defaultCap: number;
  weekWeights: WellnessWeights;
  weekCap: number;
  onCancel: () => void;
  onSave: (defaultWeights: WellnessWeights, defaultCap: number, weekWeights: WellnessWeights, weekCap: number) => void;
};

const MAX_WEIGHT = 10;

const WeightInputs: React.FC<{
  weights: WellnessWeights;
  onChange: (activity: ActivityType, value: number) => void;
}> = ({ weights, onChange }) => (
  <div className="wellness-weight-grid">
    {ACTIVITY_TYPES.map(activity => (
      <label key={activity} className="wellness-weight-row">
        <span className="wellness-weight-label">{ACTIVITY_LABELS[activity]}</span>
        <input
          type="range"
          min={0}
          max={MAX_WEIGHT}
          step={1}
          value={weights[activity]}
          onChange={(e) => onChange(activity, parseInt(e.target.value, 10))}
        />
        <span className="wellness-weight-value">{weights[activity]}</span>
      </label>
    ))}
  </div>
);

const CapInput: React.FC<{
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
  defaultWeights,
  defaultCap,
  weekWeights,
  weekCap,
  onCancel,
  onSave,
}) => {
  const [localDefaultWeights, setLocalDefaultWeights] = useState<WellnessWeights>(defaultWeights);
  const [localDefaultCap, setLocalDefaultCap] = useState<number>(defaultCap);
  const [localWeekWeights, setLocalWeekWeights] = useState<WellnessWeights>(weekWeights);
  const [localWeekCap, setLocalWeekCap] = useState<number>(weekCap);

  useEffect(() => {
    if (isOpen) {
      setLocalDefaultWeights(defaultWeights);
      setLocalDefaultCap(defaultCap);
      setLocalWeekWeights(weekWeights);
      setLocalWeekCap(weekCap);
    }
  }, [isOpen, defaultWeights, defaultCap, weekWeights, weekCap]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Wellness Weights</h3>

        <p className="wellness-modal-hint">Default weights &amp; cap (used for future weeks)</p>
        <WeightInputs
          weights={localDefaultWeights}
          onChange={(activity, value) =>
            setLocalDefaultWeights(prev => ({ ...prev, [activity]: value }))
          }
        />
        <CapInput cap={localDefaultCap} onChange={setLocalDefaultCap} />

        <p className="wellness-modal-hint">
          This week's weights &amp; cap &mdash; used for today's task if you hit "Save Today's Wellness Tasks",
          and for the rest of this week's automatic planning. Saving here re-rolls this week's plan.
        </p>
        <WeightInputs
          weights={localWeekWeights}
          onChange={(activity, value) =>
            setLocalWeekWeights(prev => ({ ...prev, [activity]: value }))
          }
        />
        <CapInput cap={localWeekCap} onChange={setLocalWeekCap} />

        <div className="modal-buttons">
          <button className="cancel-button" onClick={onCancel}>Cancel</button>
          <button
            className="save-button"
            onClick={() => onSave(localDefaultWeights, localDefaultCap, localWeekWeights, localWeekCap)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default WellnessModal;
