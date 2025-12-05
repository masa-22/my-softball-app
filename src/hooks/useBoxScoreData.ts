import { useCallback, useEffect, useState } from 'react';
import { getGame } from '../services/gameService';
import { getLineup } from '../services/lineupService';
import { getParticipations } from '../services/participationService';
import { getPlayers } from '../services/playerService';
import { getAtBats } from '../services/atBatService';
import { POSITIONS } from '../data/softball/positions';
import { formatAtBatSummary } from '../utils/scoreKeeping';
import { LineupEntry } from '../types/Lineup';
import { ParticipationEntry } from '../types/Participation';
import { Player } from '../types/Player';
import { AtBat } from '../types/AtBat';

export const MAX_BOX_SCORE_INNINGS = 7;

type Side = 'home' | 'away';

type PlayerResultMap = Record<
  string,
  Record<
    number,
    {
      labels: string[];
      hasHit: boolean;
      hasRbi: boolean;
    }
  >
>;

export interface BoxScoreRowData {
  key: string;
  battingOrder: number;
  playerId: string | null;
  name: string;
  positionLabel: string;
  roleLabel: string;
  isSubstitute: boolean;
  resultsByInning: Record<number, string>;
  inningStyles: Record<number, 'hit' | 'rbi' | null>;
  orderLabel?: string;
}

export interface BoxScoreTeamData {
  teamName: string;
  side: Side;
  rows: BoxScoreRowData[];
}

export interface BoxScoreData {
  home: BoxScoreTeamData;
  away: BoxScoreTeamData;
}

const INNING_COLUMNS = Array.from({ length: MAX_BOX_SCORE_INNINGS }, (_, i) => i + 1);

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

const buildResultMap = (atBats: AtBat[]): Record<Side, PlayerResultMap> => {
  const result: Record<Side, PlayerResultMap> = { home: {}, away: {} };

  atBats.forEach((atBat) => {
    if (atBat.type !== 'bat' || !atBat.batterId) return;
    const label = formatAtBatSummary(atBat);
    if (!label) return;

    const inning = atBat.inning ?? 0;
    if (inning < 1 || inning > MAX_BOX_SCORE_INNINGS) return;

    const side: Side = atBat.topOrBottom === 'top' ? 'home' : 'away';
    const sideMap = result[side];
    const playerMap = sideMap[atBat.batterId] || (sideMap[atBat.batterId] = {});
    const inningEntry =
      playerMap[inning] ||
      (playerMap[inning] = {
        labels: [],
        hasHit: false,
        hasRbi: false,
      });
    inningEntry.labels.push(label);

    const hitTypes: AtBat['result']['type'][] = [
      'single',
      'double',
      'triple',
      'homerun',
      'runninghomerun',
    ];
    if (atBat.result && hitTypes.includes(atBat.result.type)) {
      inningEntry.hasHit = true;
    }
    const rbi = atBat.result?.rbi ?? atBat.scoredRunners?.length ?? 0;
    if (rbi > 0) {
      inningEntry.hasRbi = true;
    }
  });

  return result;
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
  resultMap,
}: {
  side: Side;
  lineupEntries: LineupEntry[];
  participationEntries: ParticipationEntry[];
  players: Player[];
  resultMap: PlayerResultMap;
}): BoxScoreRowData[] => {
  const rows: BoxScoreRowData[] = [];
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
        // 複数候補がいる場合、ポジション等で推定（ここでは簡易的に先頭を採用）
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
        resultsByInning: {},
        inningStyles: {},
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
      const perInning = resultMap[participant.playerId] || {};
      const resultsByInning: Record<number, string> = {};
      const inningStyles: Record<number, 'hit' | 'rbi' | null> = {};
      INNING_COLUMNS.forEach((inning) => {
        const info = perInning[inning];
        if (info?.labels.length) {
          resultsByInning[inning] = info.labels.join(' / ');
          if (info.hasRbi) {
            inningStyles[inning] = 'rbi';
          } else if (info.hasHit) {
            inningStyles[inning] = 'hit';
          } else {
            inningStyles[inning] = null;
          }
        }
      });

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
        resultsByInning,
        inningStyles,
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
    const perInning = resultMap[participant.playerId] || {};
    const resultsByInning: Record<number, string> = {};
    const inningStyles: Record<number, 'hit' | 'rbi' | null> = {};
    INNING_COLUMNS.forEach((inning) => {
      const info = perInning[inning];
      if (info?.labels.length) {
        resultsByInning[inning] = info.labels.join(' / ');
        if (info.hasRbi) {
          inningStyles[inning] = 'rbi';
        } else if (info.hasHit) {
          inningStyles[inning] = 'hit';
        } else {
          inningStyles[inning] = null;
        }
      }
    });
      rows.push({
        key: `${side}-extra-${participant.playerId || idx}`,
        battingOrder: 0,
        playerId: participant.playerId,
        name: displayName,
        positionLabel,
        roleLabel,
        isSubstitute: true,
        resultsByInning,
        inningStyles,
      orderLabel: undefined,
      });
    });

  return rows;
};

const buildBoxScoreData = (matchId: string): BoxScoreData | null => {
  const game = getGame(matchId);
  if (!game) return null;

  const lineup = getLineup(matchId);
  const participations = getParticipations(matchId);
  const atBats = getAtBats(matchId);
  const homePlayers = getPlayers(game.topTeam.id);
  const awayPlayers = getPlayers(game.bottomTeam.id);
  const resultMap = buildResultMap(atBats);

  const homeTeam: BoxScoreTeamData = {
    teamName: game.topTeam.name,
    side: 'home',
    rows: buildRowsForSide({
      side: 'home',
      lineupEntries: lineup?.home ?? [],
      participationEntries: participations?.home ?? [],
      players: homePlayers,
      resultMap: resultMap.home,
    }),
  };

  const awayTeam: BoxScoreTeamData = {
    teamName: game.bottomTeam.name,
    side: 'away',
    rows: buildRowsForSide({
      side: 'away',
      lineupEntries: lineup?.away ?? [],
      participationEntries: participations?.away ?? [],
      players: awayPlayers,
      resultMap: resultMap.away,
    }),
  };

  return { home: homeTeam, away: awayTeam };
};

export const useBoxScoreData = (matchId?: string) => {
  const [data, setData] = useState<BoxScoreData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(
    (options?: { silent?: boolean }) => {
      if (!matchId) {
        setData(null);
        setLoading(false);
        return;
      }
      if (!options?.silent) {
        setLoading(true);
      }
      try {
        const next = buildBoxScoreData(matchId);
        setData(next);
      } catch (error) {
        console.warn('box score load error', error);
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [matchId]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!matchId) return;
    const interval = setInterval(() => loadData({ silent: true }), 1500);
    const onStorage = (event: StorageEvent) => {
      if (!event.key) return;
      if (['softball_app_at_bats', 'lineups', 'participations'].includes(event.key)) {
        loadData({ silent: true });
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }, [matchId, loadData]);

  const refresh = useCallback(() => loadData(), [loadData]);

  return { data, loading, refresh };
};


