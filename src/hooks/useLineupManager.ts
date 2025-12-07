import { useState, useEffect, useRef, useMemo } from 'react';
import { getLineup, saveLineup, recordStartersFromLineup } from '../services/lineupService';
import { getPlayers } from '../services/playerService';
import { getTeams } from '../services/teamService';
import { getGame } from '../services/gameService';
import { getParticipations, recordSubstitution } from '../services/participationService';
import { getGameState, updateRunnersRealtime, updateMatchupRealtime } from '../services/gameStateService';
import { PitchData } from '../types/PitchData';
import { useAtBats } from './useAtBats';
import { formatAtBatSummary } from '../utils/scoreKeeping';
import { Player } from '../types/Player';
import { ParticipationEntry } from '../types/Participation';
import { PositionDef, POSITION_LIST, POSITIONS } from '../data/softball/positions';

export type RecentResultDisplay = { playId: string; label: string; rbi: number };

export type SpecialEntryRole = 'PH' | 'PR' | 'TR';

export interface PlayerOption {
  playerId: string;
  label: string;
}

export interface PositionOption {
  code: string;
  label: string;
}

export interface SpecialLineupEntry {
  id: string;
  side: 'home' | 'away';
  battingOrder: number;
  role: SpecialEntryRole;
  teamName: string;
  lineupPosition: string;
  currentPlayerId: string;
  currentPlayerName: string;
  previousPlayerId?: string;
  previousPlayerName?: string;
  previousPosition?: string;
  candidatePlayers: PlayerOption[];
  candidatePositions: string[];
}

export interface SpecialEntryResolution {
  entryId: string;
  selectedPlayerId?: string;
  selectedPosition?: string;
}

interface UseLineupManagerProps {
  matchId: string | undefined;
  currentHalf: 'top' | 'bottom';
  runners: { '1': string | null; '2': string | null; '3': string | null };
  setRunners: (runners: { '1': string | null; '2': string | null; '3': string | null }) => void;
  setPitches: (pitches: PitchData[]) => void; // 打者変更時にリセットするため
}

