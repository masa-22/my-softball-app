import { useState } from 'react';
import { RunnerAdvancement, AdvanceReasonResult } from '../components/play/runner/AdvanceReasonDialog';
import { RunnerOut, OutReasonResult } from '../components/play/runner/OutReasonDialog';
import { getGameState, updateRunnersRealtime, addRunsRealtime, updateCountsRealtime, closeHalfInningRealtime } from '../services/gameStateService';
import { RunnerEvent } from '../types/AtBat';

interface UseRunnerManagerProps {
  matchId: string | undefined;
  runners: { '1': string | null; '2': string | null; '3': string | null };
  setRunners: (runners: { '1': string | null; '2': string | null; '3': string | null }) => void;
  offensePlayers: any[];
  currentBSO: { b: number; s: number; o: number };
  recordRunnerEvent: (event: RunnerEvent) => void;
}

const createRunnerEventId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `runner-event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const mapAdvanceReasonToEventType = (reason: AdvanceReasonResult['reason']) => {
  switch (reason) {
    case 'steal':
      return 'steal';
    case 'wildpitch':
      return 'wildpitch';
    case 'passball':
      return 'passedball';
    case 'illegalpitch':
      return 'illegalpitch';
    case 'hit':
    case 'error':
      return 'advance';
    default:
      return 'advance';
  }
};

const mapOutReasonToEventType = (reason: OutReasonResult['reason']) => {
  switch (reason) {
    case 'caughtstealing':
      return 'caughtstealing';
    case 'pickoff':
      return 'pickoff';
    case 'runout':
      return 'runout';
    case 'leftbase':
      return 'leftbase';
    default:
      return 'out';
  }
};

export const useRunnerManager = ({
  matchId,
  runners,
  setRunners,
  offensePlayers,
  currentBSO,
  recordRunnerEvent,
}: UseRunnerManagerProps) => {
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [pendingAdvancements, setPendingAdvancements] = useState<RunnerAdvancement[]>([]);
  const [showOutDialog, setShowOutDialog] = useState(false);
  const [pendingOuts, setPendingOuts] = useState<RunnerOut[]>([]);
  const [showAddOutDialog, setShowAddOutDialog] = useState(false);
  const [selectedOutRunner, setSelectedOutRunner] = useState<{ runnerId: string; fromBase: '1' | '2' | '3' } | null>(null);
  const [previousRunners, setPreviousRunners] = useState<{ '1': string | null; '2': string | null; '3': string | null }>({ '1': null, '2': null, '3': null });

  // ラベル/名前解決
  const baseLabel = (b: '1' | '2' | '3' | 'home') => (b === 'home' ? 'ホーム' : b === '1' ? '一塁' : b === '2' ? '二塁' : '三塁');
  
  const getRunnerName = (playerId: string | null) => {
    if (!playerId) return '';
    const p = offensePlayers.find(sp => sp.playerId === playerId);
    return p ? `${p.familyName} ${p.givenName}`.trim() : '';
  };

  // 直前の塁にいる最も近い走者
  const findNearestPriorRunner = (target: '2' | '3'): { fromBase: '1' | '2'; runnerId: string } | null => {
    if (target === '2') {
      if (runners['1']) return { fromBase: '1', runnerId: runners['1']! };
      return null;
    }
    if (runners['2']) return { fromBase: '2', runnerId: runners['2']! };
    if (runners['1']) return { fromBase: '1', runnerId: runners['1']! };
    return null;
  };

  const handleRunnerBaseClick = (base: '1' | '2' | '3' | 'home') => {
    if (!matchId) return;

    if (base === 'home') {
      const thirdRunner = runners['3'];
      if (!thirdRunner) return;
      const name = getRunnerName(thirdRunner) || '三塁走者';
      const ok = window.confirm(`${name}の得点を記録しますか？`);
      if (!ok) return;
      const next = { ...runners, '3': null };
      setPreviousRunners(next);
      setPendingAdvancements([{ runnerId: thirdRunner, runnerName: name, fromBase: '3', toBase: 'home' }]);
      setShowAdvanceDialog(true);
      return;
    }

    if (base === '1' || base === '2' || base === '3') {
      const currentRunnerId = runners[base];
      if (currentRunnerId) {
        const name = getRunnerName(currentRunnerId) || '走者';
        const ok = window.confirm(`${baseLabel(base)}のランナー「${name}」をアウトにしますか？`);
        if (!ok) return;
        const next = { ...runners, [base]: null } as typeof runners;
        setPreviousRunners(next);
        setPendingOuts([{ runnerId: currentRunnerId, runnerName: name, fromBase: base, outAtBase: base }]);
        setShowOutDialog(true);
        return;
      }
    }

    if (base === '2' || base === '3') {
      const prior = findNearestPriorRunner(base);
      if (!prior) return;
      const name = getRunnerName(prior.runnerId) || (prior.fromBase === '1' ? '一塁走者' : '二塁走者');
      const ok = window.confirm(`${name}を${baseLabel(base)}へ進塁として記録しますか？`);
      if (!ok) return;
      const next = { ...runners } as typeof runners;
      next[prior.fromBase] = null;
      next[base] = prior.runnerId;
      setPendingAdvancements([{ runnerId: prior.runnerId, runnerName: name, fromBase: prior.fromBase, toBase: base }]);
      setPreviousRunners(next);
      setShowAdvanceDialog(true);
    }
  };

  const handleRunnerDialogCancel = () => {
    setShowAdvanceDialog(false);
    setShowOutDialog(false);
    setPendingAdvancements([]);
    setPendingOuts([]);
  };

  const handleRunnerAdvanceConfirm = (results: AdvanceReasonResult[]) => {
    const advs = [...pendingAdvancements];
    const next = { ...previousRunners };
    advs.forEach(adv => {
      if (adv.fromBase === '1' || adv.fromBase === '2' || adv.fromBase === '3') next[adv.fromBase] = null;
      if (adv.toBase === '1' || adv.toBase === '2' || adv.toBase === '3') next[adv.toBase] = adv.runnerId;
    });

    // ランナー更新
    updateRunnersRealtime(matchId!, { '1b': next['1'], '2b': next['2'], '3b': next['3'] });

    results.forEach(result => {
      const adv = advs.find(a => a.runnerId === result.runnerId);
      if (!adv) return;
      recordRunnerEvent({
        id: createRunnerEventId(),
        pitchSeq: result.pitchOrder ?? null,
        eventSource: result.eventSource ?? 'pitch',
        type: mapAdvanceReasonToEventType(result.reason),
        runnerId: result.runnerId,
        fromBase: adv.fromBase,
        toBase: adv.toBase,
        isOut: false,
      });
    });

    // 得点加算
    const scoredCount = advs.filter(a => a.toBase === 'home').length;
    if (scoredCount > 0) {
      const half = getGameState(matchId!)?.top_bottom || 'top';
      addRunsRealtime(matchId!, half, scoredCount);
    }

    // 同期・状態更新
    setRunners(next);
    setShowAdvanceDialog(false);
    setPendingAdvancements([]);
    try { window.dispatchEvent(new Event('game_states_updated')); } catch {}
  };

  const handleRunnerOutConfirm = (results: OutReasonResult[]) => {
    const outs = [...pendingOuts];
    const next = { ...previousRunners };
    outs.forEach(out => {
      if (out.fromBase === '1' || out.fromBase === '2' || out.fromBase === '3') next[out.fromBase] = null;
    });

    // ランナー更新
    updateRunnersRealtime(matchId!, { '1b': next['1'], '2b': next['2'], '3b': next['3'] });

    // アウト更新とイニング進行
    const gs = getGameState(matchId!);
    const currentO = gs?.counts.o ?? 0;
    const addO = outs.length;
    const newO = Math.min(3, currentO + addO);
    updateCountsRealtime(matchId!, { o: newO });
    if (newO >= 3) {
      closeHalfInningRealtime(matchId!);
      setRunners({ '1': null, '2': null, '3': null });
    }

    results.forEach(result => {
      const out = outs.find(o => o.runnerId === result.runnerId);
      if (!out) return;
      recordRunnerEvent({
        id: createRunnerEventId(),
        pitchSeq: result.pitchOrder ?? null,
        eventSource: result.eventSource ?? 'pitch',
        type: mapOutReasonToEventType(result.reason),
        runnerId: result.runnerId,
        fromBase: out.fromBase as any,
        toBase: out.outAtBase as any,
        isOut: true,
        outDetail: {
          base: out.outAtBase,
          threwPosition: result.outDetail?.threwBy || undefined,
          caughtPosition:
            result.outDetail?.caughtBy ||
            result.outDetail?.taggedBy ||
            result.outDetail?.putoutBy ||
            result.outDetail?.forceoutBy ||
            result.outDetail?.tagoutBy ||
            undefined,
        },
      });
    });

    setRunners(next);
    setShowOutDialog(false);
    setPendingOuts([]);
    try { window.dispatchEvent(new Event('game_states_updated')); } catch {}
  };

  const handleAddOutClick = () => setShowAddOutDialog(true);
  const handleSelectOutRunner = (runnerId: string, fromBase: '1' | '2' | '3') => setSelectedOutRunner({ runnerId, fromBase });
  const handleAddOutCancel = () => { setShowAddOutDialog(false); setSelectedOutRunner(null); };
  const handleAddOutConfirm = () => {
    if (!selectedOutRunner || !matchId) return;
    const { runnerId, fromBase } = selectedOutRunner;
    const name = getRunnerName(runnerId) || '走者';
    const next = { ...runners, [fromBase]: null } as typeof runners;
    setPreviousRunners(next);
    setPendingOuts([{ runnerId, runnerName: name, fromBase, outAtBase: fromBase }]);
    setShowAddOutDialog(false);
    setSelectedOutRunner(null);
    setShowOutDialog(true);
  };

  return {
    showAdvanceDialog,
    pendingAdvancements,
    showOutDialog,
    pendingOuts,
    showAddOutDialog,
    selectedOutRunner,
    handleRunnerBaseClick,
    handleRunnerDialogCancel,
    handleRunnerAdvanceConfirm,
    handleRunnerOutConfirm,
    handleAddOutClick,
    handleSelectOutRunner,
    handleAddOutCancel,
    handleAddOutConfirm,
    baseLabel,
    getRunnerName,
  };
};

