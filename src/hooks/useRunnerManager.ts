import { useState } from 'react';
import { RunnerAdvancement, AdvanceReasonResult } from '../components/play/runner/AdvanceReasonDialog';
import { RunnerOut, OutReasonResult } from '../components/play/runner/OutReasonDialog';
import type { RecordAdvanceConfirmPayload } from '../components/play/runner/RecordAdvanceDialog';
import {
  getGameState,
  updateRunnersRealtime,
  updateCountsRealtime,
  closeHalfInningRealtime,
  addRunsRealtime,
  updateTiebreakRunnerIdRealtime,
} from '../services/gameStateService';
import { saveMidPlayAtBat } from '../services/atBatService';
import {
  AtBatType,
  FieldingAction,
  RunnerEvent,
  RunnerEventType,
  ScoredRunnerEntry,
} from '../types/AtBat';
import { LineupEntry } from '../types/Lineup';
import { positionAbbrToCode } from '../data/softball/positions';
import {
  isTiebreakRunnerOnBase,
  localRunnersFromGameState,
  markTiebreakScoredRunners,
} from '../utils/tiebreak';

type RunnersState = { '1': string | null; '2': string | null; '3': string | null };

interface UseRunnerManagerProps {
  matchId: string | undefined;
  runners: RunnersState;
  setRunners: (runners: RunnersState) => void;
  offensePlayers: any[];
  currentBSO: { b: number; s: number; o: number };
  currentInning: number;
  currentHalf: 'top' | 'bottom';
  currentBatter: { playerId?: string } | null | undefined;
  currentPitcher: { playerId?: string } | null | undefined;
  battingOrder: number;
  ensurePlateAppearanceId: (matchId: string, playIndex: number) => string;
  clearPlateAppearanceId: () => void;
  /** 現在の守備側ラインナップ（失策の選手特定に使用） */
  defensiveLineup?: LineupEntry[];
}

