import React, { useEffect, useState } from 'react';
import { ACTIVITY_LABELS, ACTIVITY_TYPES, ActivityType, WellnessWeights } from '../utils/wellness';

type WellnessModalProps = {
  isOpen: boolean;
  defaultWeights: WellnessWeights;
  weekWeights: WellnessWeights;
  onCancel: () => void;
  onSave: (defaultWeights: WellnessWeights, weekWeights: WellnessWeights) => void;
};

const WeightInputs: React.FC<{
  weights: WellnessWeights;
  onChange: (activity: ActivityType, value: number) => void;
}> = ({ weights, onChange }) => (
  <div className="wellness-weight-grid">
    {ACTIVITY_TYPES.map(activity => (
      <label key={activity} className="wellness-weight-row">
        <span>{ACTIVITY_LABELS[activity]}</span>
        <input
          type="number"
          min={0}
          value={weights[activity]}
          onChange={(e) => onChange(activity, Math.max(0, parseInt(e.target.value, 10) || 0))}
        />
      </label>
    ))}
  </div>
);

const WellnessModal: React.FC<WellnessModalProps> = ({
  isOpen,
  defaultWeights,
  weekWeights,
  onCancel,
  onSave,
}) => {
  const [localDefaultWeights, setLocalDefaultWeights] = useState<WellnessWeights>(defaultWeights);
  const [localWeekWeights, setLocalWeekWeights] = useState<WellnessWeights>(weekWeights);

  useEffect(() => {
    if (isOpen) {
      setLocalDefaultWeights(defaultWeights);
      setLocalWeekWeights(weekWeights);
    }
  }, [isOpen, defaultWeights, weekWeights]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Wellness Weights</h3>

        <p className="wellness-modal-hint">Default weights (used for future weeks)</p>
        <WeightInputs
          weights={localDefaultWeights}
          onChange={(activity, value) =>
            setLocalDefaultWeights(prev => ({ ...prev, [activity]: value }))
          }
        />

        <p className="wellness-modal-hint">This week's weights (re-rolls this week's plan on save)</p>
        <WeightInputs
          weights={localWeekWeights}
          onChange={(activity, value) =>
            setLocalWeekWeights(prev => ({ ...prev, [activity]: value }))
          }
        />

        <div className="modal-buttons">
          <button className="cancel-button" onClick={onCancel}>Cancel</button>
          <button
            className="save-button"
            onClick={() => onSave(localDefaultWeights, localWeekWeights)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default WellnessModal;
