import React from 'react';
import PitchCourseInput from '../PitchCourseInput';
import RunnerStatus from '../RunnerStatus';
import PlayResultPanel from '../PlayResultPanel';
import RunnerMovementInput from '../RunnerMovementInput';

interface CenterPanelProps {
  activeTab: 'pitch' | 'runner';
  setActiveTab: (tab: 'pitch' | 'runner') => void;
  showRunnerMovement: boolean;
  showPlayResult: boolean;
  currentBSO: { b: number; s: number; o: number };
  runners: { '1': string | null; '2': string | null; '3': string | null };
  currentBatterId?: string;
  battingResultForMovement: string;
  onPlayResultComplete: () => void;
  onInplayCommit: () => void;
  onStrikeoutCommit: (isSwinging: boolean) => void;
  onWalkCommit: () => void;
  onRunnerMovement: (battingResult: string, position: string) => void;
  onRunnersChange: (next: { '1': string | null; '2': string | null; '3': string | null }) => void;
  onCountsChange: (next: { b?: number; s?: number; o?: number }) => void;
  onCountsReset: () => void;
  strikeoutType: 'swinging' | 'looking' | null;
}

const CenterPanel: React.FC<CenterPanelProps> = ({
  activeTab,
  setActiveTab,
  showRunnerMovement,
  showPlayResult,
  currentBSO,
  runners,
  currentBatterId,
  battingResultForMovement,
  onPlayResultComplete,
  onInplayCommit,
  onStrikeoutCommit,
  onWalkCommit,
  onRunnerMovement,
  onRunnersChange,
  onCountsChange,
  onCountsReset,
  strikeoutType,
}) => {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      {showRunnerMovement ? (
        <RunnerMovementInput
          onComplete={onPlayResultComplete}
          onCancel={onPlayResultComplete}
          initialRunners={runners}
          battingResult={battingResultForMovement}
          batterId={currentBatterId}
          initialOuts={currentBSO.o}
        />
      ) : !showPlayResult ? (
        <>
          <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #dee2e6', marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setActiveTab('pitch')}
              style={{
                padding: '12px 20px',
                background: activeTab === 'pitch' ? '#4c6ef5' : 'transparent',
                color: activeTab === 'pitch' ? '#fff' : '#495057',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 15,
                transition: 'all 0.2s ease',
              }}
            >
              コース・球種
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('runner')}
              style={{
                padding: '12px 20px',
                background: activeTab === 'runner' ? '#4c6ef5' : 'transparent',
                color: activeTab === 'runner' ? '#fff' : '#495057',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 15,
                transition: 'all 0.2s ease',
              }}
            >
              ランナー
            </button>
          </div>
          <div>
            {activeTab === 'pitch' ? (
              <PitchCourseInput
                bso={currentBSO}
                runners={runners}
                onInplayCommit={onInplayCommit}
                onStrikeoutCommit={onStrikeoutCommit}
                onWalkCommit={onWalkCommit}
                onCountsChange={onCountsChange}
                onCountsReset={onCountsReset}
              />
            ) : (
              <RunnerStatus onChange={onRunnersChange} />
            )}
          </div>
        </>
      ) : (
        <PlayResultPanel
          onComplete={onPlayResultComplete}
          strikeoutType={strikeoutType}
          onRunnerMovement={onRunnerMovement}
          currentRunners={runners}
          currentOuts={currentBSO.o}
        />
      )}
    </div>
  );
};

export default CenterPanel;
