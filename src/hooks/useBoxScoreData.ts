import { useCallback, useEffect, useState } from 'react';
import { getGame } from '../services/gameService';
import { getLineup } from '../services/lineupService';
import { getParticipations } from '../services/participationService';
import { getPlayers } from '../services/playerService';
import { getAtBats } from '../services/atBatService';
import { useAtBats } from './useAtBats';
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

export interface RunnerRecord {
  playerId: string;
  playerName: string;
  type: 'steal' | 'caughtstealing' | 'runout';
  inning: number;
}

export interface BoxScoreTeamData {
  teamName: string;
  side: Side;
  rows: BoxScoreRowData[];
  runnerRecords: RunnerRecord[];
  leftOnBase: number; // 残塁数（合計）
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

// 守備位置の履歴をラベル化（連続重複は圧縮し、変化が無いときは単一表示）
const buildPositionHistoryLabel = (positions: string[], fallback?: string) => {
  const filtered = positions.filter((p) => p && p !== 'TR');
  const collapsed: string[] = [];
  filtered.forEach((p) => {
    if (collapsed.length === 0 || collapsed[collapsed.length - 1] !== p) {
      collapsed.push(p);
    }
  });
  const addFallback = () => {
    if (fallback && fallback !== 'TR') {
      collapsed.push(fallback);
    }
  };
  if (collapsed.length === 0) {
    addFallback();
  }
  if (collapsed.length === 0) return '';
  const distinctCount = new Set(collapsed).size;
  if (distinctCount <= 1) {
    return getPositionLabel(collapsed[0]);
  }
  return collapsed.map(getPositionLabel).join('/');
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

const buildRunnerRecords = (
  atBats: AtBat[],
  side: Side,
  players: Player[]
): RunnerRecord[] => {
  const records: RunnerRecord[] = [];
  const playersById = players.reduce<Record<string, Player>>((acc, player) => {
    acc[player.playerId] = player;
    return acc;
  }, {});

  atBats.forEach((atBat) => {
    if (atBat.type !== 'bat') return;
    const inning = atBat.inning ?? 0;
    if (inning < 1 || inning > MAX_BOX_SCORE_INNINGS) return;

    const atBatSide: Side = atBat.topOrBottom === 'top' ? 'home' : 'away';
    if (atBatSide !== side) return; // 対象チームの攻撃時のみ

    if (!atBat.runnerEvents) return;

    atBat.runnerEvents.forEach((event) => {
      if (event.type === 'steal' && !event.isOut) {
        // 盗塁
        const player = playersById[event.runnerId];
        if (player) {
          records.push({
            playerId: event.runnerId,
            playerName: formatPlayerName(player),
            type: 'steal',
            inning,
          });
        }
      } else if (event.type === 'caughtstealing') {
        // 盗塁死
        const player = playersById[event.runnerId];
        if (player) {
          records.push({
            playerId: event.runnerId,
            playerName: formatPlayerName(player),
            type: 'caughtstealing',
            inning,
          });
        }
      } else if (event.type === 'runout') {
        // 走塁死
        const player = playersById[event.runnerId];
        if (player) {
          records.push({
            playerId: event.runnerId,
            playerName: formatPlayerName(player),
            type: 'runout',
            inning,
          });
        }
      }
    });
  });

  return records;
};

const buildLeftOnBase = (atBats: AtBat[], side: Side): number => {
  let totalLeftOnBase = 0;

  // 各イニングについて処理
  for (let inning = 1; inning <= MAX_BOX_SCORE_INNINGS; inning++) {
    // 対象サイドのatBatsを取得（時系列順）
    const sideAtBats = atBats
      .filter((atBat) => {
        if (atBat.type !== 'bat') return false;
        const atBatSide: Side = atBat.topOrBottom === 'top' ? 'home' : 'away';
        return atBatSide === side && atBat.inning === inning;
      })
      .sort((a, b) => a.index - b.index);

    if (sideAtBats.length === 0) continue;

    // 3アウトになった時点のatBatを探す、または最後のatBat
    let endAtBat = sideAtBats.find((atBat) => atBat.situationAfter.outs >= 3);
    if (!endAtBat) {
      // 3アウトになっていない場合、最後のatBatを使用
      endAtBat = sideAtBats[sideAtBats.length - 1];
    }

    // 残塁数を計算（3アウトになっている場合のみ記録）
    if (endAtBat.situationAfter.outs >= 3) {
      const runners = endAtBat.situationAfter.runners;
      let lobCount = 0;
      if (runners['1']) lobCount++;
      if (runners['2']) lobCount++;
      if (runners['3']) lobCount++;
      totalLeftOnBase += lobCount;
    }
  }

  return totalLeftOnBase;
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

    // スタメンエントリを特定
    const starterEntry = participants.find(p => p.status === 'starter');
    const starterPlayerId = starterEntry?.playerId || null;
    
    // 同じ選手のエントリをグループ化（PH/PR/TRは守備位置対象外）
    const entriesByPlayer = new Map<string, ParticipationEntry[]>();
    participants.forEach(entry => {
      if (!entry.playerId) return;
      const list = entriesByPlayer.get(entry.playerId) || [];
      list.push(entry);
      entriesByPlayer.set(entry.playerId, list);
    });

    // 処理済みの選手IDを追跡
    const processedPlayerIds = new Set<string>();

    participants.forEach((participant, idx) => {
      const playerId = participant.playerId;
      if (!playerId) return;

      // スタメンで再出場した場合、最初のスタメンエントリに統合
      if (starterPlayerId && playerId === starterPlayerId) {
        if (processedPlayerIds.has(playerId)) {
          // 既に処理済み（スタメン行として統合済み）なのでスキップ
          return;
        }
        // スタメンエントリとして統合処理
        processedPlayerIds.add(playerId);
        
        const player = playersById[playerId];
        const displayName = formatPlayerName(player) || '未登録';
        const roleLabel = roleLabelMap[participant.status] || '';
        
        // 同じ選手の全エントリから守備位置を収集
        const samePlayerEntries = entriesByPlayer.get(playerId) || [];
        const positionSeq: string[] = [];
        samePlayerEntries.forEach(entry => {
          if (entry.positionAtStart && entry.positionAtStart !== 'TR') {
            positionSeq.push(entry.positionAtStart);
          }
        });
        if (lineupEntry?.position && lineupEntry.position !== 'TR') {
          positionSeq.push(lineupEntry.position);
        }
        
        const positionLabel = buildPositionHistoryLabel(positionSeq, lineupEntry?.position || '');
        
        // 打席結果は全エントリを統合（既にresultMapで統合されているのでそのまま使用）
        const perInning = resultMap[playerId] || {};
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
          key: `${side}-${order}-${playerId}`,
          battingOrder: order,
          playerId: playerId,
          name: displayName,
          positionLabel,
          roleLabel,
          isSubstitute: false,
          resultsByInning,
          inningStyles,
          orderLabel: baseOrderLabel,
        });
        return;
      }

      // 途中出場選手の場合
      if (processedPlayerIds.has(playerId)) {
        return; // 既に処理済み
      }
      processedPlayerIds.add(playerId);

      const player = playersById[playerId];
      const displayName = formatPlayerName(player) || '未登録';
      const roleLabel = roleLabelMap[participant.status] || '';
      
       // 同じ選手の全エントリから守備位置を収集
       const samePlayerEntries = entriesByPlayer.get(playerId) || [];
       const positionSeq: string[] = [];
       samePlayerEntries.forEach(entry => {
         if (entry.positionAtStart && entry.positionAtStart !== 'TR') {
           positionSeq.push(entry.positionAtStart);
         }
       });
      // lineupEntryの位置も追加
       if (lineupEntry?.position && lineupEntry.position !== 'TR') {
         positionSeq.push(lineupEntry.position);
       }
      
      const positionLabel = buildPositionHistoryLabel(positionSeq, lineupEntry?.position || '');
      
      const perInning = resultMap[playerId] || {};
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
        key: `${side}-${order}-${playerId || idx}`,
        battingOrder: order,
        playerId: playerId,
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

  // unassignedParticipantsも同じ選手のエントリをグループ化（PH/PR/TRは守備位置対象外）
  const unassignedByPlayer = new Map<string, ParticipationEntry[]>();
  unassignedParticipants.forEach(entry => {
    if (!entry.playerId) return;
    const list = unassignedByPlayer.get(entry.playerId) || [];
    list.push(entry);
    unassignedByPlayer.set(entry.playerId, list);
  });

  unassignedParticipants
    .sort((a, b) => {
      const aStart = a.startInning ?? 999;
      const bStart = b.startInning ?? 999;
      return aStart - bStart;
    })
    .forEach((participant, idx) => {
      const playerId = participant.playerId;
      if (!playerId) return;

      const player = playersById[playerId];
      const displayName = formatPlayerName(player) || '未登録';
      const roleLabel = roleLabelMap[participant.status] || '';
      const fallbackLineup = lineupEntries.find((entry) => entry.playerId === playerId);
      
      // 同じ選手の全エントリから守備位置を収集
      const samePlayerEntries = unassignedByPlayer.get(playerId) || [];
      const positionSeq: string[] = [];
      samePlayerEntries.forEach(entry => {
        if (entry.positionAtStart && entry.positionAtStart !== 'TR') {
          positionSeq.push(entry.positionAtStart);
        }
      });
      // fallbackLineupの位置も追加
      if (fallbackLineup?.position && fallbackLineup.position !== 'TR') {
        positionSeq.push(fallbackLineup.position);
      }
      
      const positionLabel = buildPositionHistoryLabel(positionSeq, fallbackLineup?.position || '');
      
      const perInning = resultMap[playerId] || {};
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
        key: `${side}-extra-${playerId || idx}`,
        battingOrder: 0,
        playerId: playerId,
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

const buildBoxScoreData = async (matchId: string, atBats: AtBat[]): Promise<BoxScoreData | null> => {
  const game = await getGame(matchId);
  if (!game || !game.topTeam || !game.bottomTeam) return null;

  const lineup = await getLineup(matchId);
  const participations = await getParticipations(matchId);
  const homePlayers = await getPlayers(game.topTeam.id);
  const awayPlayers = await getPlayers(game.bottomTeam.id);
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
    runnerRecords: buildRunnerRecords(atBats, 'home', homePlayers),
    leftOnBase: buildLeftOnBase(atBats, 'home'),
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
    runnerRecords: buildRunnerRecords(atBats, 'away', awayPlayers),
    leftOnBase: buildLeftOnBase(atBats, 'away'),
  };

  return { home: homeTeam, away: awayTeam };
};

export const useBoxScoreData = (matchId?: string) => {
  const [data, setData] = useState<BoxScoreData | null>(null);
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
        const next = await buildBoxScoreData(matchId, currentAtBats);
        setData(next);
      } catch (error) {
        console.warn('box score load error', error);
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [matchId, atBats]
  );

  // atBatsが変更されたときにボックススコアデータを再計算
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

