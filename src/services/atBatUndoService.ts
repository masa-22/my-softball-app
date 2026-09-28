import { AtBat, normalizeScoredRunners } from '../types/AtBat';
import { GameState } from '../types/GameState';
import { getAtBats, deleteAtBatByPlayId } from './atBatService';
import { getLineup } from './lineupService';
import { applyGameStateSync, getGameState } from './gameStateService';
import { Lineup } from '../types/Lineup';

/** 残った全 play（bat / steal / other）からライブ状態を復元する */
function deriveLiveFromAtBats(atBats: AtBat[]): {
  inning: number;
  half: 'top' | 'bottom';
  counts: { b: number; s: number; o: number };
  runners: { '1b': string | null; '2b': string | null; '3b': string | null };
} {
  if (atBats.length === 0) {
    return {
      inning: 1,
      half: 'top',
      counts: { b: 0, s: 0, o: 0 },
      runners: { '1b': null, '2b': null, '3b': null },
    };
  }
  const last = atBats[atBats.length - 1];
  const sa = last.situationAfter;
  if (sa.outs < 3) {
    return {
      inning: last.inning,
      half: last.topOrBottom,
      counts: { b: sa.balls, s: sa.strikes, o: sa.outs },
      runners: {
        '1b': sa.runners['1'],
        '2b': sa.runners['2'],
        '3b': sa.runners['3'],
      },
    };
  }
  if (last.topOrBottom === 'top') {
    return {
      inning: last.inning,
      half: 'bottom',
      counts: { b: 0, s: 0, o: 0 },
      runners: { '1b': null, '2b': null, '3b': null },
    };
  }
  return {
    inning: last.inning + 1,
    half: 'top',
    counts: { b: 0, s: 0, o: 0 },
    runners: { '1b': null, '2b': null, '3b': null },
  };
}

function rebuildScoresFromAtBats(atBats: AtBat[]): GameState['scores'] {
  const innings: GameState['scores']['innings'] = { '1': { top: 0, bottom: null } };
  let top_total = 0;
  let bottom_total = 0;
  let maxInning = 1;

  for (const ab of atBats) {
    const inn = ab.inning ?? 1;
    if (inn > maxInning) maxInning = inn;
    const key = String(inn);
    if (!innings[key]) innings[key] = { top: 0, bottom: null };
  }

  for (const ab of atBats) {
    const n = normalizeScoredRunners(ab.scoredRunners).length;
    if (n === 0) continue;
    const key = String(ab.inning ?? 1);
    if (!innings[key]) innings[key] = { top: 0, bottom: null };
    if (ab.topOrBottom === 'top') {
      innings[key].top = (innings[key].top ?? 0) + n;
      top_total += n;
    } else {
      innings[key].bottom = (innings[key].bottom ?? 0) + n;
      bottom_total += n;
    }
  }

  for (let i = 1; i <= maxInning; i++) {
    const k = String(i);
    if (!innings[k]) innings[k] = { top: 0, bottom: null };
    if (innings[k].top == null) innings[k].top = 0;
  }

  return { top_total, bottom_total, innings };
}

function findBattingSlot(lineup: Lineup['home'], batterId: string): number {
  const idx = lineup.findIndex((e) => e.playerId === batterId);
  return idx >= 0 ? idx : 0;
}

function getPitcherIdForHalf(lineup: Lineup, half: 'top' | 'bottom'): string | null {
  if (half === 'top') {
    const p = lineup.away.find((e) => e.position === '1');
    return p?.playerId || null;
  }
  const p = lineup.home.find((e) => e.position === '1');
  return p?.playerId || null;
}

export type UndoBatIndexResult = {
  homeBatIndex?: number;
  awayBatIndex?: number;
  batterId: string;
};

/**
 * 最新 index の play（bat / steal / other）を削除し、RTDB を残り記録から再同期する。
 * 打順は取り消した play の打者枠へ戻し、復元後の index を返す。
 */
export const undoLastBatAtBat = async (matchId: string): Promise<UndoBatIndexResult> => {
  const sorted = await getAtBats(matchId);
  if (sorted.length === 0) {
    throw new Error('取り消す記録がありません');
  }
  const lastPlay = sorted[sorted.length - 1];

  await deleteAtBatByPlayId(lastPlay.playId);

  const remaining = (await getAtBats(matchId)).sort((a, b) => a.index - b.index);
  const live = deriveLiveFromAtBats(remaining);
  const scores = rebuildScoresFromAtBats(remaining);

  const lineup = await getLineup(matchId);
  const half = lastPlay.topOrBottom;
  // 取り消し対象の打者に戻す（mid-play でも同一 PA の打者）
  const homeIdx =
        half === 'top'
          ? findBattingSlot(lineup.home, lastPlay.batterId)
          : undefined;
  const awayIdx =
        half === 'bottom'
          ? findBattingSlot(lineup.away, lastPlay.batterId)
          : undefined;

  const pitcherId = getPitcherIdForHalf(lineup, half);

  await applyGameStateSync(matchId, {
    current_inning: live.inning,
    top_bottom: live.half,
    counts: live.counts,
    runners: live.runners,
    scores,
    matchup: {
      batter_id: lastPlay.batterId,
      pitcher_id: pitcherId,
    },
    ...(homeIdx !== undefined ? { home_bat_index: homeIdx } : {}),
    ...(awayIdx !== undefined ? { away_bat_index: awayIdx } : {}),
  });

  // RTDB 反映を読み取りで確認してから戻す（初回取り消しで打順 effect が古い getGameState を掴むのを防ぐ）
  const expectHome = homeIdx !== undefined;
  const expectAway = awayIdx !== undefined;
  for (let i = 0; i < 25; i++) {
    const gs = await getGameState(matchId);
    if (!gs) break;
    const homeOk = !expectHome || gs.home_bat_index === homeIdx;
    const awayOk = !expectAway || gs.away_bat_index === awayIdx;
    const batterOk = gs.matchup?.batter_id === lastPlay.batterId;
    const halfOk = gs.top_bottom === live.half && gs.current_inning === live.inning;
    if (homeOk && awayOk && batterOk && halfOk) {
      break;
    }
    await new Promise((r) => setTimeout(r, 40));
  }

  return {
    ...(homeIdx !== undefined ? { homeBatIndex: homeIdx } : {}),
    ...(awayIdx !== undefined ? { awayBatIndex: awayIdx } : {}),
    batterId: lastPlay.batterId,
  };
};
