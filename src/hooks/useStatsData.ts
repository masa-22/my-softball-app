import { useCallback, useEffect, useState } from 'react';
import { getGame } from '../services/gameService';
import { getLineup } from '../services/lineupService';
import { getParticipations } from '../services/participationService';
import { getPlayers } from '../services/playerService';
import { getAtBats } from '../services/atBatService';
import { useAtBats } from './useAtBats';
import { POSITIONS } from '../data/softball/positions';
import { BATTING_RESULTS } from '../data/softball/battingResults';
import { LineupEntry } from '../types/Lineup';
import { ParticipationEntry } from '../types/Participation';
import { Player } from '../types/Player';
import { AtBat } from '../types/AtBat';

type Side = 'home' | 'away';

export interface PlayerStats {
  plateAppearances: number; // 打席
  atBats: number;           // 打数
  hits: number;              // 安打
  runs: number;              // 得点
  rbi: number;               // 打点
  sacrifice: number;         // 犠打
  fourBall: number;          // 四死球
  strikeouts: number;        // 三振
  stolenBases: number;       // 盗塁
  homeRuns: number;          // 本塁打
  triples: number;           // 三塁打
  doubles: number;           // 二塁打
  singles: number;           // 単打
  assists: number;           // 捕殺
  putouts: number;           // 刺殺
  errors: number;            // 失策
}

export interface StatsRowData {
  key: string;
  battingOrder: number;
  playerId: string | null;
  name: string;
  positionLabel: string;
  roleLabel: string;
  isSubstitute: boolean;
  stats: PlayerStats;
  orderLabel?: string;
}

export interface StatsTeamData {
  teamName: string;
  side: Side;
  rows: StatsRowData[];
}

export interface StatsData {
  home: StatsTeamData;
  away: StatsTeamData;
}

const getPositionLabel = (position?: string | null) => {
  if (!position) return '';
  return POSITIONS[position]?.shortName || position || '';
};

const formatPlayerName = (player: Player | undefined) => {
  if (!player) return '';
  const family = player.familyName ?? '';
  const given = player.givenName ?? '';
  return `${family} ${given}`.trim();
};

const calculatePlayerStats = (
  playerId: string,
  atBats: AtBat[],
  side: Side
): PlayerStats => {
  const stats: PlayerStats = {
    plateAppearances: 0,
    atBats: 0,
    hits: 0,
    runs: 0,
    rbi: 0,
    sacrifice: 0,
    fourBall: 0,
    strikeouts: 0,
    stolenBases: 0,
    homeRuns: 0,
    triples: 0,
    doubles: 0,
    singles: 0,
    assists: 0,
    putouts: 0,
    errors: 0,
  };

  atBats.forEach((atBat) => {
    const isPlayerSide = (atBat.topOrBottom === 'top' && side === 'home') ||
                         (atBat.topOrBottom === 'bottom' && side === 'away');

    // 打撃統計（打者として）
    if (atBat.type === 'bat' && atBat.batterId === playerId && isPlayerSide) {
      // 打席
      stats.plateAppearances++;

      if (atBat.result) {
        const resultDef = BATTING_RESULTS[atBat.result.type];
        if (resultDef) {
          // 打数
          if (resultDef.stats.isAB) {
            stats.atBats++;
          }

          // 安打
          if (resultDef.stats.isHit) {
            stats.hits++;
            // 単打、二塁打、三塁打、本塁打を分類
            if (atBat.result.type === 'single') {
              stats.singles++;
            } else if (atBat.result.type === 'double') {
              stats.doubles++;
            } else if (atBat.result.type === 'triple') {
              stats.triples++;
            } else if (atBat.result.type === 'homerun' || atBat.result.type === 'runninghomerun') {
              stats.homeRuns++;
            }
          }

          // 犠打
          if (resultDef.stats.isSacrifice) {
            stats.sacrifice++;
          }

          // 四死球
          if (resultDef.stats.isFourBall) {
            stats.fourBall++;
          }

          // 三振
          if (atBat.result.type === 'strikeout_swinging' ||
              atBat.result.type === 'strikeout_looking' ||
              atBat.result.type === 'droppedthird') {
            stats.strikeouts++;
          }
        }
      }

      // 打点
      if (atBat.result?.rbi !== undefined && atBat.result.rbi > 0) {
        stats.rbi += atBat.result.rbi;
      }
    }

    // 得点（ランナーとして）
    if (atBat.scoredRunners && atBat.scoredRunners.includes(playerId) && isPlayerSide) {
      stats.runs++;
    }

    // 盗塁（ランナーイベント）
    if (atBat.runnerEvents) {
      atBat.runnerEvents.forEach((event) => {
        if (event.runnerId === playerId && event.type === 'steal' && !event.isOut && isPlayerSide) {
          stats.stolenBases++;
        }
      });
    }

    // 守備統計（守備者として）
    if (atBat.playDetails?.fielding) {
      atBat.playDetails.fielding.forEach((fieldingAction) => {
        if (fieldingAction.playerId === playerId) {
          if (fieldingAction.action === 'assist') {
            stats.assists++;
          } else if (fieldingAction.action === 'putout') {
            stats.putouts++;
          } else if (fieldingAction.action === 'error') {
            stats.errors++;
          }
        }
      });
    }
  });

  return stats;
};

