import React, { useState, useEffect } from 'react';
import PitchTypeSelector from './common/PitchTypeSelector';
import { PitchType } from '../../types/PitchType';
import PitchLeftColumn from './pitch/PitchLeftColumn';
import StrikeZonePanel from './pitch/StrikeZonePanel';
import StrikeZoneGrid from './pitch/StrikeZoneGrid';
import PitchResultSelector from './pitch/PitchResultSelector';
import { PitchData } from '../../types/PitchData';
import { ZONE_WIDTH, ZONE_HEIGHT } from '../../utils/scoreKeeping';

const styles = {
  container: {
    fontFamily: '"Hiragino Kaku Gothic ProN", "Meiryo", sans-serif',
    padding: '0',
    maxWidth: '980px',
    margin: '0 auto',
  },
  mainLayout: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    width: '220px',
  },
  rightColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    maxWidth: '308px',
  },
};

interface PitchCourseInputProps {
  onInplayCommit?: () => void;
  onStrikeoutCommit?: (isSwinging: boolean) => void;
  onWalkCommit?: (isDeadball?: boolean) => void;
  bso: { b: number; s: number; o: number };
  runners: { '1': string | null; '2': string | null; '3': string | null };
  onCountsChange: (next: { b?: number; s?: number; o?: number }) => void;
  onCountsReset: () => void;
  pitches?: PitchData[];
  onPitchesChange?: React.Dispatch<React.SetStateAction<PitchData[]>>;
  pitchInputMode?: 'full' | 'simple';
}

const PitchCourseInput: React.FC<PitchCourseInputProps> = ({
  onInplayCommit,
  onStrikeoutCommit,
  onWalkCommit,
  bso,
  runners,
  onCountsChange,
  onCountsReset,
  pitches = [],
  onPitchesChange,
  pitchInputMode = 'full',
}) => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [selectedPitchType, setSelectedPitchType] = useState<PitchType>('rise');
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);
  const [pendingResult, setPendingResult] = useState<'swing' | 'looking' | 'ball' | 'inplay' | 'deadball' | 'foul' | ''>('');
  const [simplePendingResult, setSimplePendingResult] = useState<'swing' | 'looking' | 'ball' | 'inplay' | 'deadball' | 'foul' | ''>('');

  useEffect(() => {
    setPendingPoint(null);
    setPendingResult('');
    setSimplePendingResult('');
  }, [pitchInputMode]);

  const handleZoneClick = (x: number, y: number) => {
    setPendingPoint({ x, y });
    setPendingResult('');
  };

  const appendPitchAndApplyResult = (
    newPitch: PitchData,
    result: 'swing' | 'looking' | 'ball' | 'inplay' | 'deadball' | 'foul'
  ) => {
    if (onPitchesChange) {
      onPitchesChange((prev) => [...prev, newPitch]);
    }

    const currentBalls = bso.b;
    const currentStrikes = bso.s;

    if (result === 'deadball') {
      onCountsReset && onCountsReset();
      onWalkCommit && onWalkCommit(true);
      return;
    }

    if (result === 'ball') {
      onCountsChange({ b: Math.min(3, bso.b + 1) });
      if (currentBalls === 3) {
        onWalkCommit && onWalkCommit();
      }
      return;
    }

    if (result === 'swing' || result === 'looking') {
      onCountsChange({ s: Math.min(2, bso.s + 1) });
      if (currentStrikes === 2) {
        const isSwinging = result === 'swing';
        onStrikeoutCommit && onStrikeoutCommit(isSwinging);
        onCountsReset && onCountsReset();
      }
      return;
    }

    if (result === 'foul') {
      if (currentStrikes < 2) {
        onCountsChange({ s: Math.min(2, bso.s + 1) });
      }
      return;
    }

    if (result === 'inplay') {
      onInplayCommit && onInplayCommit();
    }
  };

  const commitPitch = () => {
    if (!pendingPoint || !pendingResult) return;
    const newPitch: PitchData = {
      id: Date.now(),
      x: pendingPoint.x,
      y: pendingPoint.y,
      type: selectedPitchType,
      order: pitches.length + 1,
      result: pendingResult as PitchData['result'],
    };

    appendPitchAndApplyResult(newPitch, pendingResult);

    if (pendingResult === 'deadball') {
      setPendingPoint(null);
      setPendingResult('');
      return;
    }
    if (pendingResult === 'ball' && bso.b === 3) {
      setPendingPoint(null);
      setPendingResult('');
      return;
    }

    setPendingPoint(null);
    setPendingResult('');
  };

  const commitSimplePitch = () => {
    if (!simplePendingResult) return;
    const cx = ZONE_WIDTH / 2;
    const cy = ZONE_HEIGHT / 2;
    const newPitch: PitchData = {
      id: Date.now(),
      x: cx,
      y: cy,
      type: 'unknown',
      order: pitches.length + 1,
      result: simplePendingResult as PitchData['result'],
      simpleInput: true,
    };
    appendPitchAndApplyResult(newPitch, simplePendingResult);

    if (simplePendingResult === 'deadball') {
      setSimplePendingResult('');
      return;
    }
    if (simplePendingResult === 'ball' && bso.b === 3) {
      setSimplePendingResult('');
      return;
    }

    setSimplePendingResult('');
  };

  const getPitchTypeName = (type: PitchType): string => {
    return (
      [
        { type: 'rise', label: 'ライズ' },
        { type: 'drop', label: 'ドロップ' },
        { type: 'cut', label: 'カット' },
        { type: 'changeup', label: 'チェンジアップ' },
        { type: 'chenrai', label: 'チェンライ' },
        { type: 'slider', label: 'スライダー' },
        { type: 'unknown', label: '不明' },
      ].find((p) => p.type === type)?.label || '不明'
    );
  };

  const isSimple = pitchInputMode === 'simple';

  return (
    <div style={styles.container}>
      <div style={styles.mainLayout}>
        <PitchLeftColumn bso={bso} runners={runners} />

        <div style={styles.rightColumn}>
          {isSimple ? (
            <>
              <StrikeZoneGrid
                compact={isMobile}
                pitches={pitches}
                onClickZone={() => {}}
                interactive={false}
              />
              <PitchResultSelector
                selectedPitchType="unknown"
                pitchTypeName=""
                selectedResult={simplePendingResult}
                onSelectResult={(r) => setSimplePendingResult(r)}
                onCommit={commitSimplePitch}
                onCancel={() => setSimplePendingResult('')}
                variant="inline"
                hidePitchType
              />
            </>
          ) : (
            <>
              <StrikeZonePanel
                compact={isMobile}
                pitches={pitches}
                pendingPoint={pendingPoint}
                pendingResult={pendingResult}
                selectedPitchType={selectedPitchType}
                pitchTypeName={getPitchTypeName(selectedPitchType)}
                onZoneClick={handleZoneClick}
                onSelectResult={setPendingResult}
                onCommit={commitPitch}
                onCancel={() => {
                  setPendingPoint(null);
                  setPendingResult('');
                }}
              />
              <PitchTypeSelector compact={isMobile} selectedType={selectedPitchType} onSelect={setSelectedPitchType} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PitchCourseInput;
