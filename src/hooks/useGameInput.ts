import { useState, useEffect } from 'react';
import { getGameState, updateCountsRealtime, resetCountsRealtime } from '../services/gameStateService';
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

  // gameState の購読（リアルタイム）
  useEffect(() => {
    if (!matchId) return;
    const update = () => {
      const gs = getGameState(matchId);
      if (gs) {
        setRunners({ '1': gs.runners['1b'], '2': gs.runners['2b'], '3': gs.runners['3b'] });
        setCurrentBSO({ b: gs.counts.b, s: gs.counts.s, o: gs.counts.o });
        setCurrentInningVal(gs.current_inning);
        setCurrentHalf(gs.top_bottom);
      }
    };
    update();
    const t = window.setInterval(update, 500);
    const onStorage = (e: StorageEvent) => { if (e.key === 'game_states') update(); };
    window.addEventListener('storage', onStorage);
    return () => { window.clearInterval(t); window.removeEventListener('storage', onStorage); };
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
    const gs = getGameState(matchId);
    if (gs) {
      setCurrentBSO({ b: gs.counts.b, s: gs.counts.s, o: gs.counts.o });
    } else {
      setCurrentBSO({ b: 0, s: 0, o: 0 });
    }
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
    handleCountsChange,
    handleCountsReset
  };
};

