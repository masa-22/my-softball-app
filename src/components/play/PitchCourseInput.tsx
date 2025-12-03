import React, { useState } from 'react';
import MiniScoreBoard from './common/MiniScoreBoard';
import MiniDiamondField from './pitch/MiniDiamondField';
import PitchTypeSelector, { PitchType } from './common/PitchTypeSelector';
import StrikeZoneGrid from './pitch/StrikeZoneGrid';
import PitchResultSelector from './pitch/PitchResultSelector';

// --- 型定義 ---
interface PitchData {
  id: number;
  x: number;
  y: number;
  type: PitchType;
  order: number;
  result: 'swing' | 'looking' | 'ball' | 'inplay' | 'deadball';
}

// スタイル変更（タイトル削除・任意座標プロット対応）
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
  runnerDisplayGrid: {
    backgroundColor: '#fff',
    border: '1px solid #dee2e6',
    padding: '12px',
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    position: 'relative' as const,
    minHeight: '180px',
  },
  runnerTitle: {
    fontWeight: 600,
    fontSize: '13px',
    marginBottom: 8,
    color: '#495057',
  },
};

interface PitchCourseInputProps {
  onInplayCommit?: () => void;
  onStrikeoutCommit?: (isSwinging: boolean) => void;
  onWalkCommit?: () => void;
  // 追加: 親から受け取る表示用状態と更新コールバック
  bso: { b: number; s: number; o: number };
  runners: { '1': string | null; '2': string | null; '3': string | null };
  onCountsChange: (next: { b?: number; s?: number; o?: number }) => void;
  onCountsReset: () => void;
}

const PitchCourseInput: React.FC<PitchCourseInputProps> = ({
  onInplayCommit,
  onStrikeoutCommit,
  onWalkCommit,
  bso,
  runners,
  onCountsChange,
  onCountsReset,
}) => {
  const [pitches, setPitches] = useState<PitchData[]>([]);
  const [selectedPitchType, setSelectedPitchType] = useState<PitchType>('rise');
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);
  const [pendingResult, setPendingResult] = useState<'swing' | 'looking' | 'ball' | 'inplay' | 'deadball' | ''>('');

  const handleZoneClick = (x: number, y: number) => {
    setPendingPoint({ x, y });
    setPendingResult('');
  };

  const commitPitch = () => {
    if (!pendingPoint || !pendingResult) return;
    const newPitch: PitchData = {
      id: Date.now(),
      x: pendingPoint.x,
      y: pendingPoint.y,
      type: selectedPitchType,
      order: pitches.length + 1,
      result: pendingResult,
    };
    setPitches(prev => [...prev, newPitch]);

    // 子はロジックを持たず、次のカウント更新を親へ委譲
    const currentBalls = bso.b;
    const currentStrikes = bso.s;

    // デッドボールは即座に親へ通知（フォアボール同様）
    if (pendingResult === 'deadball') {
      onWalkCommit && onWalkCommit();
      setPendingPoint(null);
      setPendingResult('');
      return;
    }

    // カウントの増分は親へ提示（親がgame_statesへ反映）
    if (pendingResult === 'ball') {
      onCountsChange({ b: Math.min(3, bso.b + 1) });
      // 4球到達（3→4）は親へフォアボール遷移依頼
      if (currentBalls === 3) {
        onWalkCommit && onWalkCommit();
        setPendingPoint(null);
        setPendingResult('');
        return;
      }
    } else if (pendingResult === 'swing' || pendingResult === 'looking') {
      onCountsChange({ s: Math.min(2, bso.s + 1) });
      // 3ストライク到達（2→3）は親へ三振遷移依頼＋カウントリセット依頼
      if (currentStrikes === 2) {
        const isSwinging = pendingResult === 'swing';
        onStrikeoutCommit && onStrikeoutCommit(isSwinging);
        onCountsReset && onCountsReset();
      }
    } else if (pendingResult === 'inplay') {
      // インプレイ後の詳細は親が扱う
      onInplayCommit && onInplayCommit();
    }

    setPendingPoint(null);
    setPendingResult('');
  };

  const getPitchTypeName = (type: PitchType): string => {
    return [
      { type: 'rise', label: 'ライズ' },
      { type: 'drop', label: 'ドロップ' },
      { type: 'cut', label: 'カット' },
      { type: 'changeup', label: 'チェンジアップ' },
      { type: 'chenrai', label: 'チェンライ' },
      { type: 'slider', label: 'スライダー' },
      { type: 'unknown', label: '不明' },
    ].find(p => p.type === type)?.label || '不明';
  };

  return (
    <div style={styles.container}>
      <div style={styles.mainLayout}>
        <div style={styles.leftColumn}>
          <MiniScoreBoard bso={bso} />
          <div style={styles.runnerDisplayGrid}>
            <div style={styles.runnerTitle}>ランナー状況</div>
            <MiniDiamondField runners={runners} />
          </div>
        </div>

        <div style={styles.rightColumn}>
          <StrikeZoneGrid pitches={pitches} onClickZone={handleZoneClick}>
            {pendingPoint && (
              <PitchResultSelector
                selectedPitchType={selectedPitchType}
                pitchTypeName={getPitchTypeName(selectedPitchType)}
                selectedResult={pendingResult}
                onSelectResult={setPendingResult}
                onCommit={commitPitch}
                onCancel={() => { setPendingPoint(null); setPendingResult(''); }}
              />
            )}
          </StrikeZoneGrid>

          <PitchTypeSelector 
            selectedType={selectedPitchType} 
            onSelect={setSelectedPitchType} 
          />
        </div>
      </div>
    </div>
  );
};

export default PitchCourseInput;