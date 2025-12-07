import { useCallback, useEffect, useState } from 'react';
import { GameStatus } from '../types/Game';
import { getGame, setGameStatus } from '../services/gameService';

const STORAGE_KEYS = ['games'];

export const useGameStatus = (gameId?: string) => {
  const [status, setStatus] = useState<GameStatus | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const refresh = useCallback(async () => {
    if (!gameId) {
      setStatus(null);
      return;
    }
    const game = await getGame(gameId);
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
    const game = await getGame(gameId);
    if (!game || game.status !== 'SCHEDULED') return;
    setTransitioning(true);
    try {
      await setGameStatus(gameId, 'in_progress');
      await refresh();
    } catch (error) {
      console.error('Error starting game:', error);
    } finally {
      setTransitioning(false);
    }
  }, [gameId, refresh]);

  const finishGame = useCallback(async () => {
    if (!gameId) return false;
    const game = await getGame(gameId);
    if (!game) return false;
    if (game.status === 'FINISHED') return true;
    setTransitioning(true);
    try {
      await setGameStatus(gameId, 'finished');
      await refresh();
      return true;
    } catch (error) {
      console.error('Error finishing game:', error);
      return false;
    } finally {
      setTransitioning(false);
    }
  }, [gameId, refresh]);

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

