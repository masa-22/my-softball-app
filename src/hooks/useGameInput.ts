import { useState, useEffect } from 'react';
import { subscribeGameState, updateCountsRealtime, resetCountsRealtime } from '../services/gameStateService';
import { RunnerEvent } from '../types/AtBat';
import { PitchData } from '../types/PitchData';

export const useGameInput = (matchId: string | undefined) => {
  // ランナー状態
  const [runners, setRunners] = useState<{ '1': string | null; '2': string | null; '3': string | null }>({
    '1': null, '2': null, '3': null,
  });

  // BSO状態
  const [currentBSO, setCurrentBSO] = useState({ b: 0, s: 0, o: 0 });
  const [currentInningVal, setCurrentInningVal] = useState(1);
  const [currentHalf, setCurrentHalf] = useState<'top' | 'bottom'>('top');
  
  // 投球履歴
  const [pitches, setPitches] = useState<PitchData[]>([]);

  // ランナーイベント（打席内で発生した走塁イベントを一時保持）
  const [runnerEvents, setRunnerEvents] = useState<RunnerEvent[]>([]);

  // gameState の購読（リアルタイムリスナー）
  useEffect(() => {
    if (!matchId) return;
    
    const unsubscribe = subscribeGameState(matchId, (gs) => {
      if (gs) {
        setRunners({ 
          '1': gs.runners?.['1b'] ?? null, 
          '2': gs.runners?.['2b'] ?? null, 
          '3': gs.runners?.['3b'] ?? null 
        });
        setCurrentBSO({ 
          b: gs.counts?.b ?? 0, 
          s: gs.counts?.s ?? 0, 
          o: gs.counts?.o ?? 0 
        });
        setCurrentInningVal(gs.current_inning ?? 1);
        setCurrentHalf(gs.top_bottom ?? 'top');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [matchId]);

  // ランナー変更ハンドラ
  const handleRunnersChange = (newRunners: { '1': string | null; '2': string | null; '3': string | null }) => {
    setRunners(newRunners);
  };

  // カウント更新要求
  const handleCountsChange = (partial: { b?: number; s?: number; o?: number }) => {
    if (!matchId) return;
    const next = { ...currentBSO, ...partial };
    setCurrentBSO(next);
    updateCountsRealtime(matchId, next);
  };

  const handleCountsReset = () => {
    if (!matchId) return;
    resetCountsRealtime(matchId);
    // リアルタイムリスナーが自動的に更新するため、手動更新は不要
  };

  const addRunnerEvent = (event: RunnerEvent) => {
    setRunnerEvents(prev => [...prev, event]);
  };

  const clearRunnerEvents = () => {
    setRunnerEvents([]);
  };

  return {
    runners,
    setRunners,
    handleRunnersChange,
    currentBSO,
    setCurrentBSO,
    currentInningVal,
    currentHalf,
    setCurrentHalf,
    pitches,
    setPitches,
    runnerEvents,
    addRunnerEvent,
    clearRunnerEvents,
    handleCountsChange,
    handleCountsReset
  };
};