const ensureParticipantEntries = (
  order: number,
  side: Side,
  participants: ParticipationEntry[],
  lineupEntry?: LineupEntry
): ParticipationEntry[] => {
  if (participants.length > 0) return participants;

  if (lineupEntry?.playerId) {
    return [
      {
        playerId: lineupEntry.playerId,
        battingOrder: order,
        side,
        status: 'starter',
        startInning: 1,
        endInning: null,
        positionAtStart: lineupEntry.position || null,
      },
    ];
  }

  return [];
};

const roleLabelMap: Record<string, string> = {
  starter: '',
  pinch_hitter: '代打',
  pinch_runner: '代走',
  substituted: '',
  finished: '',
};

const getStatusPriority = (entry: ParticipationEntry) => {
  if (entry.status === 'starter' || entry.status === 'substituted' || entry.status === 'finished') {
    return 0;
  }
  return 1;
};

const resolveBattingOrder = (entry: ParticipationEntry, lineupEntries: LineupEntry[]): number | null => {
  const directOrder = entry.battingOrder ?? null;
  if (directOrder && directOrder >= 1 && directOrder <= 15) {
    return directOrder;
  }
  const lineupMatch = lineupEntries.find(
    (lineupEntry) => lineupEntry.playerId && lineupEntry.playerId === entry.playerId
  );
  if (lineupMatch?.battingOrder && lineupMatch.battingOrder >= 1 && lineupMatch.battingOrder <= 15) {
    return lineupMatch.battingOrder;
  }
  return null;
};

const buildRowsForSide = ({
  side,
  lineupEntries,
  participationEntries,
  players,
  atBats,
}: {
  side: Side;
  lineupEntries: LineupEntry[];
  participationEntries: ParticipationEntry[];
  players: Player[];
  atBats: AtBat[];
}): StatsRowData[] => {
  const rows: StatsRowData[] = [];
  const playersById = players.reduce<Record<string, Player>>((acc, player) => {
    acc[player.playerId] = player;
    return acc;
  }, {});

  const lineupByOrder = lineupEntries.reduce<Record<number, LineupEntry>>((acc, entry) => {
    if (entry.battingOrder) {
      acc[entry.battingOrder] = entry;
    }
    return acc;
  }, {});

  const unassignedParticipants: ParticipationEntry[] = [];
  const participationByOrder = participationEntries.reduce<Record<number, ParticipationEntry[]>>((acc, entry) => {
    let resolvedOrder = resolveBattingOrder(entry, lineupEntries);

    // 打順が不明な場合、交代元の選手を探して打順を引き継ぐ
    if (!resolvedOrder && entry.startInning) {
      const candidates = participationEntries.filter((p) =>
        p.endInning === entry.startInning &&
        resolveBattingOrder(p, lineupEntries)
      );

      if (candidates.length === 1) {
        resolvedOrder = resolveBattingOrder(candidates[0], lineupEntries);
      } else if (candidates.length > 1) {
        resolvedOrder = resolveBattingOrder(candidates[0], lineupEntries);
      }
    }

    if (!resolvedOrder) {
      unassignedParticipants.push(entry);
      return acc;
    }
    const list = acc[resolvedOrder] || (acc[resolvedOrder] = []);
    list.push(entry);
    return acc;
  }, {});

  for (let order = 1; order <= 10; order++) {
    const lineupEntry = lineupByOrder[order];
    const participants = ensureParticipantEntries(
      order,
      side,
      participationByOrder[order]?.slice() || [],
      lineupEntry
    );

    const baseOrderLabel = order === 10 ? 'FP' : String(order);

    if (!participants.length) {
      rows.push({
        key: `${side}-${order}-empty`,
        battingOrder: order,
        playerId: null,
        name: '',
        positionLabel: lineupEntry ? getPositionLabel(lineupEntry.position) : '',
        roleLabel: '',
        isSubstitute: false,
        stats: {
          plateAppearances: 0,
          atBats: 0,
          hits: 0,
          runs: 0,
          rbi: 0,
          sacrifice: 0,
          fourBall: 0,
          strikeouts: 0,
          stolenBases: 0,
          homeRuns: 0,
          triples: 0,
          doubles: 0,
          singles: 0,
          assists: 0,
          putouts: 0,
          errors: 0,
        },
        orderLabel: baseOrderLabel,
      });
      continue;
    }

    participants.sort((a, b) => {
      const aPriority = getStatusPriority(a);
      const bPriority = getStatusPriority(b);
      const aStart = a.startInning ?? (aPriority === 0 ? 1 : 999);
      const bStart = b.startInning ?? (bPriority === 0 ? 1 : 999);
      if (aStart !== bStart) return aStart - bStart;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return 0;
    });

    participants.forEach((participant, idx) => {
      const player = playersById[participant.playerId];
      const displayName = formatPlayerName(player) || '未登録';
      const roleLabel = roleLabelMap[participant.status] || '';
      const position =
        participant.positionAtStart ||
        participant.positionAtEnd ||
        lineupEntry?.position ||
        '';
      const positionLabel = getPositionLabel(position);
      const stats = participant.playerId
        ? calculatePlayerStats(participant.playerId, atBats, side)
        : {
            plateAppearances: 0,
            atBats: 0,
            hits: 0,
            runs: 0,
            rbi: 0,
            sacrifice: 0,
            fourBall: 0,
            strikeouts: 0,
            stolenBases: 0,
            homeRuns: 0,
            triples: 0,
            doubles: 0,
            singles: 0,
            assists: 0,
            putouts: 0,
            errors: 0,
          };

      const isStarterRow = getStatusPriority(participant) === 0;
      const orderLabel = isStarterRow ? baseOrderLabel : undefined;
      rows.push({
        key: `${side}-${order}-${participant.playerId || idx}`,
        battingOrder: order,
        playerId: participant.playerId,
        name: displayName,
        positionLabel,
        roleLabel,
        isSubstitute: !isStarterRow,
        stats,
        orderLabel,
      });
    });
  }

  unassignedParticipants
    .sort((a, b) => {
      const aStart = a.startInning ?? 999;
      const bStart = b.startInning ?? 999;
      return aStart - bStart;
    })
    .forEach((participant, idx) => {
      const player = playersById[participant.playerId];
      const displayName = formatPlayerName(player) || '未登録';
      const roleLabel = roleLabelMap[participant.status] || '';
      const fallbackLineup = lineupEntries.find((entry) => entry.playerId === participant.playerId);
      const position =
        participant.positionAtStart ||
        participant.positionAtEnd ||
        fallbackLineup?.position ||
        '';
      const positionLabel = getPositionLabel(position);
      const stats = participant.playerId
        ? calculatePlayerStats(participant.playerId, atBats, side)
        : {
            plateAppearances: 0,
            atBats: 0,
            hits: 0,
            runs: 0,
            rbi: 0,
            sacrifice: 0,
            fourBall: 0,
            strikeouts: 0,
            stolenBases: 0,
            homeRuns: 0,
            triples: 0,
            doubles: 0,
            singles: 0,
            assists: 0,
            putouts: 0,
            errors: 0,
          };
      rows.push({
        key: `${side}-extra-${participant.playerId || idx}`,
        battingOrder: 0,
        playerId: participant.playerId,
        name: displayName,
        positionLabel,
        roleLabel,
        isSubstitute: true,
        stats,
        orderLabel: undefined,
      });
    });

  return rows;
};

