import { useCallback, useEffect, useState } from 'react';
import { GameStatus } from '../types/Game';
import { getGame, setGameStatus } from '../services/gameService';

const STORAGE_KEYS = ['games', 'game_states'];

export const useGameStatus = (gameId?: string) => {
  const [status, setStatus] = useState<GameStatus | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const refresh = useCallback(() => {
    if (!gameId) {
      setStatus(null);
      return;
    }
    const game = getGame(gameId);
    setStatus(game?.status ?? null);
  }, [gameId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!gameId) return;
    const handleStorage = (event: StorageEvent) => {
      if (!event.key) return;
      if (STORAGE_KEYS.includes(event.key)) {
        refresh();
      }
    };
    window.addEventListener('storage', handleStorage);
    const interval = window.setInterval(refresh, 1500);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.clearInterval(interval);
    };
  }, [gameId, refresh]);

  const startIfScheduled = useCallback(async () => {
    if (!gameId) return;
    const game = getGame(gameId);
    if (!game || game.status !== 'SCHEDULED') return;
    setTransitioning(true);
    try {
      setGameStatus(gameId, 'in_progress');
      setStatus('PLAYING');
    } finally {
      setTransitioning(false);
    }
  }, [gameId]);

  const finishGame = useCallback(async () => {
    if (!gameId) return false;
    const game = getGame(gameId);
    if (!game) return false;
    if (game.status === 'FINISHED') return true;
    setTransitioning(true);
    try {
      setGameStatus(gameId, 'finished');
      setStatus('FINISHED');
      return true;
    } finally {
      setTransitioning(false);
    }
  }, [gameId]);

  return {
    status,
    isScheduled: status === 'SCHEDULED',
    isPlaying: status === 'PLAYING',
    isFinished: status === 'FINISHED',
    transitioning,
    refresh,
    startIfScheduled,
    finishGame,
  };
};

export type UseGameStatusReturn = ReturnType<typeof useGameStatus>;

