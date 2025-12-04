/**
 * ランナーの動き入力コンポーネント
 * - 打席結果後のランナーの進塁・アウト・得点を入力
 */
import React, { useState, useEffect, useMemo } from 'react';
import DiamondField from './runner/DiamondField';
import AdvanceReasonDialog, { RunnerAdvancement, AdvanceReasonResult } from './runner/AdvanceReasonDialog';
import OutReasonDialog, { RunnerOut, OutReasonResult } from './runner/OutReasonDialog';
import FinalConfirmDialog from './runner/FinalConfirmDialog';
import RunnerSelectDialog from './runner/RunnerSelectDialog.tsx';
import { getPlayers } from '../../services/playerService';
import { PitchType } from './common/PitchTypeSelector';

type BaseKey = '1' | '2' | '3' | 'home';

interface PitchData {
  id: number;
  x: number;
  y: number;
  type: PitchType;
  order: number;
  result: 'swing' | 'looking' | 'ball' | 'inplay' | 'deadball' | 'foul';
}

export interface RunnerMovementResult {
  afterRunners: { '1': string | null; '2': string | null; '3': string | null };
  outsAfter: number;
  scoredRunners: string[];
  outDetails: Array<{
    runnerId: string;
    base: string;
    threwPosition: string;
    caughtPosition: string;
  }>;
}

interface RunnerMovementInputProps {
  onComplete?: (result: RunnerMovementResult) => void;
  onCancel?: () => void;
  initialRunners?: { '1': string | null; '2': string | null; '3': string | null };
  battingResult?: string; // 追加: 打席結果
  batterId?: string; // 追加: 打者ID
  initialOuts?: number; // 追加: 初期アウトカウント
  pitches?: PitchData[]; // 追加
  battingOrder?: number; // 追加
  offenseTeamId?: string | null; // 追加: 親から攻撃チームIDをもらう
}

const styles = {
  container: { 
    padding: 20, 
    background: '#fff', 
    border: '1px solid #dee2e6', 
    borderRadius: 8,
    maxWidth: 980,
    margin: '0 auto',
  },
  title: { 
    marginBottom: 20, 
    fontSize: 18, 
    fontWeight: 600 as const,
    color: '#212529',
    textAlign: 'center' as const,
  },
  mainLayout: {
    display: 'flex',
    gap: 24,
    marginBottom: 24,
  },
  fieldSection: {
    flex: 1,
  },
  fieldTitle: {
    fontSize: 14,
    fontWeight: 600 as const,
    marginBottom: 12,
    color: '#495057',
    textAlign: 'center' as const,
  },
  fieldWrapper: {
    width: '100%',
    maxWidth: 380,
    margin: '0 auto',
    position: 'relative' as const,
  },
  fieldContainer: (isReadOnly: boolean) => ({
    border: `2px solid ${isReadOnly ? '#dee2e6' : '#4c6ef5'}`,
    borderRadius: 8,
    padding: 12,
    background: isReadOnly ? '#f8f9fa' : '#fff',
    opacity: isReadOnly ? 0.7 : 1,
  }),
  runnerList: {
    marginTop: 12,
    fontSize: 12,
  },
  runnerItem: {
    padding: '6px 8px',
    marginBottom: 4,
    background: '#e7f5ff',
    borderRadius: 4,
    display: 'flex',
    justifyContent: 'space-between',
  },
  buttonContainer: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
  },
  button: (variant: 'cancel' | 'complete') => ({
    padding: '10px 24px',
    background: variant === 'cancel' ? '#e74c3c' : '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600 as const,
    fontSize: 14,
  }),
  outsSection: {
    marginBottom: 20,
    padding: 12,
    background: '#f8f9fa',
    borderRadius: 8,
    textAlign: 'center' as const,
  },
  outsTitle: {
    fontSize: 14,
    fontWeight: 600 as const,
    marginBottom: 8,
    color: '#495057',
  },
  outsButtons: {
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
  },
  outButton: (isActive: boolean) => ({
    padding: '8px 16px',
    background: isActive ? '#e74c3c' : '#fff',
    color: isActive ? '#fff' : '#495057',
    border: `2px solid ${isActive ? '#e74c3c' : '#dee2e6'}`,
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600 as const,
    fontSize: 14,
  }),
  scoreSection: {
    marginBottom: 20,
    padding: 12,
    background: '#e7f5ff',
    borderRadius: 8,
  },
  scoreTitle: {
    fontSize: 14,
    fontWeight: 600 as const,
    marginBottom: 8,
    color: '#1c7ed6',
  },
  scoreList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  scoreItem: {
    padding: '6px 8px',
    background: '#fff',
    borderRadius: 4,
    fontSize: 13,
  },
  outDetailSection: {
    marginBottom: 20,
    padding: 12,
    background: '#fff3cd',
    borderRadius: 8,
  },
  outDetailTitle: {
    fontSize: 14,
    fontWeight: 600 as const,
    marginBottom: 12,
    color: '#856404',
    textAlign: 'center' as const,
  },
  outDetailForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600 as const,
    color: '#495057',
  },
  select: {
    padding: '8px',
    borderRadius: 4,
    border: '1px solid #dee2e6',
    fontSize: 13,
  },
  confirmDialog: {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#fff',
    padding: 24,
    borderRadius: 12,
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
    zIndex: 1000,
    minWidth: 400,
  },
  confirmOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 999,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: 600 as const,
    marginBottom: 16,
    color: '#212529',
  },
  confirmList: {
    marginBottom: 16,
    padding: 12,
    background: '#f8f9fa',
    borderRadius: 8,
  },
  confirmButtons: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
  },
};

