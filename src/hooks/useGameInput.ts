import { useState, useEffect, useRef, useCallback } from 'react';
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
  // mid-play は即 Firestore 保存するため、バッファには載せない想定
  const [runnerEvents, setRunnerEvents] = useState<RunnerEvent[]>([]);

  // 同一プレートアピアランスを束ねる ID
  const [plateAppearanceId, setPlateAppearanceId] = useState<string | null>(null);
  const plateAppearanceIdRef = useRef<string | null>(null);

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

  const clearPlateAppearanceId = useCallback(() => {
    plateAppearanceIdRef.current = null;
    setPlateAppearanceId(null);
  }, []);

  const clearRunnerEvents = useCallback(() => {
    setRunnerEvents([]);
    clearPlateAppearanceId();
  }, [clearPlateAppearanceId]);

  /** 打席内の最初の play 保存時に plateAppearanceId を確定する */
  const ensurePlateAppearanceId = useCallback((matchIdForPa: string, playIndex: number): string => {
    if (plateAppearanceIdRef.current) return plateAppearanceIdRef.current;
    const id = `${matchIdForPa}_pa_${String(playIndex).padStart(3, '0')}`;
    plateAppearanceIdRef.current = id;
    setPlateAppearanceId(id);
    return id;
  }, []);

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
    plateAppearanceId,
    ensurePlateAppearanceId,
    clearPlateAppearanceId,
    handleCountsChange,
    handleCountsReset
  };
};