export const useLineupManager = ({
  matchId,
  currentHalf,
  runners,
  setRunners,
  setPitches,
}: UseLineupManagerProps) => {
  const [match, setMatch] = useState<any>(null);
  const [lineup, setLineup] = useState<any>(null);
  const [homePlayers, setHomePlayers] = useState<any[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<any[]>([]);
  const [currentBatter, setCurrentBatter] = useState<any>(null);
  const [currentPitcher, setCurrentPitcher] = useState<any>(null);
  const [homeBatIndex, setHomeBatIndex] = useState<number>(0);
  const [awayBatIndex, setAwayBatIndex] = useState<number>(0);

  // サイドバー編集用 state
  const [homeLineup, setHomeLineup] = useState<any[]>([]);
  const [awayLineup, setAwayLineup] = useState<any[]>([]);
  const [homeLineupDraft, setHomeLineupDraft] = useState<any[]>([]);
  const [awayLineupDraft, setAwayLineupDraft] = useState<any[]>([]);
  const [homeTeamName, setHomeTeamName] = useState<string>('先攻');
  const [awayTeamName, setAwayTeamName] = useState<string>('後攻');
  const [specialEntries, setSpecialEntries] = useState<SpecialLineupEntry[]>([]);
  const allAtBats = useAtBats(matchId);

  // 差分検出用スナップショット
  const [prevHomeSnapshot, setPrevHomeSnapshot] = useState<any[]>([]);
  const [prevAwaySnapshot, setPrevAwaySnapshot] = useState<any[]>([]);

  const lineupInitialized = useRef(false);
  const specialEntriesRef = useRef<SpecialLineupEntry[]>([]);
  const prevHalfRef = useRef<'top' | 'bottom' | null>(null);

  useEffect(() => {
    specialEntriesRef.current = specialEntries;
  }, [specialEntries]);

  // 初期データロード
  useEffect(() => {
    if (!matchId) return;
    
    const loadData = async () => {
      try {
        const g = await getGame(matchId);
        if (!g) {
          console.error('Game not found:', matchId);
          return;
        }
        
        setMatch({
          id: g.gameId,
          homeTeamId: g.topTeam.id,
          awayTeamId: g.bottomTeam.id,
          date: g.date,
          startTime: '',
        });

        const l = await getLineup(matchId);
        setLineup(l);

        const homePs = await getPlayers(g.topTeam.id);
        const awayPs = await getPlayers(g.bottomTeam.id);
        setHomePlayers(homePs);
        setAwayPlayers(awayPs);

        // 初期打者・投手の設定
        const batterEntry = l.home[0];
        const pitcherEntry = l.away.find((e: any) => e.position === '1');
        const batter = homePs.find(p => p.playerId === batterEntry?.playerId) || null;
        const pitcher = awayPs.find(p => p.playerId === pitcherEntry?.playerId) || null;
        setCurrentBatter(batter);
        setCurrentPitcher(pitcher);
        setPitches([]);

        // サイドバー用state初期化
        setHomeLineup(l.home);
        setAwayLineup(l.away);
        setHomeLineupDraft(l.home.map((entry: any) => ({ ...entry })));
        setAwayLineupDraft(l.away.map((entry: any) => ({ ...entry })));
        setPrevHomeSnapshot(l.home.map((entry: any) => ({ ...entry })));
        setPrevAwaySnapshot(l.away.map((entry: any) => ({ ...entry })));

        // チーム名
        const teams = await getTeams();
        const homeTeam = teams.find(t => String(t.id) === String(g.topTeam.id));
        const awayTeam = teams.find(t => String(t.id) === String(g.bottomTeam.id));
        setHomeTeamName(homeTeam ? homeTeam.teamName : '先攻');
        setAwayTeamName(awayTeam ? awayTeam.teamName : '後攻');
      } catch (error) {
        console.error('Error loading lineup data:', error);
      }
    };
    
    loadData();
  }, [matchId]);

  // 初期化時の打順インデックスリセット
  useEffect(() => {
    if (!lineup || lineupInitialized.current) return;
    setHomeBatIndex(0);
    setAwayBatIndex(0);
    lineupInitialized.current = true;
  }, [lineup]);

  // atBatsの読み込み
  // atBatsはuseAtBatsフックでリアルタイム購読（ポーリング不要）

  // 現在の half と打順に応じて currentBatter を更新
  useEffect(() => {
    const battingList = currentHalf === 'top' ? homeLineup : awayLineup;
    const battingIndex = currentHalf === 'top' ? homeBatIndex : awayBatIndex;
    const battingPlayers = currentHalf === 'top' ? homePlayers : awayPlayers;

    if (!battingList.length) return;
    const entry = battingList[battingIndex % battingList.length];
    const batter = battingPlayers.find(p => p.playerId === entry?.playerId) || null;
    setCurrentBatter(batter);
    setPitches([]); 
  }, [currentHalf, homeLineup, awayLineup, homeBatIndex, awayBatIndex, homePlayers, awayPlayers]);

  // half 切替時に現在投手を更新（攻守交替対応）
  useEffect(() => {
    const defenseLineup = currentHalf === 'top' ? awayLineup : homeLineup;
    const defensePlayers = currentHalf === 'top' ? awayPlayers : homePlayers;
    if (!defenseLineup.length) return;
    const pitcherEntry = defenseLineup.find((e: any) => e.position === '1');
    const pitcher = defensePlayers.find(p => p.playerId === pitcherEntry?.playerId) || null;
    setCurrentPitcher(pitcher);
  }, [currentHalf, homeLineup, awayLineup, homePlayers, awayPlayers]);

  useEffect(() => {
    if (!matchId) return;
    const batterId = currentBatter?.playerId ?? null;
    const pitcherId = currentPitcher?.playerId ?? null;
    if (batterId !== null || pitcherId !== null) {
      updateMatchupRealtime(matchId, {
        batter_id: batterId,
        pitcher_id: pitcherId,
      });
    }
  }, [matchId, currentBatter, currentPitcher]);

  const buildPlayerLabel = (player?: Player | null) => {
    if (!player) return '';
    const full = `${player.familyName || ''} ${player.givenName || ''}`.trim();
    return full || player.playerId || '';
  };

  const resolvePlayerLabel = (side: 'home' | 'away', playerId?: string | null) => {
    if (!playerId) return '—';
    const players = side === 'home' ? homePlayers : awayPlayers;
    const player = players.find(p => p.playerId === playerId);
    return buildPlayerLabel(player) || playerId;
  };

  const buildCandidateOptions = (side: 'home' | 'away'): PlayerOption[] => {
    const players = side === 'home' ? homePlayers : awayPlayers;
    return players.map(player => ({
      playerId: player.playerId,
      label: buildPlayerLabel(player) || player.playerId,
    }));
  };

  const findPreviousParticipant = (
    entries: ParticipationEntry[],
    battingOrder: number,
    currentPlayerId: string
  ): ParticipationEntry | null => {
    const history = entries
      .filter(entry => entry.battingOrder === battingOrder)
      .sort((a, b) => {
        const aStart = a.startInning ?? 0;
        const bStart = b.startInning ?? 0;
        if (aStart !== bStart) return aStart - bStart;
        return (a.note || '').localeCompare(b.note || '');
      });
    for (let i = history.length - 1; i >= 0; i -= 1) {
      if (history[i].playerId !== currentPlayerId) {
        return history[i];
      }
    }
    return null;
  };

  const collectSpecialEntriesForSide = async (side: 'home' | 'away'): Promise<SpecialLineupEntry[]> => {
    if (!matchId) return [];
    const participationTable = await getParticipations(matchId);
    const participationList = Array.isArray(participationTable?.[side]) ? participationTable[side] : [];
    const lineupSource = side === 'home' ? homeLineup : awayLineup;
    const candidatePlayers = buildCandidateOptions(side);
    const teamLabel = side === 'home' ? homeTeamName : awayTeamName;
    const positionOptions: string[] = POSITION_LIST.map(position => position.code);
    const entryMap = new Map<number, SpecialLineupEntry>();

    lineupSource.forEach(entry => {
      if (!entry) return;
      const roleFromPosition = (entry.position || '').toUpperCase();
      if (!['PH', 'PR', 'TR'].includes(roleFromPosition) || !entry.playerId) return;
      const previousParticipant = findPreviousParticipant(participationList, entry.battingOrder, entry.playerId);
      entryMap.set(entry.battingOrder, {
        id: `${side}-${entry.battingOrder}-${entry.playerId}`,
        side,
        battingOrder: entry.battingOrder,
        role: roleFromPosition as SpecialEntryRole,
        teamName: teamLabel,
        lineupPosition: entry.position,
        currentPlayerId: entry.playerId,
        currentPlayerName: resolvePlayerLabel(side, entry.playerId),
        previousPlayerId: previousParticipant?.playerId,
        previousPlayerName: previousParticipant ? resolvePlayerLabel(side, previousParticipant.playerId) : undefined,
        previousPosition: previousParticipant?.positionAtEnd || previousParticipant?.positionAtStart || '',
        candidatePlayers,
        candidatePositions: positionOptions,
      });
    });

    participationList
      .filter(
        entry =>
          entry.endInning == null && (entry.status === 'pinch_hitter' || entry.status === 'pinch_runner')
      )
      .forEach(entry => {
        if (!entry.playerId) return;
        if (entryMap.has(entry.battingOrder)) return;
        const lineupEntry = lineupSource.find(l => l.battingOrder === entry.battingOrder);
        if (!lineupEntry) return;
        const roleFromPosition = (lineupEntry.position || '').toUpperCase();

        // すでに守備位置が決まっている場合はスキップ
        if (!['PH', 'PR', 'TR'].includes(roleFromPosition)) return;

        const derivedRole: SpecialEntryRole =
          roleFromPosition === 'TR'
            ? 'TR'
            : entry.status === 'pinch_hitter'
            ? 'PH'
            : 'PR';
        const previousParticipant = findPreviousParticipant(participationList, entry.battingOrder, entry.playerId);
        entryMap.set(entry.battingOrder, {
          id: `${side}-${entry.battingOrder}-${entry.playerId}-status`,
          side,
          battingOrder: entry.battingOrder,
          role: derivedRole,
          teamName: teamLabel,
          lineupPosition: lineupEntry.position,
          currentPlayerId: entry.playerId,
          currentPlayerName: resolvePlayerLabel(side, entry.playerId),
          previousPlayerId: previousParticipant?.playerId,
          previousPlayerName: previousParticipant ? resolvePlayerLabel(side, previousParticipant.playerId) : undefined,
          previousPosition: previousParticipant?.positionAtEnd || previousParticipant?.positionAtStart || '',
          candidatePlayers,
          candidatePositions: positionOptions,
        });
      });

    return Array.from(entryMap.values());
  };

  useEffect(() => {
    if (!matchId) return;
    if (!homeLineup.length && !awayLineup.length) return;
    if (prevHalfRef.current === null) {
      prevHalfRef.current = currentHalf;
      return;
    }
    if (prevHalfRef.current !== currentHalf) {
      const finishedSide = prevHalfRef.current === 'top' ? 'home' : 'away';
      collectSpecialEntriesForSide(finishedSide).then(entries => {
        setSpecialEntries(entries);
      }).catch(error => {
        console.error('Error collecting special entries:', error);
        setSpecialEntries([]);
      });
      prevHalfRef.current = currentHalf;
    }
  }, [currentHalf, matchId, homeLineup, awayLineup, homePlayers, awayPlayers, homeTeamName, awayTeamName]);

  // 編集ハンドラ
  const handlePositionChange = (side: 'home' | 'away', index: number, value: string) => {
    const list = side === 'home' ? [...homeLineupDraft] : [...awayLineupDraft];
    list[index] = { ...list[index], position: value };
    side === 'home' ? setHomeLineupDraft(list) : setAwayLineupDraft(list);
  };

  const handlePlayerChange = (side: 'home' | 'away', index: number, value: string) => {
    const list = side === 'home' ? [...homeLineupDraft] : [...awayLineupDraft];
    list[index] = { ...list[index], playerId: value };
    side === 'home' ? setHomeLineupDraft(list) : setAwayLineupDraft(list);
  };

  // 保存ロジック
  const handleSidebarSave = async (
    side: 'home' | 'away',
    options?: { lineupOverride?: any[] }
  ) => {
    if (!matchId) return;
    const nextHome =
      side === 'home'
        ? (options?.lineupOverride ?? homeLineupDraft).map(entry => ({ ...entry }))
        : homeLineupDraft.map(entry => ({ ...entry }));
    const nextAway =
      side === 'away'
        ? (options?.lineupOverride ?? awayLineupDraft).map(entry => ({ ...entry }))
        : awayLineupDraft.map(entry => ({ ...entry }));
    const updatedLineup = { matchId, home: nextHome, away: nextAway };
    saveLineup(matchId, updatedLineup);
    setHomeLineup(nextHome);
    setAwayLineup(nextAway);
    setLineup(updatedLineup);

    const newRunners = { ...runners };

    // participation 同期
    try {
      const table = await getParticipations(matchId);
      const noStartersYet = (table.home.length === 0 && table.away.length === 0);
      if (noStartersYet) {
        await recordStartersFromLineup(matchId);
      } else {
        const gs = await getGameState(matchId);
        const inning = gs?.current_inning ?? 1;
        const kind: 'pinch_hitter' | 'pinch_runner' = 'pinch_hitter';

        const currentList = side === 'home' ? homeLineupDraft : awayLineupDraft;
        const prevList = side === 'home' ? prevHomeSnapshot : prevAwaySnapshot;

        for (let i = 0; i < currentList.length; i++) {
          const cur = currentList[i];
          const prev = prevList[i];
          if (!prev) continue;

          const changed = (cur.playerId || '') !== (prev.playerId || '');
          const changedPos = (cur.position || '') !== (prev.position || '');
          if (changed || changedPos) {
            recordSubstitution({
              matchId,
              side,
              outPlayerId: prev.playerId || '',
              inPlayerId: cur.playerId || '',
              inning,
              kind,
              position: cur.position,
              battingOrder: cur.battingOrder,
            });

            // 代走反映
            if (changed && prev.playerId) {
              (['1', '2', '3'] as const).forEach(base => {
                if (newRunners[base] === prev.playerId) {
                   newRunners[base] = cur.playerId || null;
                }
              });
            }
          }
        }
      }

      setPrevHomeSnapshot(nextHome.map(entry => ({ ...entry })));
      setPrevAwaySnapshot(nextAway.map(entry => ({ ...entry })));
    } catch (e) {
      console.warn('participation sync error', e);
    }

    // 整合性チェック
    try {
      const gs = await getGameState(matchId);
      const half = gs?.top_bottom ?? currentHalf;

      // 投手
      if (half === 'top') {
        const pitcherEntry = awayLineup.find((e: any) => e.position === '1');
        const nextPitcher = awayPlayers.find(p => p.playerId === pitcherEntry?.playerId) || null;
        if ((currentPitcher?.playerId || null) !== (nextPitcher?.playerId || null)) {
          setCurrentPitcher(nextPitcher);
        }
      } else {
        const pitcherEntry = homeLineup.find((e: any) => e.position === '1');
        const nextPitcher = homePlayers.find(p => p.playerId === pitcherEntry?.playerId) || null;
        if ((currentPitcher?.playerId || null) !== (nextPitcher?.playerId || null)) {
          setCurrentPitcher(nextPitcher);
        }
      }

      // 打者
      if (half === 'top') {
        const entry = homeLineup[homeBatIndex % Math.max(1, homeLineup.length)];
        const nextBatter = homePlayers.find(p => p.playerId === entry?.playerId) || null;
          if ((currentBatter?.playerId || null) !== (nextBatter?.playerId || null)) {
          setCurrentBatter(nextBatter);
          setPitches([]);
        }
      } else {
        const entry = awayLineup[awayBatIndex % Math.max(1, awayLineup.length)];
        const nextBatter = awayPlayers.find(p => p.playerId === entry?.playerId) || null;
        if ((currentBatter?.playerId || null) !== (nextBatter?.playerId || null)) {
          setCurrentBatter(nextBatter);
          setPitches([]);
        }
      }

      // ランナー
      const validIds = new Set<string>([
        ...homePlayers.map(p => p.playerId),
        ...awayPlayers.map(p => p.playerId),
      ]);
      const nextRunners = { ...newRunners };
      let runnersChanged = false;
      
      if (JSON.stringify(newRunners) !== JSON.stringify(runners)) {
        runnersChanged = true;
      }

      (['1','2','3'] as const).forEach(b => {
        const pid = nextRunners[b];
        if (pid && !validIds.has(pid)) {
          nextRunners[b] = null;
          runnersChanged = true;
        }
      });
      if (runnersChanged) {
        setRunners(nextRunners);
        updateRunnersRealtime(matchId, { '1b': nextRunners['1'], '2b': nextRunners['2'], '3b': nextRunners['3'] });
      }

      updateMatchupRealtime(matchId, {
        batter_id: currentBatter?.playerId ?? null,
        pitcher_id: currentPitcher?.playerId ?? null,
      });
    } catch (e) {
      console.warn('lineup integrity check error', e);
    }
  };

  // 打順を進める
  const advanceBattingOrder = () => {
    if (currentHalf === 'top') {
      const list = homeLineup;
      const length = list.length || 1;
      setHomeBatIndex(idx => {
        let nextIdx = (idx + 1) % length;
        let attempts = 0;
        // FP(10番)をスキップ
        while (list[nextIdx] && list[nextIdx].battingOrder === 10 && attempts < length) {
          nextIdx = (nextIdx + 1) % length;
          attempts++;
        }
        return nextIdx;
      });
    } else {
      const list = awayLineup;
      const length = list.length || 1;
      setAwayBatIndex(idx => {
        let nextIdx = (idx + 1) % length;
        let attempts = 0;
        // FP(10番)をスキップ
        while (list[nextIdx] && list[nextIdx].battingOrder === 10 && attempts < length) {
          nextIdx = (nextIdx + 1) % length;
          attempts++;
        }
        return nextIdx;
      });
    }
  };

  // Computed Values

  // 現在打者の打順（数字のみ）
  const currentBattingOrder = useMemo(() => {
    if (!currentBatter) return '';
    const battingSide = currentHalf === 'top' ? homeLineup : awayLineup;
    if (!battingSide || battingSide.length === 0) return '';
    const entry = battingSide.find((e: any) => e.playerId === currentBatter.playerId);
    if (!entry) return '';
    return entry.battingOrder === 10 ? '' : String(entry.battingOrder);
  }, [homeLineup, awayLineup, currentBatter, currentHalf]);

  // 現在打者の過去打席結果
  const recentBatterResults = useMemo<RecentResultDisplay[]>(() => {
    if (!matchId || !currentBatter || !Array.isArray(allAtBats)) return [];
    return allAtBats
      .filter(a => a.batterId === currentBatter.playerId && a.type === 'bat')
      .map(atBat => {
        const label = formatAtBatSummary(atBat);
        if (!label) return null;
        return {
          playId: atBat.playId,
          label,
          rbi: atBat.result?.rbi ?? 0,
        };
      })
      .filter((item): item is RecentResultDisplay => !!item)
      // .reverse() // 古い順に表示するためreverseはしない
      // .slice(0, 3); // 全打席表示するためsliceはしない
  }, [matchId, currentBatter, allAtBats]);

  // 攻撃側チームID
  const offenseTeamId = useMemo(() => {
    if (!match) return null;
    return currentHalf === 'top' ? match.homeTeamId : match.awayTeamId;
  }, [match, currentHalf]);

  // 攻撃側選手リスト
  const offensePlayers = useMemo(() => {
    if (offenseTeamId == null) return [];
    // homePlayersとawayPlayersから選択
    if (currentHalf === 'top') {
      return homePlayers;
    } else {
      return awayPlayers;
    }
  }, [offenseTeamId, currentHalf, homePlayers, awayPlayers]);

  const applySpecialEntryResolutions = async (resolutions: SpecialEntryResolution[]) => {
    if (!matchId || resolutions.length === 0) return;

    const overrides: { home: any[] | null; away: any[] | null } = { home: null, away: null };

    const ensureOverrideList = (side: 'home' | 'away') => {
      if (side === 'home') {
        if (!overrides.home) {
          overrides.home = homeLineupDraft.map(entry => ({ ...entry }));
        }
        return overrides.home;
      }
      if (!overrides.away) {
        overrides.away = awayLineupDraft.map(entry => ({ ...entry }));
      }
      return overrides.away;
    };

    const sidesToSave = new Set<'home' | 'away'>();

    resolutions.forEach(resolution => {
      const entry = specialEntriesRef.current.find(item => item.id === resolution.entryId);
      if (!entry) return;
      const targetPlayerId =
        entry.role === 'TR'
          ? entry.previousPlayerId || entry.currentPlayerId
          : resolution.selectedPlayerId || entry.previousPlayerId || entry.currentPlayerId;
      if (!targetPlayerId) return;
      const targetPosition =
        entry.role === 'TR'
          ? entry.previousPosition || entry.lineupPosition
          : resolution.selectedPosition || entry.lineupPosition;

      const list = ensureOverrideList(entry.side);
      const idx = list.findIndex((item: any) => item.battingOrder === entry.battingOrder);
      if (idx === -1) return;
      list[idx] = { ...list[idx], playerId: targetPlayerId, position: targetPosition };
      sidesToSave.add(entry.side);
    });

    const saveSide = async (side: 'home' | 'away') => {
      const lineupOverride = side === 'home' ? overrides.home : overrides.away;
      if (!lineupOverride) {
        // overrideがなくても、片方だけ更新された場合にもう片方も保存処理（participation同期など）を走らせる必要があるかもしれないが、
        // 現状の handleSidebarSave は lineupOverride がある場合のみそれを使って保存し、なければ state (Draft) を使う。
        // ここでは overrides があるサイドのみ保存すれば十分か、それとも両方保存すべきか。
        // 要望は「両脇のラインナップバーを更新するだけでなく、保存まで行ってください」なので、
        // 変更があったサイドだけ保存すれば良いはずだが、念のため両方保存するフローにする。
        
        // しかし、overridesがない場合（null）に handleSidebarSave を呼ぶと、現在の Draft を保存してしまう。
        // Draft が意図せず古い状態だったりすると危険だが、Draft は常に最新の UI 状態を保持しているはず。
        // 安全のため、overrides がある場合のみ保存する。
        return; 
      }
      
      if (side === 'home') {
        setHomeLineup(lineupOverride);
        setHomeLineupDraft(lineupOverride);
      } else {
        setAwayLineup(lineupOverride);
        setAwayLineupDraft(lineupOverride);
      }
      await handleSidebarSave(side, { lineupOverride });
    };

    // 変更があったサイドを特定して保存
    // sidesToSave には変更があったサイドが入っている
    for (const side of sidesToSave) {
      // eslint-disable-next-line no-await-in-loop
      await saveSide(side);
    }

    setSpecialEntries([]);
  };

  return {
    match,
    lineup,
    homePlayers,
    awayPlayers,
    currentBatter,
    currentPitcher,
    homeBatIndex,
    awayBatIndex,
    homeLineup,
    awayLineup,
    homeLineupDraft,
    awayLineupDraft,
    homeTeamName,
    awayTeamName,
    allAtBats,
    setHomeBatIndex,
    setAwayBatIndex,
    handlePositionChange,
    handlePlayerChange,
    handleSidebarSave,
    advanceBattingOrder,
    currentBattingOrder,
    recentBatterResults,
    offenseTeamId,
    offensePlayers,
    specialEntries,
    applySpecialEntryResolutions,
  };
};

