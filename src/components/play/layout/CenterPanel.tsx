import React from 'react';
import PitchCourseInput from '../PitchCourseInput';
import RunnerStatus from '../RunnerStatus';
import PlayResultPanel from '../PlayResultPanel';
import RunnerMovementInput, { RunnerMovementResult } from '../RunnerMovementInput';
import { PitchData } from '../../../types/PitchData';

import { PitchType } from '../../../types/PitchType';

interface CenterPanelProps {
  activeTab: 'pitch' | 'runner';
  setActiveTab: (tab: 'pitch' | 'runner') => void;
  showRunnerMovement: boolean;
  showPlayResult: boolean;
  currentBSO: { b: number; s: number; o: number };
  runners: { '1': string | null; '2': string | null; '3': string | null };
  pitches?: PitchData[];
  onPitchesChange?: React.Dispatch<React.SetStateAction<PitchData[]>>;
  currentBatterId?: string;
  battingResultForMovement: string;
  onPlayResultComplete: (result?: RunnerMovementResult) => void; // 引数を追加 (キャンセル時はundefinedの可能性も考慮してOptionalにするか、キャンセルは別ハンドラにするか。元の実装はonCancel=onCompleteだったので合わせる)
  onInplayCommit: () => void;
  onStrikeoutCommit: (isSwinging: boolean) => void;
  onWalkCommit: (isDeadball?: boolean) => void;
  onRunnerMovement: (
    battingResult: string,
    details: { 
      position: string; 
      batType: string; 
      outfieldDirection: string;
      fieldingOptions?: {
        putoutPosition?: string;
        assistPosition?: string;
      };
    },
    outsAfterOverride?: number,
  ) => void;
  onRunnersChange: (next: { '1': string | null; '2': string | null; '3': string | null }) => void;
  onCountsChange: (next: { b?: number; s?: number; o?: number }) => void;
  onCountsReset: () => void;
  strikeoutType: 'swinging' | 'looking' | null;
  offensePlayers: any[];
  offenseTeamId: string | null; // 追加
  initialOuts?: number; // 追加
  presetOutsAfter?: number | null;
  battingResultLabel?: string;
  playDetails?: { 
    position: string; 
    batType: string; 
    outfieldDirection: string;
    fieldingOptions?: {
      putoutPosition?: string;
      assistPosition?: string;
    };
  }; // 追加
  // RunnerStatus制御用（親から）
  baseLabel: (b: '1' | '2' | '3' | 'home') => string;
  getRunnerName: (playerId: string | null) => string;
  onRunnerBaseClick: (base: '1' | '2' | '3' | 'home') => void;
  onAddOutClick: () => void;
  showAdvanceDialog: boolean;
  pendingAdvancements: any[]; // RunnerAdvancement[]
  onAdvanceConfirm: (results: any[]) => void; // AdvanceReasonResult[]
  showOutDialog: boolean;
  pendingOuts: any[]; // RunnerOut[]
  onOutConfirm: (results: any[]) => void; // OutReasonResult[]
  onDialogCancel: () => void;
  showAddOutDialog: boolean;
  selectedOutRunner: { runnerId: string; fromBase: '1' | '2' | '3' } | null;
  onSelectOutRunner: (runnerId: string, fromBase: '1' | '2' | '3') => void;
  onAddOutConfirm: () => void;
  onAddOutCancel: () => void;
}

const CenterPanel: React.FC<CenterPanelProps> = ({
  activeTab,
  setActiveTab,
  showRunnerMovement,
  showPlayResult,
  currentBSO,
  runners,
  pitches,
  onPitchesChange,
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
  offensePlayers,
  offenseTeamId, // 追加
  baseLabel,
  getRunnerName,
  onRunnerBaseClick,
  onAddOutClick,
  showAdvanceDialog,
  pendingAdvancements,
  onAdvanceConfirm,
  showOutDialog,
  pendingOuts,
  onOutConfirm,
  onDialogCancel,
  showAddOutDialog,
  selectedOutRunner,
  onSelectOutRunner,
  onAddOutConfirm,
  onAddOutCancel,
  initialOuts,
  presetOutsAfter,
  battingResultLabel,
  playDetails,
}) => {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      {showRunnerMovement ? (
        <RunnerMovementInput
          onComplete={onPlayResultComplete}
          onCancel={() => onPlayResultComplete(undefined)} // キャンセル時はundefinedで呼ぶ
          initialRunners={runners}
          battingResult={battingResultForMovement}
          batterId={currentBatterId}
          initialOuts={initialOuts ?? currentBSO.o}
          presetOutsAfter={presetOutsAfter ?? null}
          battingResultLabel={battingResultLabel}
          pitches={pitches}
          offenseTeamId={offenseTeamId} // 追加
          playDetails={playDetails} // 追加
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
                pitches={pitches}
                onPitchesChange={onPitchesChange}
              />
            ) : (
              <RunnerStatus
                // 表示用
                bso={currentBSO}
                runners={runners}
                offensePlayers={offensePlayers}
                pitches={pitches}
                // ラベル/名前解決
                baseLabel={baseLabel}
                getRunnerName={getRunnerName}
                // イベント（親へ通知）
                onBaseClick={onRunnerBaseClick}
                onAddOutClick={onAddOutClick}
                // 進塁理由ダイアログ
                showAdvanceDialog={showAdvanceDialog}
                pendingAdvancements={pendingAdvancements}
                onAdvanceConfirm={onAdvanceConfirm}
                // アウト理由ダイアログ
                showOutDialog={showOutDialog}
                pendingOuts={pendingOuts}
                onOutConfirm={onOutConfirm}
                // 共通キャンセル
                onDialogCancel={onDialogCancel}
                // アウト追加
                showAddOutDialog={showAddOutDialog}
                selectedOutRunner={selectedOutRunner}
                onSelectOutRunner={onSelectOutRunner}
                onAddOutConfirm={onAddOutConfirm}
                onAddOutCancel={onAddOutCancel}
              />
            )}
          </div>
        </>
      ) : (
        <PlayResultPanel
          onComplete={() => onPlayResultComplete(undefined)} // PlayResultPanelは結果を返さないのでundefined
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
