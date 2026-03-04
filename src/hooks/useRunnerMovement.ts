/**
 * ランナー動き入力の状態・ロジック（RunnerMovementInput の処理担当）
 */
import { useState, useEffect, useMemo } from 'react';
import { getPlayers } from '../services/playerService';
import { BATTING_RESULTS } from '../data/softball/battingResults';
import type { ScoredRunnerEntry } from '../types/AtBat';
import type { RunnerMovementInputProps, RunnerMovementResult, AdvanceErrorDetail, BaseKey } from '../components/play/RunnerMovementInput.types';
import type { RunnerAdvancement, AdvanceReasonResult } from '../components/play/runner/AdvanceReasonDialog';
import type { RunnerOut, OutReasonResult } from '../components/play/runner/OutReasonDialog';

function getAdvanceDistance(result: string): number {
  switch (result) {
    case 'single':
    case 'droppedthird':
    case 'error':
    case 'walk':
    case 'deadball':
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
}

function advanceRunnersBy(
  before: { '1': string | null; '2': string | null; '3': string | null },
  batterId: string | null,
  n: number
): { after: { '1': string | null; '2': string | null; '3': string | null }; scored: string[] } {
  const after: { '1': string | null; '2': string | null; '3': string | null } = { '1': null, '2': null, '3': null };
  const scored: string[] = [];
  const bases = ['1', '2', '3'] as const;
  for (let i = bases.length - 1; i >= 0; i--) {
    const base = bases[i];
    const runner = before[base];
    if (!runner) continue;
    const startIndex = i + 1;
    const targetIndex = startIndex + n;
    if (targetIndex >= 4) {
      scored.push(runner);
    } else {
      const targetBase = String(targetIndex) as '1' | '2' | '3';
      after[targetBase] = runner;
    }
  }
  if (batterId) {
    const batterTarget = n;
    if (batterTarget >= 4) {
      scored.push(batterId);
    } else if (batterTarget > 0) {
      const targetBase = String(batterTarget) as '1' | '2' | '3';
      if (!after[targetBase]) after[targetBase] = batterId;
    }
  }
  return { after, scored };
}

export function useRunnerMovement(props: RunnerMovementInputProps) {
  const {
    onComplete,
    initialRunners = { '1': null, '2': null, '3': null },
    battingResult = '',
    batterId = '',
    initialOuts = 0,
    presetOutsAfter = null,
    battingResultLabel: externalBattingResultLabel,
    offenseTeamId,
    playDetails,
  } = props;

  const [beforeRunners] = useState(initialRunners);

  const getInitialAfterRunners = (): { '1': string | null; '2': string | null; '3': string | null } => {
    const n = getAdvanceDistance(battingResult);
    if (battingResult === 'sacrifice_fly' || battingResult === 'sacrifice_bunt') {
      const after = { ...initialRunners };
      if (after['3']) after['3'] = null;
      return after;
    }
    if (battingResult === 'error' || battingResult === 'walk' || battingResult === 'deadball') {
      if (!batterId) return { ...initialRunners };
      const after = { ...initialRunners };
      if (initialRunners['1']) {
        after['2'] = initialRunners['1'];
        if (initialRunners['2']) {
          after['3'] = initialRunners['2'];
        } else if (initialRunners['3']) {
          after['3'] = initialRunners['3'];
        }
      }
      after['1'] = batterId;
      return after;
    }
    if (!batterId || n === 0) return { ...initialRunners };
    const { after } = advanceRunnersBy(initialRunners, batterId, n);
    return after;
  };

  const [scoredRunners, setScoredRunners] = useState<ScoredRunnerEntry[]>([]);
  const [showScoreConfirm, setShowScoreConfirm] = useState(false);
  const [pendingScores, setPendingScores] = useState<string[]>([]);
  const [scoredRunnerReasons, setScoredRunnerReasons] = useState<Record<string, 'hit' | 'error' | 'steal' | 'wildpitch' | 'passball'>>({});
  const [advanceErrorDetail, setAdvanceErrorDetail] = useState<AdvanceErrorDetail | null>(null);
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [showOutDialog, setShowOutDialog] = useState(false);
  const [pendingAdvancements, setPendingAdvancements] = useState<RunnerAdvancement[]>([]);
  const [pendingOuts, setPendingOuts] = useState<RunnerOut[]>([]);
  const [showRunnerSelectDialog, setShowRunnerSelectDialog] = useState(false);
  const [selectedTargetBase, setSelectedTargetBase] = useState<BaseKey | null>(null);
  const [candidateRunners, setCandidateRunners] = useState<Array<{ id: string; name: string; fromBase: '1' | '2' | '3' }>>([]);
  const [selectedRunnerId, setSelectedRunnerId] = useState<string | null>(null);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [showOutRunnerDialog, setShowOutRunnerDialog] = useState(false);
  const [outDetailsLocked, setOutDetailsLocked] = useState(() => {
    return (
      ((battingResult === 'flyout' || battingResult === 'sacrifice_fly') && !!batterId && !!playDetails?.position) ||
      ((battingResult === 'strikeout_swinging' || battingResult === 'strikeout_looking') && !!batterId)
    );
  });
  const [selectedOutRunners, setSelectedOutRunners] = useState<Array<{ runnerId: string; fromBase: BaseKey; outAtBase: BaseKey }>>(() => {
    if ((battingResult === 'flyout' || battingResult === 'sacrifice_fly') && batterId && playDetails?.position) {
      return [{ runnerId: batterId, fromBase: 'home', outAtBase: '1' }];
    }
    if ((battingResult === 'strikeout_swinging' || battingResult === 'strikeout_looking') && batterId) {
      return [{ runnerId: batterId, fromBase: 'home', outAtBase: 'home' }];
    }
    return [];
  });
  const [afterRunners, setAfterRunners] = useState(() => getInitialAfterRunners());
  const [selectedBase, setSelectedBase] = useState<BaseKey | null>(null);
  const [outsAfter, setOutsAfter] = useState(() => {
    if (presetOutsAfter != null) {
      return Math.max(initialOuts, Math.min(3, presetOutsAfter));
    }
    const isOut = ['groundout', 'flyout', 'strikeout_swinging', 'strikeout_looking', 'bunt_out', 'sacrifice_fly', 'sacrifice_bunt'].includes(battingResult);
    if (isOut) return Math.min(3, initialOuts + 1);
    return initialOuts;
  });
  const [outDetails, setOutDetails] = useState<Array<{ runnerId: string; base: string; threwPosition: string; caughtPosition: string }>>(() => {
    if ((battingResult === 'flyout' || battingResult === 'sacrifice_fly') && batterId && playDetails?.position) {
      return [{ runnerId: batterId, base: '1', threwPosition: '', caughtPosition: playDetails.position }];
    }
    if ((battingResult === 'strikeout_swinging' || battingResult === 'strikeout_looking') && batterId) {
      return [{ runnerId: batterId, base: 'home', threwPosition: '', caughtPosition: '2' }];
    }
    return [];
  });
  const [offensePlayers, setOffensePlayers] = useState<any[]>([]);

  useEffect(() => {
    if (offenseTeamId == null) {
      setOffensePlayers([]);
      return;
    }
    getPlayers(offenseTeamId)
      .then(setOffensePlayers)
      .catch((err) => {
        console.error('Error loading players:', err);
        setOffensePlayers([]);
      });
  }, [offenseTeamId]);

  useEffect(() => {
    if (presetOutsAfter == null) return;
    setOutsAfter((prev) => {
      const clamped = Math.max(initialOuts, Math.min(3, presetOutsAfter));
      if (prev === clamped) return prev;
      return clamped;
    });
  }, [presetOutsAfter, initialOuts]);

  const currentBatter = useMemo(() => {
    if (!batterId || offenseTeamId == null) return null;
    return offensePlayers.find((p) => p.playerId === batterId) || null;
  }, [batterId, offensePlayers, offenseTeamId]);

  const getPlayerName = (playerId: string | null) => {
    if (!playerId) return '';
    const player = offensePlayers.find((p) => p.playerId === playerId);
    if (!player) return '';
    return `${player.familyName} ${player.givenName}`.trim();
  };

  const getRunnerDisplayName = (playerId: string | null) => {
    if (!playerId) return '';
    if (playerId === batterId && currentBatter) {
      return `${currentBatter.familyName} ${currentBatter.givenName}`.trim();
    }
    return getPlayerName(playerId);
  };

  const battingResultLabelMap: Record<string, string> = {
    single: 'ヒット（シングル）',
    double: 'ツーベースヒット',
    triple: 'スリーベースヒット',
    homerun: 'ホームラン',
    runninghomerun: 'ランニングホームラン',
    groundout: 'ゴロアウト',
    flyout: 'フライアウト',
    bunt_out: 'バント失敗',
    sacrifice_bunt: '犠打（バント）',
    sacrifice_fly: '犠牲フライ',
    error: 'エラー',
    walk: '四球',
    deadball: '死球',
  };

  const fallbackBattingResultLabel = useMemo(() => {
    if (!battingResult) return '-';
    return battingResultLabelMap[battingResult] || battingResult;
  }, [battingResult]);

  const battingResultLabel =
    externalBattingResultLabel && externalBattingResultLabel.length > 0 ? externalBattingResultLabel : fallbackBattingResultLabel;

  const outsIncreased = outsAfter - initialOuts;
  const filledOutDetails = outDetails.length;
  const needOutDetails = outsIncreased > filledOutDetails;

  useEffect(() => {
    if (outsIncreased === 0) {
      setOutDetails([]);
      setOutDetailsLocked(false);
      setSelectedOutRunners([]);
      setShowOutRunnerDialog(false);
      return;
    }
    if (needOutDetails && !outDetailsLocked && !showOutRunnerDialog) {
      setShowOutRunnerDialog(true);
    }
  }, [outsIncreased, needOutDetails, outDetailsLocked, showOutRunnerDialog]);

  useEffect(() => {
    const scored: string[] = [];
    const n = getAdvanceDistance(battingResult);
    if (n > 0) {
      (['1', '2', '3'] as const).forEach((base) => {
        const pid = beforeRunners[base];
        if (!pid) return;
        if (!Object.values(afterRunners).includes(pid)) scored.push(pid);
      });
      if (batterId && !Object.values(afterRunners).includes(batterId)) scored.push(batterId);
    } else if (battingResult === 'sacrifice_bunt' || battingResult === 'sacrifice_fly') {
      const runner3 = beforeRunners['3'];
      if (runner3 && !Object.values(afterRunners).includes(runner3)) scored.push(runner3);
    }
    if (scored.length > 0) {
      const merged = [...scored];
      scoredRunners.forEach((e) => {
        if (!merged.includes(e.runnerId)) merged.push(e.runnerId);
      });
      setPendingScores(merged);
      if (!showScoreConfirm && (scoredRunners.length === 0 || merged.some((r) => !scoredRunners.some((e) => e.runnerId === r)))) {
        setShowScoreConfirm(true);
      }
    }
  }, [beforeRunners, afterRunners, battingResult, batterId, scoredRunners, showScoreConfirm]);

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

  const baseOptions: Array<{ value: BaseKey; label: string }> = [
    { value: '1', label: '一塁' },
    { value: '2', label: '二塁' },
    { value: '3', label: '三塁' },
    { value: 'home', label: 'ホーム' },
  ];

  const possibleOutRunners = useMemo(() => {
    const runners: Array<{ id: string; name: string; label: string; fromBase: BaseKey }> = [];
    if (batterId && currentBatter) {
      runners.push({
        id: batterId,
        name: `${currentBatter.familyName} ${currentBatter.givenName}`.trim(),
        label: '打者',
        fromBase: 'home',
      });
    }
    (['1', '2', '3'] as const).forEach((base) => {
      const playerId = beforeRunners[base];
      if (playerId) {
        runners.push({
          id: playerId,
          name: getPlayerName(playerId),
          label: base === '1' ? '一塁走者' : base === '2' ? '二塁走者' : '三塁走者',
          fromBase: base,
        });
      }
    });
    return runners;
  }, [batterId, currentBatter, beforeRunners]);

  const outDetailMap = useMemo(() => {
    const map: Record<string, { threwPosition: string; caughtPosition: string }> = {};
    outDetails.forEach((d) => {
      map[d.runnerId] = { threwPosition: d.threwPosition, caughtPosition: d.caughtPosition };
    });
    return map;
  }, [outDetails]);

  const outRunnerPresetSelections = useMemo(() => {
    return selectedOutRunners.map((sel) => {
      const detail = outDetailMap[sel.runnerId];
      return {
        runnerId: sel.runnerId,
        fromBase: sel.fromBase,
        outAtBase: sel.outAtBase,
        threwPosition: detail?.threwPosition,
        caughtPosition: detail?.caughtPosition,
      };
    });
  }, [selectedOutRunners, outDetailMap]);

  const getPositionLabelByValue = (value: string) => {
    if (!value) return '-';
    const option = positionOptions.find((opt) => opt.value === value);
    return option ? option.label : value;
  };

  const handleAfterBaseClick = (base: BaseKey) => {
    if (base === 'home') {
      const candidates: Array<{ id: string; name: string; fromBase: '1' | '2' | '3' }> = [];
      if (afterRunners['3']) {
        const player = offensePlayers.find((p) => p.playerId === afterRunners['3']);
        if (player) candidates.push({ id: afterRunners['3']!, name: `${player.familyName} ${player.givenName}`.trim(), fromBase: '3' });
      }
      if (candidates.length > 0) {
        setCandidateRunners(candidates);
        setSelectedTargetBase('home');
        setSelectedRunnerId(candidates[0].id);
        setShowRunnerSelectDialog(true);
      } else alert('本塁に進むランナーがいません');
      return;
    }
    const targetBaseNum = base === '1' ? 1 : base === '2' ? 2 : 3;
    const fromBaseNum = targetBaseNum - 1;
    const fromBase = fromBaseNum === 0 ? null : (String(fromBaseNum) as '1' | '2' | '3');
    const candidates: Array<{ id: string; name: string; fromBase: '1' | '2' | '3' }> = [];
    if (fromBase && afterRunners[fromBase]) {
      const player = offensePlayers.find((p) => p.playerId === afterRunners[fromBase]);
      if (player) candidates.push({ id: afterRunners[fromBase]!, name: `${player.familyName} ${player.givenName}`.trim(), fromBase });
    }
    if (base === '1' && batterId) {
      const player = offensePlayers.find((p) => p.playerId === batterId);
      if (player && !candidates.find((c) => c.id === batterId)) {
        candidates.push({ id: batterId, name: `${player.familyName} ${player.givenName}`.trim(), fromBase: '1' });
      }
    }
    if (candidates.length === 0) {
      alert(`${base === '1' ? '一' : base === '2' ? '二' : '三'}塁に進むランナーがいません`);
      return;
    }
    setCandidateRunners(candidates);
    setSelectedTargetBase(base);
    setSelectedRunnerId(candidates[0].id);
    setShowRunnerSelectDialog(true);
  };

  const handleCompleteClick = () => {
    if (needOutDetails) {
      const isValid = outDetails.every((d) => d.runnerId && d.base && d.caughtPosition);
      if (!isValid) {
        alert('アウト詳細をすべて入力してください');
        return;
      }
    }
    setShowFinalConfirm(true);
  };

  const handleFinalConfirm = () => {
    if (onComplete) {
      const result: RunnerMovementResult = {
        afterRunners,
        outsAfter,
        scoredRunners,
        outDetails,
        scoredRunnerReasons: Object.keys(scoredRunnerReasons).length > 0 ? scoredRunnerReasons : undefined,
        advanceErrorDetail: advanceErrorDetail ?? undefined,
      };
      onComplete(result);
    }
    setShowFinalConfirm(false);
  };

  const handleFinalCancel = () => setShowFinalConfirm(false);

  const handleAdvanceConfirm = (results: AdvanceReasonResult[]) => {
    const newReasons = { ...scoredRunnerReasons };
    results.forEach((result) => {
      const adv = pendingAdvancements.find((a) => a.runnerId === result.runnerId);
      if (adv && adv.toBase === 'home' && ['hit', 'error', 'steal', 'wildpitch', 'passball'].includes(result.reason)) {
        newReasons[result.runnerId] = result.reason as 'hit' | 'error' | 'steal' | 'wildpitch' | 'passball';
      }
    });
    setScoredRunnerReasons(newReasons);
    const errResult = results.find((r) => r.reason === 'error' && r.errorDetail?.errorBy && r.errorDetail?.errorType);
    if (errResult?.errorDetail?.errorBy && errResult.errorDetail?.errorType) {
      setAdvanceErrorDetail({ position: errResult.errorDetail.errorBy, errorType: errResult.errorDetail.errorType as 'throw' | 'catch' });
    } else {
      setAdvanceErrorDetail(null);
    }
    setShowAdvanceDialog(false);
    setPendingAdvancements([]);
  };

  const handleOutConfirm = (_results: OutReasonResult[]) => {
    setShowOutDialog(false);
    setPendingOuts([]);
  };

  const handleDialogCancel = () => {
    setShowAdvanceDialog(false);
    setShowOutDialog(false);
    setPendingAdvancements([]);
    setPendingOuts([]);
  };

  const nonRbiReasons = ['wildpitch', 'passball', 'passedball', 'error', 'steal'];

  const handleConfirmScores = () => {
    setScoredRunners(
      pendingScores.map((runnerId) => ({
        runnerId,
        isRBI: !nonRbiReasons.includes(scoredRunnerReasons[runnerId] ?? ''),
      }))
    );
    const newReasons = { ...scoredRunnerReasons };
    const battingResultDef = battingResult ? BATTING_RESULTS[battingResult as keyof typeof BATTING_RESULTS] : null;
    const isHit = battingResultDef?.stats?.isHit;
    if (isHit) {
      pendingScores.forEach((runnerId) => {
        if (!newReasons[runnerId]) newReasons[runnerId] = 'hit';
      });
    }
    setScoredRunnerReasons(newReasons);
    setShowScoreConfirm(false);
    setPendingScores([]);
  };

  const handleCancelScores = () => {
    setShowScoreConfirm(false);
    setPendingScores([]);
  };

  const handleOpenOutSelection = () => {
    setOutDetailsLocked(false);
    setShowOutRunnerDialog(true);
  };

  const handleOutRunnerDialogCancel = () => {
    setShowOutRunnerDialog(false);
    setSelectedOutRunners([]);
    setOutDetails([]);
    setOutDetailsLocked(false);
    setOutsAfter(initialOuts);
  };

  const handleOutRunnerDialogConfirm = (
    selections: Array<{ runnerId: string; fromBase: BaseKey; outAtBase: BaseKey; threwPosition: string; caughtPosition: string }>
  ) => {
    setSelectedOutRunners(selections.map(({ runnerId, fromBase, outAtBase }) => ({ runnerId, fromBase, outAtBase })));
    setShowOutRunnerDialog(false);
    setOutDetails(
      selections.map((sel) => ({
        runnerId: sel.runnerId,
        base: sel.outAtBase,
        threwPosition: sel.threwPosition,
        caughtPosition: sel.caughtPosition,
      }))
    );
    setOutDetailsLocked(true);
    const next = { ...afterRunners };
    selections.forEach((sel) => {
      (['1', '2', '3'] as const).forEach((base) => {
        if (next[base] === sel.runnerId) next[base] = null;
      });
    });
    setAfterRunners(next);
  };

  const handleRunnerSelectConfirm = () => {
    if (!selectedTargetBase || !selectedRunnerId) return;
    const next = { ...afterRunners };
    (['1', '2', '3'] as const).forEach((base) => {
      if (next[base] === selectedRunnerId) next[base] = null;
    });
    if (selectedTargetBase !== 'home') next[selectedTargetBase] = selectedRunnerId;
    setAfterRunners(next);
    setShowRunnerSelectDialog(false);
    const player = offensePlayers.find((p) => p.playerId === selectedRunnerId);
    const fromBase = candidateRunners.find((r) => r.id === selectedRunnerId)?.fromBase;
    if (player && fromBase) {
      setPendingAdvancements([
        {
          runnerId: selectedRunnerId,
          runnerName: `${player.familyName} ${player.givenName}`.trim(),
          fromBase,
          toBase: selectedTargetBase,
        },
      ]);
      setShowAdvanceDialog(true);
    }
    if (selectedTargetBase === 'home') {
      const offBase: string[] = [];
      (['1', '2', '3'] as const).forEach((base) => {
        const pid = beforeRunners[base];
        if (pid && !Object.values(next).includes(pid)) offBase.push(pid);
      });
      if (batterId && !Object.values(next).includes(batterId)) offBase.push(batterId);
      setPendingScores((prev) => {
        const merged = [...offBase];
        prev.forEach((r) => {
          if (!merged.includes(r)) merged.push(r);
        });
        return merged;
      });
      setShowScoreConfirm(true);
    }
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

  return {
    beforeRunners,
    afterRunners,
    setAfterRunners,
    selectedBase,
    setSelectedBase,
    initialOuts,
    outsAfter,
    setOutsAfter,
    scoredRunners,
    outDetails,
    needOutDetails,
    outsIncreased,
    outDetailsLocked,
    selectedOutRunners,
    showFinalConfirm,
    showRunnerSelectDialog,
    selectedTargetBase,
    candidateRunners,
    selectedRunnerId,
    setSelectedRunnerId,
    showAdvanceDialog,
    pendingAdvancements,
    showOutDialog,
    pendingOuts,
    showOutRunnerDialog,
    showScoreConfirm,
    pendingScores,
    battingResult,
    battingResultLabel,
    positionOptions,
    baseOptions,
    outDetailMap,
    outRunnerPresetSelections,
    possibleOutRunners,
    getPlayerName,
    getRunnerDisplayName,
    getPositionLabelByValue,
    handleAfterBaseClick,
    handleCompleteClick,
    handleFinalConfirm,
    handleFinalCancel,
    handleAdvanceConfirm,
    handleOutConfirm,
    handleDialogCancel,
    handleConfirmScores,
    handleCancelScores,
    handleOpenOutSelection,
    handleOutRunnerDialogCancel,
    handleOutRunnerDialogConfirm,
    handleRunnerSelectConfirm,
    handleRunnerSelectCancel,
    onCancel: props.onCancel,
  };
}
