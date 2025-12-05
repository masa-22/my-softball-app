import React from 'react';
import StrikeZoneGrid from './StrikeZoneGrid';
import PitchResultSelector from './PitchResultSelector';
import { PitchType } from '../../../types/PitchType';

interface StrikeZonePanelProps {
  pitches: Array<{ id: number; x: number; y: number; type: PitchType; order: number; result: 'swing' | 'looking' | 'ball' | 'inplay' | 'deadball' | 'foul'; }>;
  pendingPoint: { x: number; y: number } | null;
  pendingResult: 'swing' | 'looking' | 'ball' | 'inplay' | 'deadball' | 'foul' | '';
  selectedPitchType: PitchType;
  pitchTypeName: string;
  onZoneClick: (x: number, y: number) => void;
  onSelectResult: (r: 'swing' | 'looking' | 'ball' | 'inplay' | 'deadball' | 'foul' | '') => void;
  onCommit: () => void;
  onCancel: () => void;
}

const StrikeZonePanel: React.FC<StrikeZonePanelProps> = ({
  pitches,
  pendingPoint,
  pendingResult,
  selectedPitchType,
  pitchTypeName,
  onZoneClick,
  onSelectResult,
  onCommit,
  onCancel,
}) => {
  return (
    <StrikeZoneGrid pitches={pitches} onClickZone={onZoneClick}>
      {pendingPoint && (
        <PitchResultSelector
          selectedPitchType={selectedPitchType}
          pitchTypeName={pitchTypeName}
          selectedResult={pendingResult}
          onSelectResult={onSelectResult}
          onCommit={onCommit}
          onCancel={onCancel}
        />
      )}
    </StrikeZoneGrid>
  );
};

export default StrikeZonePanel;