const RunnerMovementInput: React.FC<RunnerMovementInputProps> = ({ 
  onComplete, 
  onCancel,
  initialRunners = { '1': null, '2': null, '3': null },
  battingResult = '',
  batterId = '',
  initialOuts = 0,
  pitches = [], // 追加
  battingOrder = 0, // 追加
  offenseTeamId, // 追加: 親から受け取る
}) => {
  const [beforeRunners] = useState(initialRunners);
  // 追加: 打席結果→進塁数のマッピング（打者・既存ランナーともに同じ距離）
  const getAdvanceDistance = (result: string) => {
    switch (result) {
      case 'single':
      case 'droppedthird':
      case 'error':
      case 'walk': // 将来的に明示的に渡す場合のため
      case 'deadball': // 将来的に明示的に渡す場合のため
        return 1;
      case 'double':
        return 2;
      case 'triple':
        return 3;
      case 'homerun':
      case 'runninghomerun':
        return 4;
      default:
        return 0;
    }
  };

  // 追加: 共通進塁関数（n塁進む。ホーム到達は盤面から外れて得点候補）
  const advanceRunnersBy = (
    before: { '1': string | null; '2': string | null; '3': string | null },
    batterId: string | null,
    n: number
  ) => {
    const after: { '1': string | null; '2': string | null; '3': string | null } = { '1': null, '2': null, '3': null };
    const scored: string[] = [];

    const bases = ['1', '2', '3'] as const;
    // 既存ランナーは現在の塁番号(1/2/3)から n だけ進塁
    for (let i = bases.length - 1; i >= 0; i--) {
      const base = bases[i];
      const runner = before[base];
      if (!runner) continue;
      const startIndex = i + 1; // 1→1, 2→2, 3→3
      const targetIndex = startIndex + n;
      if (targetIndex >= 4) {
        scored.push(runner);
      } else {
        const targetBase = String(targetIndex) as '1' | '2' | '3';
        after[targetBase] = runner;
      }
    }

    // 打者の進塁（スタートは0塁）
    if (batterId) {
      const batterTarget = n; // 0塁（ホーム）から n だけ進塁
      if (batterTarget >= 4) {
        scored.push(batterId);
      } else if (batterTarget > 0) {
        const targetBase = String(batterTarget) as '1' | '2' | '3';
        if (!after[targetBase]) after[targetBase] = batterId;
      }
    }

    return { after, scored };
  };

  // 変更: 初期配置（自動進塁）計算を共通関数で
  const [initialAfterRunners] = useState(() => {
    const n = getAdvanceDistance(battingResult);
    if (!batterId || n === 0) return { ...initialRunners };
    const { after } = advanceRunnersBy(initialRunners, batterId, n);
    return after;
  });
  
  const [scoredRunners, setScoredRunners] = useState<string[]>([]);
  const [showScoreConfirm, setShowScoreConfirm] = useState(false);
  const [pendingScores, setPendingScores] = useState<string[]>([]);

  // ダイアログ表示用state
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [showOutDialog, setShowOutDialog] = useState(false);
  const [pendingAdvancements, setPendingAdvancements] = useState<RunnerAdvancement[]>([]);
  const [pendingOuts, setPendingOuts] = useState<RunnerOut[]>([]);
  const [showRunnerSelectDialog, setShowRunnerSelectDialog] = useState(false);
  const [selectedTargetBase, setSelectedTargetBase] = useState<BaseKey | null>(null);
  const [candidateRunners, setCandidateRunners] = useState<Array<{ id: string; name: string; fromBase: '1' | '2' | '3' }>>([]);
  const [selectedRunnerId, setSelectedRunnerId] = useState<string | null>(null);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false); // 追加: 最終確認画面

  // 打席結果に応じた初期配置を計算
  const getInitialAfterRunners = () => {
    const n = getAdvanceDistance(battingResult);
    if (!batterId || n === 0) return { ...initialRunners };
    const { after } = advanceRunnersBy(initialRunners, batterId, n);
    return after;
  };

  const [afterRunners, setAfterRunners] = useState(getInitialAfterRunners());
  const [selectedBase, setSelectedBase] = useState<BaseKey | null>(null);
  const [outsAfter, setOutsAfter] = useState(initialOuts);
  
  // 得点・アウト詳細の状態
  const [outDetails, setOutDetails] = useState<Array<{
    runnerId: string;
    base: string;
    threwPosition: string;
    caughtPosition: string;
  }>>([]);

  const offensePlayers = useMemo(() => {
    if (offenseTeamId == null) return [];
    return getPlayers(offenseTeamId);
  }, [offenseTeamId]);

  const currentBatter = useMemo(() => {
    if (!batterId || offenseTeamId == null) return null;
    return offensePlayers.find(p => p.playerId === batterId) || null;
  }, [batterId, offensePlayers, offenseTeamId]);

  const getPlayerName = (playerId: string | null) => {
    if (!playerId) return '';
    const player = offensePlayers.find(p => p.playerId === playerId);
    if (!player) return '';
    return `${player.familyName} ${player.givenName}`.trim();
  };

  const handleAfterBaseClick = (base: BaseKey) => {
    // 本塁も含めて選択可能
    if (base === 'home') {
      // 本塁への進塁候補を特定（三塁ランナー優先）
      const candidates: Array<{ id: string; name: string; fromBase: '1' | '2' | '3' }> = [];
      
      if (afterRunners['3']) {
        const player = offensePlayers.find(p => p.playerId === afterRunners['3']);
        if (player) {
          candidates.push({
            id: afterRunners['3']!,
            name: `${player.familyName} ${player.givenName}`.trim(),
            fromBase: '3',
          });
        }
      }
      
      if (candidates.length > 0) {
        setCandidateRunners(candidates);
        setSelectedTargetBase('home');
        setSelectedRunnerId(candidates[0].id); // デフォルトで最初の候補を選択
        setShowRunnerSelectDialog(true);
      } else {
        alert('本塁に進むランナーがいません');
      }
      return;
    }
    
    // 通常の塁への移動（一塁・二塁・三塁）
    const candidates: Array<{ id: string; name: string; fromBase: '1' | '2' | '3' }> = [];
    
    // その塁に進む可能性のあるランナーを特定
    const targetBaseNum = base === '1' ? 1 : base === '2' ? 2 : 3;
    const fromBaseNum = targetBaseNum - 1;
    const fromBase = fromBaseNum === 0 ? null : (String(fromBaseNum) as '1' | '2' | '3');
    
    if (fromBase && afterRunners[fromBase]) {
      const player = offensePlayers.find(p => p.playerId === afterRunners[fromBase]);
      if (player) {
        candidates.push({
          id: afterRunners[fromBase]!,
          name: `${player.familyName} ${player.givenName}`.trim(),
          fromBase: fromBase,
        });
      }
    }
    
    // 打者が一塁に進む場合
    if (base === '1' && batterId) {
      const player = offensePlayers.find(p => p.playerId === batterId);
      if (player && !candidates.find(c => c.id === batterId)) {
        candidates.push({
          id: batterId,
          name: `${player.familyName} ${player.givenName}`.trim(),
          fromBase: '1', // 仮の値
        });
      }
    }
    
    if (candidates.length === 0) {
      alert(`${base === '1' ? '一' : base === '2' ? '二' : '三'}塁に進むランナーがいません`);
      return;
    }
    
    setCandidateRunners(candidates);
    setSelectedTargetBase(base);
    setSelectedRunnerId(candidates[0].id); // デフォルトで最初の候補を選択
    setShowRunnerSelectDialog(true);
  };

  // プレー後のランナー配置を確定する前にダイアログを表示（削除して最終確認のみ使用）
  const handleCompleteClick = () => {
    // バリデーション
    if (needOutDetails) {
      // バント失敗の場合は処理した選手も必須
      const isValid = battingResult === 'bunt_out'
        ? outDetails.every(d => d.runnerId && d.base && d.threwPosition && d.caughtPosition)
        : outDetails.every(d => d.runnerId && d.base && d.caughtPosition);
      
      if (!isValid) {
        alert('アウト詳細をすべて入力してください');
        return;
      }
    }
    
    // 最終確認画面を表示
    setShowFinalConfirm(true);
  };

  const handleFinalConfirm = () => {
    // データ処理は親コンポーネントに委譲
    if (onComplete) {
      onComplete({
        afterRunners,
        outsAfter,
        scoredRunners,
        outDetails,
      });
    }

    setShowFinalConfirm(false);
  };

  const handleFinalCancel = () => {
    setShowFinalConfirm(false);
  };

  const handleAdvanceConfirm = (results: AdvanceReasonResult[]) => {
    console.log('進塁理由:', results);
    // TODO: 必要なら理由も親に渡す構造にするが、現状はログのみ
    
    setShowAdvanceDialog(false);
    setPendingAdvancements([]);
  };

  const handleOutConfirm = (results: OutReasonResult[]) => {
    console.log('アウト理由:', results);
    // TODO: 必要なら理由も親に渡す構造にするが、現状はログのみ
    
    setShowOutDialog(false);
    setPendingOuts([]);
    
    // すべて完了（これ以前に呼ばれていたが、理由入力がある場合のフローは見直しが必要かもしれない。現状は維持）
  };

  const handleDialogCancel = () => {
    setShowAdvanceDialog(false);
    setShowOutDialog(false);
    setPendingAdvancements([]);
    setPendingOuts([]);
  };

  // 得点した選手を計算（自動進塁でホーム到達した候補も拾う）
  React.useEffect(() => {
    const scored: string[] = [];

    const n = getAdvanceDistance(battingResult);
    if (n > 0) {
      // 自動進塁の計算結果からホーム到達を算出（before→afterの差分も許容）
      (['1', '2', '3'] as const).forEach(base => {
        const pid = beforeRunners[base];
        if (!pid) return;
        const stillOnBase = Object.values(afterRunners).includes(pid);
        if (!stillOnBase) {
          // 盤面にいなければ「得点候補 or アウト」だが、打撃イベント進塁では基本は得点候補とみなす
          scored.push(pid);
        }
      });
      // 打者のホーム到達（afterにいなければ候補）
      if (batterId && !Object.values(afterRunners).includes(batterId)) {
        scored.push(batterId);
      }
    } else if (battingResult === 'sacrifice_bunt' || battingResult === 'sacrifice_fly') {
      // 既存の犠打・犠飛の取り扱いを維持
      if (beforeRunners['3']) scored.push(beforeRunners['3']!);
    }
    // バント失敗などは得点なし

    if (scored.length > 0 && !showScoreConfirm && scoredRunners.length === 0) {
      setPendingScores(scored);
      setShowScoreConfirm(true);
    }
  }, [beforeRunners, afterRunners, battingResult, batterId]);
  
  const handleConfirmScores = () => {
    setScoredRunners(pendingScores);
    setShowScoreConfirm(false);
    setPendingScores([]);
  };

  const handleCancelScores = () => {
    setShowScoreConfirm(false);
    setPendingScores([]);
  };

  // アウトが増えた場合の処理
  const outsIncreased = outsAfter - initialOuts;
  const needOutDetails = outsIncreased > 0;

  React.useEffect(() => {
    if (needOutDetails && outDetails.length < outsIncreased) {
      // アウト詳細を初期化
      const newDetails = [];
      for (let i = 0; i < outsIncreased; i++) {
        newDetails.push({
          runnerId: '',
          base: '',
          threwPosition: '',
          caughtPosition: '',
        });
      }
      setOutDetails(newDetails);
    }
  }, [outsIncreased, needOutDetails]);

  // アウトになり得る選手リスト（打者 + プレー前のランナー）
  const possibleOutRunners = useMemo(() => {
    const runners: Array<{ id: string; name: string; label: string }> = [];
    
    if (batterId && currentBatter) {
      runners.push({
        id: batterId,
        name: `${currentBatter.familyName} ${currentBatter.givenName}`.trim(),
        label: '打者',
      });
    }
    
    (['1', '2', '3'] as const).forEach(base => {
      const playerId = beforeRunners[base];
      if (playerId) {
        runners.push({
          id: playerId,
          name: getPlayerName(playerId),
          label: base === '1' ? '一塁走者' : base === '2' ? '二塁走者' : '三塁走者',
        });
      }
    });
    
    return runners;
  }, [batterId, currentBatter, beforeRunners]);

  const positionOptions = [
    { value: '1', label: '投手（P）' },
    { value: '2', label: '捕手（C）' },
    { value: '3', label: '一塁手（1B）' },
    { value: '4', label: '二塁手（2B）' },
    { value: '5', label: '三塁手（3B）' },
    { value: '6', label: '遊撃手（SS）' },
    { value: '7', label: '左翼手（LF）' },
    { value: '8', label: '中堅手（CF）' },
    { value: '9', label: '右翼手（RF）' },
  ];

  const baseOptions = [
    { value: '1', label: '一塁' },
    { value: '2', label: '二塁' },
    { value: '3', label: '三塁' },
    { value: 'home', label: 'ホーム' },
  ];

  const handleOutDetailChange = (index: number, field: string, value: string) => {
    const newDetails = [...outDetails];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setOutDetails(newDetails);
  };

  // ダイアログハンドラ（置換用）
  const handleRunnerSelectConfirm = () => {
    if (!selectedTargetBase || !selectedRunnerId) return;
    
    const next = { ...afterRunners };
    
    // 選択されたランナーの元の位置をクリア
    (['1', '2', '3'] as const).forEach(base => {
      if (next[base] === selectedRunnerId) {
        next[base] = null;
      }
    });
    
    // 新しい位置に配置（ホームは得点として扱うため盤面には置かない）
    if (selectedTargetBase !== 'home') {
      next[selectedTargetBase] = selectedRunnerId;
    }
    setAfterRunners(next);

    // ランナー選択ダイアログを閉じる
    setShowRunnerSelectDialog(false);

    // 進塁理由ダイアログを表示
    const player = offensePlayers.find(p => p.playerId === selectedRunnerId);
    const fromBase = candidateRunners.find(r => r.id === selectedRunnerId)?.fromBase;
    if (player && fromBase) {
      setPendingAdvancements([{
        runnerId: selectedRunnerId,
        runnerName: `${player.familyName} ${player.givenName}`.trim(),
        fromBase,
        toBase: selectedTargetBase,
      }]);
      setShowAdvanceDialog(true);
    }

    // ホームインの場合は得点確認ダイアログを準備
    if (selectedTargetBase === 'home') {
      setPendingScores(prev => {
        const merged = prev.includes(selectedRunnerId) ? prev : [...prev, selectedRunnerId];
        return merged;
      });
      setShowScoreConfirm(true);
    }

    // 状態をクリア
    setSelectedTargetBase(null);
    setSelectedRunnerId(null);
    setCandidateRunners([]);
  };

  const handleRunnerSelectCancel = () => {
    setShowRunnerSelectDialog(false);
    setSelectedTargetBase(null);
    setSelectedRunnerId(null);
    setCandidateRunners([]);
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>ランナーの動き入力</h3>

      {/* 最終確認ダイアログ */}
      {showFinalConfirm && (
        <>
          <FinalConfirmDialog
            initialOuts={initialOuts}
            outsAfter={outsAfter}
            scoredRunners={scoredRunners}
            beforeRunners={beforeRunners}
            afterRunners={afterRunners}
            getPlayerName={getPlayerName}
            needOutDetails={needOutDetails}
            outDetails={outDetails}
            positionOptions={positionOptions}
            baseOptions={baseOptions}
            battingResult={battingResult}
            onCancel={handleFinalCancel}
            onConfirm={handleFinalConfirm}
          />
        </>
      )}

      {/* ランナー選択ダイアログ */}
      {showRunnerSelectDialog && (
        <>
          <RunnerSelectDialog
            selectedTargetBase={selectedTargetBase}
            candidates={candidateRunners}
            selectedRunnerId={selectedRunnerId}
            setSelectedRunnerId={setSelectedRunnerId}
            onCancel={handleRunnerSelectCancel}
            onConfirm={handleRunnerSelectConfirm}
          />
        </>
      )}

      {/* 進塁理由ダイアログ */}
      {showAdvanceDialog && (
        <AdvanceReasonDialog
          advancements={pendingAdvancements}
          context="batting"
          onConfirm={handleAdvanceConfirm}
          onCancel={handleDialogCancel}
        />
      )}

      {/* アウト理由ダイアログ */}
      {showOutDialog && (
        <OutReasonDialog
          outs={pendingOuts}
          context="batting"
          onConfirm={handleOutConfirm}
          onCancel={handleDialogCancel}
        />
      )}

      {/* 得点確認ダイアログ */}
      {showScoreConfirm && (
        <>
          <div style={styles.confirmOverlay} onClick={handleCancelScores} />
          <div style={styles.confirmDialog}>
            <div style={styles.confirmTitle}>
              以下のランナーの得点を記録しますか？
            </div>
            <div style={styles.confirmList}>
              {pendingScores.map((playerId, idx) => (
                <div key={idx} style={{ padding: '6px 0', borderBottom: idx < pendingScores.length - 1 ? '1px solid #dee2e6' : 'none' }}>
                  {getPlayerName(playerId)}
                </div>
              ))}
            </div>
            <div style={styles.confirmButtons}>
              <button
                type="button"
                onClick={handleCancelScores}
                style={{ ...styles.button('cancel'), padding: '8px 20px' }}
              >
                いいえ
              </button>
              <button
                type="button"
                onClick={handleConfirmScores}
                style={{ ...styles.button('complete'), padding: '8px 20px' }}
              >
                はい
              </button>
            </div>
          </div>
        </>
      )}

      {/* アウトカウント */}
      <div style={styles.outsSection}>
        <div style={styles.outsTitle}>アウトカウント（イベント後）</div>
        <div style={styles.outsButtons}>
          {[0, 1, 2, 3].map(count => {
            const isDisabled = count < initialOuts;
            return (
              <button
                key={count}
                type="button"
                onClick={() => !isDisabled && setOutsAfter(count)}
                disabled={isDisabled}
                style={{
                  ...styles.outButton(outsAfter === count),
                  opacity: isDisabled ? 0.4 : 1,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                }}
              >
                {count}アウト
              </button>
            );
          })}
        </div>
      </div>

      {/* 得点表示 */}
      {scoredRunners.length > 0 && (
        <div style={styles.scoreSection}>
          <div style={styles.scoreTitle}>得点 ({scoredRunners.length}点)</div>
          <div style={styles.scoreList}>
            {scoredRunners.map((playerId, idx) => (
              <div key={idx} style={styles.scoreItem}>
                {getPlayerName(playerId)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* アウト詳細入力 */}
      {needOutDetails && (
        <div style={styles.outDetailSection}>
          <div style={styles.outDetailTitle}>
            アウト詳細を入力 ({outsIncreased}個のアウト)
          </div>
          {outDetails.map((detail, idx) => (
            <div key={idx} style={{ ...styles.outDetailForm, marginBottom: idx < outDetails.length - 1 ? 16 : 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#856404', marginBottom: 8 }}>
                アウト {idx + 1}
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>アウトになった選手 *</label>
                <select
                  value={detail.runnerId}
                  onChange={(e) => handleOutDetailChange(idx, 'runnerId', e.target.value)}
                  style={styles.select}
                >
                  <option value="">選択してください</option>
                  {possibleOutRunners.map(runner => (
                    <option key={runner.id} value={runner.id}>
                      {runner.label}: {runner.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>アウトになった塁 *</label>
                <select
                  value={detail.base}
                  onChange={(e) => handleOutDetailChange(idx, 'base', e.target.value)}
                  style={styles.select}
                >
                  <option value="">選択してください</option>
                  {baseOptions.map(base => (
                    <option key={base.value} value={base.value}>
                      {base.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* バント失敗の場合は処理した選手を必須で選択 */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  {battingResult === 'bunt_out' ? '処理した選手 *' : '送球した選手（任意）'}
                </label>
                <select
                  value={detail.threwPosition}
                  onChange={(e) => handleOutDetailChange(idx, 'threwPosition', e.target.value)}
                  style={styles.select}
                >
                  <option value="">{battingResult === 'bunt_out' ? '選択してください' : 'なし'}</option>
                  {positionOptions.map(pos => (
                    <option key={pos.value} value={pos.value}>
                      {pos.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>アウトにした選手 *</label>
                <select
                  value={detail.caughtPosition}
                  onChange={(e) => handleOutDetailChange(idx, 'caughtPosition', e.target.value)}
                  style={styles.select}
                >
                  <option value="">選択してください</option>
                  {positionOptions.map(pos => (
                    <option key={pos.value} value={pos.value}>
                      {pos.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={styles.mainLayout}>
        {/* 左側: プレー前のランナー状況（読み取り専用） */}
        <div style={styles.fieldSection}>
          <div style={styles.fieldTitle}>プレー前（{initialOuts}アウト）</div>
          <div style={styles.fieldWrapper}>
            <div style={styles.fieldContainer(true)}>
              <DiamondField 
                runners={beforeRunners}
                selectedBase={null}
                onBaseClick={() => {}}
              />
            </div>
            <div style={styles.runnerList}>
              {(['1', '2', '3'] as const).map(base => {
                const playerId = beforeRunners[base];
                if (!playerId) return null;
                return (
                  <div key={base} style={styles.runnerItem}>
                    <span>{base === '1' ? '一塁' : base === '2' ? '二塁' : '三塁'}</span>
                    <span>{getPlayerName(playerId)}</span>
                  </div>
                );
              })}
              {!beforeRunners['1'] && !beforeRunners['2'] && !beforeRunners['3'] && (
                <div style={{ textAlign: 'center', color: '#6c757d', padding: 8 }}>
                  ランナーなし
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右側: プレー後のランナー状況（編集可能） */}
        <div style={styles.fieldSection}>
          <div style={styles.fieldTitle}>プレー後</div>
          <div style={styles.fieldWrapper}>
            <div style={styles.fieldContainer(false)}>
              <DiamondField 
                runners={afterRunners}
                selectedBase={selectedBase}
                onBaseClick={handleAfterBaseClick}
              />
            </div>
            <div style={styles.runnerList}>
              {/* 得点したランナー */}
              {scoredRunners.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#1c7ed6', marginBottom: 4 }}>
                    得点 ({scoredRunners.length})
                  </div>
                  {scoredRunners.map((playerId, idx) => (
                    <div key={`score-${idx}`} style={{ ...styles.runnerItem, background: '#d1ecf1' }}>
                      <span>ホーム</span>
                      <span>{getPlayerName(playerId)}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* ベース上のランナー */}
              {(['1', '2', '3'] as const).map(base => {
                const playerId = afterRunners[base];
                if (!playerId) return null;
                return (
                  <div key={base} style={styles.runnerItem}>
                    <span>{base === '1' ? '一塁' : base === '2' ? '二塁' : '三塁'}</span>
                    <span>{getPlayerName(playerId)}</span>
                  </div>
                );
              })}
              {!afterRunners['1'] && !afterRunners['2'] && !afterRunners['3'] && scoredRunners.length === 0 && (
                <div style={{ textAlign: 'center', color: '#6c757d', padding: 8 }}>
                  ランナーなし
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div style={styles.buttonContainer}>
        <button
          type="button"
          onClick={() => onCancel && onCancel()}
          style={styles.button('cancel')}
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={handleCompleteClick}
          style={styles.button('complete')}
        >
          完了
        </button>
      </div>
    </div>
  );
};

export default RunnerMovementInput;