const createRunnerEventId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `runner-event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const mapAdvanceReasonToEventType = (reason: AdvanceReasonResult['reason']): RunnerEventType => {
  switch (reason) {
    case 'steal':
      return 'steal';
    case 'wildpitch':
      return 'wildpitch';
    case 'passball':
      return 'passedball';
    case 'illegalpitch':
      return 'illegalpitch';
    case 'error':
      return 'error';
    case 'hit':
    default:
      return 'hit';
  }
};

const mapOutReasonToEventType = (reason: OutReasonResult['reason']): RunnerEventType => {
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

const resolvePlayType = (eventTypes: RunnerEventType[]): Extract<AtBatType, 'steal' | 'other'> => {
  const stealRelated = eventTypes.every(
    (t) => t === 'steal' || t === 'caughtstealing'
  );
  return stealRelated && eventTypes.length > 0 ? 'steal' : 'other';
};

const applyAdvancementsToRunners = (start: RunnersState, advs: RunnerAdvancement[]): RunnersState => {
  const next: RunnersState = { ...start };
  advs.forEach((adv) => {
    if (adv.fromBase === '1' || adv.fromBase === '2' || adv.fromBase === '3') {
      if (next[adv.fromBase] === adv.runnerId) next[adv.fromBase] = null;
    }
  });
  advs.forEach((adv) => {
    if (adv.toBase === '1' || adv.toBase === '2' || adv.toBase === '3') {
      next[adv.toBase] = adv.runnerId;
    }
  });
  return next;
};

export const useRunnerManager = ({
  matchId,
  runners,
  setRunners,
  offensePlayers,
  currentBSO,
  currentInning,
  currentHalf,
  currentBatter,
  currentPitcher,
  battingOrder,
  ensurePlateAppearanceId,
  clearPlateAppearanceId,
  defensiveLineup = [],
}: UseRunnerManagerProps) => {
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [showRecordAdvanceDialog, setShowRecordAdvanceDialog] = useState(false);
  const [pendingAdvancements, setPendingAdvancements] = useState<RunnerAdvancement[]>([]);
  const [showOutDialog, setShowOutDialog] = useState(false);
  const [pendingOuts, setPendingOuts] = useState<RunnerOut[]>([]);
  const [showAddOutDialog, setShowAddOutDialog] = useState(false);
  const [selectedOutRunner, setSelectedOutRunner] = useState<{ runnerId: string; fromBase: '1' | '2' | '3' } | null>(null);
  const [previousRunners, setPreviousRunners] = useState<RunnersState>({ '1': null, '2': null, '3': null });

  const baseLabel = (b: '1' | '2' | '3' | 'home') => (b === 'home' ? 'ホーム' : b === '1' ? '一塁' : b === '2' ? '二塁' : '三塁');

  const getRunnerName = (playerId: string | null) => {
    if (!playerId) return '';
    const p = offensePlayers.find(sp => sp.playerId === playerId);
    return p ? `${p.familyName} ${p.givenName}`.trim() : '';
  };

  const occupiedRunnersForAdvance = (['1', '2', '3'] as const)
    .filter((base) => !!runners[base])
    .map((base) => ({
      runnerId: runners[base]!,
      runnerName: getRunnerName(runners[base]) || (base === '1' ? '一塁走者' : base === '2' ? '二塁走者' : '三塁走者'),
      fromBase: base,
    }));

  const handleRunnerBaseClick = (base: '1' | '2' | '3' | 'home') => {
    if (!matchId) return;

    if (base === 'home') {
      const thirdRunner = runners['3'];
      if (!thirdRunner) return;
      const name = getRunnerName(thirdRunner) || '三塁走者';
      const recordScore = window.confirm(
        `${name}の得点を記録しますか？\n\n「OK」= 得点\n「キャンセル」= 本塁での走塁死を記録`
      );
      if (recordScore) {
        setPendingAdvancements([{ runnerId: thirdRunner, runnerName: name, fromBase: '3', toBase: 'home' }]);
        setShowAdvanceDialog(true);
        return;
      }
      const recordOutAtHome = window.confirm(`${name}の本塁での走塁死を記録しますか？`);
      if (!recordOutAtHome) return;
      const next = { ...runners, '3': null };
      setPreviousRunners(next);
      setPendingOuts([{ runnerId: thirdRunner, runnerName: name, fromBase: '3', outAtBase: 'home' }]);
      setShowOutDialog(true);
      return;
    }

    // 占有塁 → アウトのみ（空塁タップによる進塁は「進塁を記録」ボタンへ一本化）
    if (base === '1' || base === '2' || base === '3') {
      const currentRunnerId = runners[base];
      if (!currentRunnerId) return;
      const name = getRunnerName(currentRunnerId) || '走者';
      const ok = window.confirm(`${baseLabel(base)}のランナー「${name}」をアウトにしますか？`);
      if (!ok) return;
      const next = { ...runners, [base]: null } as RunnersState;
      setPreviousRunners(next);
      setPendingOuts([{ runnerId: currentRunnerId, runnerName: name, fromBase: base, outAtBase: base }]);
      setShowOutDialog(true);
    }
  };

  const handleRecordAdvanceClick = () => {
    if (!matchId) return;
    if (!runners['1'] && !runners['2'] && !runners['3']) {
      alert('進塁できるランナーがいません');
      return;
    }
    setShowRecordAdvanceDialog(true);
  };

  const handleRunnerDialogCancel = () => {
    setShowAdvanceDialog(false);
    setShowRecordAdvanceDialog(false);
    setShowOutDialog(false);
    setPendingAdvancements([]);
    setPendingOuts([]);
  };

  const persistAdvances = async (advs: RunnerAdvancement[], results: AdvanceReasonResult[]) => {
    if (!matchId) return;

    const beforeRunners = { '1': runners['1'], '2': runners['2'], '3': runners['3'] };
    const beforeOuts = currentBSO.o;
    const next = applyAdvancementsToRunners(runners, advs);

    const builtEvents: RunnerEvent[] = [];
    results.forEach((result) => {
      const adv = advs.find((a) => a.runnerId === result.runnerId);
      if (!adv) return;
      builtEvents.push({
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

    // 1つのエラーで複数走者が進んだ場合に二重計上しないよう、同一位置・同一種類はまとめる
    const errorFielding: FieldingAction[] = [];
    results.forEach((result) => {
      if (result.reason !== 'error') return;
      const { errorBy, errorType } = result.errorDetail ?? {};
      if (!errorBy || !errorType) return;
      const position = positionAbbrToCode(errorBy);
      if (errorFielding.some((f) => f.position === position && f.action === errorType)) return;
      const playerId = defensiveLineup.find((e) => e.position === position)?.playerId?.trim();
      errorFielding.push({
        ...(playerId ? { playerId } : {}),
        position,
        action: errorType,
        quality: 'error',
      });
    });

    const scoredRunnersRaw: ScoredRunnerEntry[] = builtEvents
      .filter((e) => e.toBase === 'home')
      .map((e) => ({ runnerId: e.runnerId, isRBI: false }));

    const gsForTiebreak = await getGameState(matchId);
    const tiebreakId = gsForTiebreak?.tiebreak_runner_id ?? null;
    const scoredRunners = markTiebreakScoredRunners(scoredRunnersRaw, tiebreakId);

    updateRunnersRealtime(matchId, { '1b': next['1'], '2b': next['2'], '3b': next['3'] });

    if (scoredRunners.length > 0) {
      await addRunsRealtime(matchId, currentHalf, scoredRunners.length);
    }

    if (tiebreakId && !isTiebreakRunnerOnBase(tiebreakId, next)) {
      await updateTiebreakRunnerIdRealtime(matchId, null);
    }

    try {
      await saveMidPlayAtBat({
        matchId,
        type: resolvePlayType(builtEvents.map((e) => e.type)),
        resolvePlateAppearanceId: (playIndex) => ensurePlateAppearanceId(matchId, playIndex),
        inning: currentInning,
        topOrBottom: currentHalf,
        batterId: currentBatter?.playerId || '',
        pitcherId: currentPitcher?.playerId || '',
        battingOrder,
        situationBefore: {
          outs: beforeOuts,
          runners: beforeRunners,
          balls: currentBSO.b,
          strikes: currentBSO.s,
        },
        situationAfter: {
          outs: beforeOuts,
          runners: { '1': next['1'], '2': next['2'], '3': next['3'] },
          balls: currentBSO.b,
          strikes: currentBSO.s,
        },
        scoredRunners,
        runnerEvents: builtEvents,
        ...(errorFielding.length > 0 ? { playDetails: { fielding: errorFielding } } : {}),
      });
    } catch (error) {
      console.error('[runnerManager] Failed to save mid-play advance atBat:', error);
      alert(`走塁プレイの保存に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }

    setRunners(next);
    setShowAdvanceDialog(false);
    setShowRecordAdvanceDialog(false);
    setPendingAdvancements([]);
  };

  const handleRunnerAdvanceConfirm = async (results: AdvanceReasonResult[]) => {
    await persistAdvances([...pendingAdvancements], results);
  };

  const handleRecordAdvanceConfirm = async (payload: RecordAdvanceConfirmPayload) => {
    await persistAdvances(payload.advancements, payload.results);
  };

  const handleRunnerOutConfirm = async (results: OutReasonResult[]) => {
    if (!matchId) return;

    const outs = [...pendingOuts];
    const beforeRunners = { '1': runners['1'], '2': runners['2'], '3': runners['3'] };
    const gs = await getGameState(matchId);
    const beforeOuts = gs?.counts.o ?? currentBSO.o;
    const next = { ...previousRunners };
    outs.forEach(out => {
      if (out.fromBase === '1' || out.fromBase === '2' || out.fromBase === '3') next[out.fromBase] = null;
    });

    updateRunnersRealtime(matchId, { '1b': next['1'], '2b': next['2'], '3b': next['3'] });

    const addO = outs.length;
    const newO = Math.min(3, beforeOuts + addO);
    updateCountsRealtime(matchId, { o: newO });

    const builtEvents: RunnerEvent[] = [];
    results.forEach(result => {
      const out = outs.find(o => o.runnerId === result.runnerId);
      if (!out) return;
      builtEvents.push({
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

    const afterRunnersForSave =
      newO >= 3
        ? { '1': null, '2': null, '3': null }
        : { '1': next['1'], '2': next['2'], '3': next['3'] };

    try {
      await saveMidPlayAtBat({
        matchId,
        type: resolvePlayType(builtEvents.map((e) => e.type)),
        resolvePlateAppearanceId: (playIndex) => ensurePlateAppearanceId(matchId, playIndex),
        inning: currentInning,
        topOrBottom: currentHalf,
        batterId: currentBatter?.playerId || '',
        pitcherId: currentPitcher?.playerId || '',
        battingOrder,
        situationBefore: {
          outs: beforeOuts,
          runners: beforeRunners,
          balls: currentBSO.b,
          strikes: currentBSO.s,
        },
        situationAfter: {
          outs: newO,
          runners: afterRunnersForSave,
          balls: currentBSO.b,
          strikes: currentBSO.s,
        },
        scoredRunners: [],
        runnerEvents: builtEvents,
      });
    } catch (error) {
      console.error('[runnerManager] Failed to save mid-play out atBat:', error);
      alert(`アウトプレイの保存に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (newO >= 3) {
      const closed = await closeHalfInningRealtime(matchId);
      setRunners(localRunnersFromGameState(closed?.runners));
      clearPlateAppearanceId();
    } else {
      setRunners(next);
      if (gs?.tiebreak_runner_id && !isTiebreakRunnerOnBase(gs.tiebreak_runner_id, next)) {
        await updateTiebreakRunnerIdRealtime(matchId, null);
      }
    }
    setShowOutDialog(false);
    setPendingOuts([]);
  };

  const handleAddOutClick = () => setShowAddOutDialog(true);
  const handleSelectOutRunner = (runnerId: string, fromBase: '1' | '2' | '3') => setSelectedOutRunner({ runnerId, fromBase });
  const handleAddOutCancel = () => { setShowAddOutDialog(false); setSelectedOutRunner(null); };
  const handleAddOutConfirm = () => {
    if (!selectedOutRunner || !matchId) return;
    const { runnerId, fromBase } = selectedOutRunner;
    const name = getRunnerName(runnerId) || '走者';
    const next = { ...runners, [fromBase]: null } as RunnersState;
    setPreviousRunners(next);
    setPendingOuts([{ runnerId, runnerName: name, fromBase, outAtBase: fromBase }]);
    setShowAddOutDialog(false);
    setSelectedOutRunner(null);
    setShowOutDialog(true);
  };

  return {
    showAdvanceDialog,
    showRecordAdvanceDialog,
    pendingAdvancements,
    occupiedRunnersForAdvance,
    showOutDialog,
    pendingOuts,
    showAddOutDialog,
    selectedOutRunner,
    handleRunnerBaseClick,
    handleRecordAdvanceClick,
    handleRecordAdvanceConfirm,
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
