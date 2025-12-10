import { useState, useEffect, useRef, useMemo } from 'react';
import { getLineup, saveLineup, recordStartersFromLineup } from '../services/lineupService';
import { getPlayers } from '../services/playerService';
import { getTeams } from '../services/teamService';
import { getGame } from '../services/gameService';
import { getParticipations, recordSubstitution } from '../services/participationService';
import { getGameState, updateRunnersRealtime, updateMatchupRealtime, updateBattingIndexRealtime } from '../services/gameStateService';
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
  const [homeBatIndex, setHomeBatIndex] = useState<number | undefined>(undefined);
  const [awayBatIndex, setAwayBatIndex] = useState<number | undefined>(undefined);

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
  const lastProcessedBatPlayIdRef = useRef<string | null>(null);
  const isInitializingBatIndex = useRef(false);
  const batIndexInitialized = useRef(false);

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

        // ゲーム状態から打順インデックスを取得
        const gs = await getGameState(matchId);
        // データベースに値が存在する場合はそれを使用、存在しない場合は0（1番打者から開始）
        const savedHomeBatIndex = gs?.home_bat_index !== undefined ? gs.home_bat_index : 0;
        const savedAwayBatIndex = gs?.away_bat_index !== undefined ? gs.away_bat_index : 0;
        
        // 初期打者・投手の設定
        const batterEntry = l.home[savedHomeBatIndex] || l.home[0];
        const pitcherEntry = l.away.find((e: any) => e.position === '1');
        const batter = homePs.find(p => p.playerId === batterEntry?.playerId) || null;
        const pitcher = awayPs.find(p => p.playerId === pitcherEntry?.playerId) || null;
        setCurrentBatter(batter);
        setCurrentPitcher(pitcher);
        setPitches([]);

        // 打順インデックスを設定（データベースから取得した値を使用）
        // 初期化中フラグを設定して、useEffectでの保存をスキップ
        isInitializingBatIndex.current = true;
        batIndexInitialized.current = false;
        setHomeBatIndex(savedHomeBatIndex);
        setAwayBatIndex(savedAwayBatIndex);
        // 初期化が完了したらフラグをリセット
        setTimeout(() => {
          isInitializingBatIndex.current = false;
          batIndexInitialized.current = true;
        }, 200);

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
  }, [matchId, currentHalf]);

  // 初期化時の打順インデックスリセット（atBatsから計算できなかった場合のみ）
  useEffect(() => {
    if (!lineup || lineupInitialized.current) return;
    // atBatsから計算した値が設定されなかった場合（atBatsが空の場合など）のみ、デフォルト値（0）を設定
    // ただし、loadData内で既に設定されている可能性があるので、ここでは設定しない
    // 代わりに、lineupInitializedフラグを設定して、この処理が実行されたことを記録
    lineupInitialized.current = true;
  }, [lineup]);

  // atBatsから最後の打席を取得し、現在の打者インデックスを計算
  // allAtBatsが更新されたときに実行（useAtBatsフックでリアルタイム購読）
  // type=runnerの結果が追加されても打順を再計算しないように、最後に処理したtype=batのplayIdを保持
  // ただし、データベースに打順インデックスが保存されている場合は、それを優先する
  useEffect(() => {
    if (!matchId || !lineup) return;

    const calculateBattingIndex = async () => {
      try {
        const gameState = await getGameState(matchId);
        
        // データベースに打順インデックスが保存されている場合は、それを使用
        if (gameState?.home_bat_index !== undefined || gameState?.away_bat_index !== undefined) {
          if (gameState.home_bat_index !== undefined && gameState.home_bat_index !== homeBatIndex) {
            isInitializingBatIndex.current = true;
            setHomeBatIndex(gameState.home_bat_index);
            setTimeout(() => {
              isInitializingBatIndex.current = false;
            }, 100);
          }
          if (gameState.away_bat_index !== undefined && gameState.away_bat_index !== awayBatIndex) {
            isInitializingBatIndex.current = true;
            setAwayBatIndex(gameState.away_bat_index);
            setTimeout(() => {
              isInitializingBatIndex.current = false;
            }, 100);
          }
          return;
        }

        // データベースに保存されていない場合のみ、atBatsから計算
        if (allAtBats.length === 0) return;

        const currentHalfFromState = gameState?.top_bottom ?? currentHalf;

        // 最後の打席（type === 'bat'）を取得
        const batAtBats = allAtBats.filter(a => a.type === 'bat');
        if (batAtBats.length > 0) {
          // 全打席の最後の打席を取得
          const lastAtBat = batAtBats[batAtBats.length - 1];
          
          // 最後に処理したtype=batのplayIdと比較
          // 同じplayIdの場合は、既に計算済みの打順を保持するため、再計算しない
          if (lastProcessedBatPlayIdRef.current === lastAtBat.playId) {
            return;
          }
          
          const lastOutsAfter = lastAtBat.situationAfter?.outs ?? 0;
          
          let targetHalf = currentHalfFromState;
          let targetBattingOrder = 1; // デフォルトは1番打者
          
          // 最後の打席で3アウト目が記録されていた場合は、攻守交代している
          if (lastOutsAfter >= 3) {
            // 最後の打席に入っていた選手のチームでないチーム（反対側のチーム）の最後の打者を見る
            const oppositeHalf = lastAtBat.topOrBottom === 'top' ? 'bottom' : 'top';
            const oppositeSideAtBats = batAtBats.filter(a => a.topOrBottom === oppositeHalf);
            
            if (oppositeSideAtBats.length > 0) {
              // 反対側のチームの最後の打席を取得
              const lastOppositeSideAtBat = oppositeSideAtBats[oppositeSideAtBats.length - 1];
              // 攻守交代後は、反対側のチームの最後の打席の次の打順が次の打者になる
              // ただし、advanceBattingOrder()は現在のチームの打順を進めるだけなので、
              // 攻守交代が発生した場合は、反対側のチームの最後の打席の次の打順を計算する
              targetBattingOrder = lastOppositeSideAtBat.battingOrder;
              targetBattingOrder = (targetBattingOrder % 9) + 1;
              targetHalf = oppositeHalf;
            } else {
              // 反対側のチームに打席がまだない場合は、1番打者から開始
              targetBattingOrder = 1;
              targetHalf = oppositeHalf;
            }
          } else {
            // 3アウト目が記録されていない場合は、現在の攻撃側の最後の打席を見る
            // useGameProcessorで既にadvanceBattingOrder()が呼ばれているので、
            // 最後の打席のbattingOrderをそのまま使用する（+1しない）
            const currentSideAtBats = batAtBats.filter(a => a.topOrBottom === currentHalfFromState);
            
            if (currentSideAtBats.length > 0) {
              // 現在の攻撃側の最後の打席を取得
              const lastCurrentSideAtBat = currentSideAtBats[currentSideAtBats.length - 1];
              // advanceBattingOrder()で既に打順が進んでいるので、そのまま使用
              targetBattingOrder = lastCurrentSideAtBat.battingOrder;
            } else {
              // 現在の攻撃側に打席がまだない場合は、1番打者から開始
              targetBattingOrder = 1;
            }
            targetHalf = currentHalfFromState;
          }

          // lineup配列から、battingOrderに対応するインデックスを探す
          const targetLineup = targetHalf === 'top' ? homeLineup : awayLineup;
          const targetIndex = targetLineup.findIndex((entry: any) => entry.battingOrder === targetBattingOrder);
          
          if (targetIndex !== -1) {
            if (targetHalf === 'top') {
              setHomeBatIndex(targetIndex);
              // データベースに保存
              await updateBattingIndexRealtime(matchId, { home: targetIndex });
            } else {
              setAwayBatIndex(targetIndex);
              // データベースに保存
              await updateBattingIndexRealtime(matchId, { away: targetIndex });
            }
          }
          
          // 打順を計算したので、最後に処理したplayIdを記録
          lastProcessedBatPlayIdRef.current = lastAtBat.playId;
        }
      } catch (atBatError) {
        console.warn('Error calculating current batter index from atBats:', atBatError);
        // エラーが発生した場合は、デフォルト値（0）を使用
      }
    };

    calculateBattingIndex();
  }, [matchId, lineup, allAtBats, currentHalf, homeLineup, awayLineup, homeBatIndex, awayBatIndex]);

  // 現在の half と打順に応じて currentBatter を更新
  useEffect(() => {
    const battingList = currentHalf === 'top' ? homeLineup : awayLineup;
    const battingIndex = currentHalf === 'top' ? (homeBatIndex ?? 0) : (awayBatIndex ?? 0);
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

  // 打順インデックスが変更されたときにデータベースに保存
  // ただし、初期化中はスキップ（advanceBattingOrder内で既に保存しているため）
  useEffect(() => {
    if (!matchId || isInitializingBatIndex.current || !batIndexInitialized.current) return;
    // homeBatIndexまたはawayBatIndexがundefinedの場合はスキップ
    if (homeBatIndex === undefined || awayBatIndex === undefined) return;
    
    updateBattingIndexRealtime(matchId, {
      home: homeBatIndex,
      away: awayBatIndex,
    }).catch(error => {
      console.error('Error updating batting index:', error);
    });
  }, [matchId, homeBatIndex, awayBatIndex]);

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
        previousPosition: previousParticipant?.positionAtStart || '',
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
          previousPosition: previousParticipant?.positionAtStart || '',
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
        const entry = homeLineup[(homeBatIndex ?? 0) % Math.max(1, homeLineup.length)];
        const nextBatter = homePlayers.find(p => p.playerId === entry?.playerId) || null;
          if ((currentBatter?.playerId || null) !== (nextBatter?.playerId || null)) {
          setCurrentBatter(nextBatter);
          setPitches([]);
        }
      } else {
        const entry = awayLineup[(awayBatIndex ?? 0) % Math.max(1, awayLineup.length)];
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
        const currentIdx = idx ?? 0;
        let nextIdx = (currentIdx + 1) % length;
        let attempts = 0;
        // FP(10番)をスキップ
        while (list[nextIdx] && list[nextIdx].battingOrder === 10 && attempts < length) {
          nextIdx = (nextIdx + 1) % length;
          attempts++;
        }
        // データベースに保存
        if (matchId) {
          updateBattingIndexRealtime(matchId, { home: nextIdx }).catch(error => {
            console.error('Error updating home batting index:', error);
          });
        }
        return nextIdx;
      });
    } else {
      const list = awayLineup;
      const length = list.length || 1;
      setAwayBatIndex(idx => {
        const currentIdx = idx ?? 0;
        let nextIdx = (currentIdx + 1) % length;
        let attempts = 0;
        // FP(10番)をスキップ
        while (list[nextIdx] && list[nextIdx].battingOrder === 10 && attempts < length) {
          nextIdx = (nextIdx + 1) % length;
          attempts++;
        }
        // データベースに保存
        if (matchId) {
          updateBattingIndexRealtime(matchId, { away: nextIdx }).catch(error => {
            console.error('Error updating away batting index:', error);
          });
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