const buildStatsData = async (matchId: string, atBats: AtBat[]): Promise<StatsData | null> => {
  const game = await getGame(matchId);
  if (!game || !game.topTeam || !game.bottomTeam) return null;

  const lineup = await getLineup(matchId);
  const participations = await getParticipations(matchId);
  const homePlayers = await getPlayers(game.topTeam.id);
  const awayPlayers = await getPlayers(game.bottomTeam.id);

  const homeTeam: StatsTeamData = {
    teamName: game.topTeam.name,
    side: 'home',
    rows: buildRowsForSide({
      side: 'home',
      lineupEntries: lineup?.home ?? [],
      participationEntries: participations?.home ?? [],
      players: homePlayers,
      atBats,
    }),
  };

  const awayTeam: StatsTeamData = {
    teamName: game.bottomTeam.name,
    side: 'away',
    rows: buildRowsForSide({
      side: 'away',
      lineupEntries: lineup?.away ?? [],
      participationEntries: participations?.away ?? [],
      players: awayPlayers,
      atBats,
    }),
  };

  return { home: homeTeam, away: awayTeam };
};

export const useStatsData = (matchId?: string) => {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const atBats = useAtBats(matchId);

  const loadData = useCallback(
    async (options?: { silent?: boolean; atBats?: AtBat[] }) => {
      if (!matchId) {
        setData(null);
        setLoading(false);
        return;
      }
      const currentAtBats = options?.atBats ?? atBats;
      if (currentAtBats.length === 0) {
        // atBatsがまだ取得されていない場合は待機
        return;
      }
      if (!options?.silent) {
        setLoading(true);
      }
      try {
        const next = await buildStatsData(matchId, currentAtBats);
        setData(next);
      } catch (error) {
        console.warn('stats load error', error);
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [matchId, atBats]
  );

  // atBatsが変更されたときに統計データを再計算
  useEffect(() => {
    if (atBats.length > 0) {
      loadData({ silent: true, atBats });
    }
  }, [atBats, loadData]);

  useEffect(() => {
    if (!matchId) return;

    // lineupsとparticipationsの変更はstorageイベントで検知（将来的にはリアルタイム対応も検討）
    const onStorage = (event: StorageEvent) => {
      if (!event.key) return;
      if (['lineups', 'participations'].includes(event.key)) {
        loadData({ silent: true, atBats });
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, [matchId, loadData, atBats]);

  const refresh = useCallback(() => loadData(), [loadData]);

  return { data, loading, refresh };
};

