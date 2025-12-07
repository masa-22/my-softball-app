import { useState, useEffect, useRef } from 'react';
import { subscribeAtBats } from '../services/atBatService';
import { AtBat } from '../types/AtBat';

// グローバルなリスナー管理（matchIdごと）
const listeners = new Map<string, {
  unsubscribe: () => void;
  subscribers: Set<(atBats: AtBat[]) => void>;
  get currentAtBats(): AtBat[];
}>();

/**
 * atBatsを共有するカスタムフック
 * 同じmatchIdに対しては1つのリスナーのみを設定し、複数のコンポーネントで共有
 */
export const useAtBats = (matchId?: string): AtBat[] => {
  const [atBats, setAtBats] = useState<AtBat[]>([]);
  const callbackRef = useRef<((atBats: AtBat[]) => void) | undefined>(undefined);

  useEffect(() => {
    if (!matchId) {
      setAtBats([]);
      return;
    }

    // コールバックを設定
    callbackRef.current = (bats: AtBat[]) => {
      setAtBats(bats);
    };

    // 既存のリスナーがあるか確認
    let listener = listeners.get(matchId);

    if (!listener) {
      // 新しいリスナーを作成
      const subscribers = new Set<(atBats: AtBat[]) => void>();
      let currentAtBats: AtBat[] = [];
      
      const unsubscribe = subscribeAtBats(matchId, (bats) => {
        // すべての購読者に通知
        currentAtBats = bats;
        subscribers.forEach(callback => callback(bats));
      });

      listener = {
        unsubscribe,
        subscribers,
        get currentAtBats() { return currentAtBats; },
      };
      listeners.set(matchId, listener);
    }

    // このコンポーネントを購読者に追加
    listener.subscribers.add(callbackRef.current);

    // 既にデータがある場合は即座に設定
    if (listener.currentAtBats.length > 0) {
      setAtBats(listener.currentAtBats);
    }

    // クリーンアップ
    return () => {
      const currentListener = listeners.get(matchId);
      if (currentListener && callbackRef.current) {
        currentListener.subscribers.delete(callbackRef.current);
        
        // 購読者がいなくなったらリスナーを解除
        if (currentListener.subscribers.size === 0) {
          currentListener.unsubscribe();
          listeners.delete(matchId);
        }
      }
    };
  }, [matchId]);

  return atBats;
};

