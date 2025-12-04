import { useState, useEffect, useRef, useMemo } from 'react';
import { getLineup, saveLineup, recordStartersFromLineup, applySubstitutionToLineup } from '../services/lineupService';
import { getPlayers } from '../services/playerService';
import { getTeams } from '../services/teamService';
import { getGame } from '../services/gameService';
import { getParticipations } from '../services/participationService';
import { getGameState, updateRunnersRealtime, updateMatchupRealtime } from '../services/gameStateService';
import { PitchData } from '../types/PitchData';
import { getAtBats } from '../services/atBatService';
import { formatAtBatSummary } from '../utils/scoreKeeping';

export type RecentResultDisplay = { playId: string; label: string; rbi: number };

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

  // 差分検出用スナップショット
  const [prevHomeSnapshot, setPrevHomeSnapshot] = useState<any[]>([]);
  const [prevAwaySnapshot, setPrevAwaySnapshot] = useState<any[]>([]);

  const lineupInitialized = useRef(false);

  // 初期データロード
  useEffect(() => {
    if (!matchId) return;
    const g = getGame(matchId);
    setMatch(g ? {
      id: g.gameId,
      homeTeamId: g.topTeam.id,
      awayTeamId: g.bottomTeam.id,
      date: g.date,
      startTime: '',
    } : null);

    const l = getLineup(matchId);
    setLineup(l);

    if (g && l) {
      const homePs = getPlayers(g.topTeam.id);
      const awayPs = getPlayers(g.bottomTeam.id);
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
      const teams = getTeams();
      const homeTeam = teams.find(t => String(t.id) === String(g.topTeam.id));
      const awayTeam = teams.find(t => String(t.id) === String(g.bottomTeam.id));
      setHomeTeamName(homeTeam ? homeTeam.teamName : '先攻');
      setAwayTeamName(awayTeam ? awayTeam.teamName : '後攻');
    }
  }, [matchId]);

  // 初期化時の打順インデックスリセット
  useEffect(() => {
    if (!lineup || lineupInitialized.current) return;
    setHomeBatIndex(0);
    setAwayBatIndex(0);
    lineupInitialized.current = true;
  }, [lineup]);

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

  // game_states.matchup のリアルタイム更新
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
  const handleSidebarSave = async (side: 'home' | 'away') => {
    if (!matchId) return;
    const nextHome = homeLineupDraft.map(entry => ({ ...entry }));
    const nextAway = awayLineupDraft.map(entry => ({ ...entry }));
    const updatedLineup = { matchId, home: nextHome, away: nextAway };
    saveLineup(matchId, updatedLineup);
    setHomeLineup(nextHome);
    setAwayLineup(nextAway);
    setLineup(updatedLineup);

    const newRunners = { ...runners };

    // participation 同期
    try {
      const table = getParticipations(matchId);
      const noStartersYet = (table.home.length === 0 && table.away.length === 0);
      if (noStartersYet) {
        await recordStartersFromLineup(matchId);
      } else {
        const gs = getGameState(matchId);
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
            await applySubstitutionToLineup({
              matchId,
              side,
              battingOrder: cur.battingOrder,
              inPlayerId: cur.playerId,
              inning,
              kind,
              position: cur.position,
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
      const gs = getGameState(matchId);
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
      const length = homeLineup.length || 1;
      setHomeBatIndex(idx => (idx + 1) % length);
    } else {
      const length = awayLineup.length || 1;
      setAwayBatIndex(idx => (idx + 1) % length);
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
    if (!matchId || !currentBatter) return [];
    const allAtBats = getAtBats(matchId);
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
      .reverse()
      .slice(0, 3);
  }, [matchId, currentBatter]);

  // 攻撃側チームID
  const offenseTeamId = useMemo(() => {
    if (!match) return null;
    return currentHalf === 'top' ? match.homeTeamId : match.awayTeamId;
  }, [match, currentHalf]);

  // 攻撃側選手リスト
  const offensePlayers = useMemo(() => {
    if (offenseTeamId == null) return [];
    return getPlayers(offenseTeamId);
  }, [offenseTeamId]);

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
  };
};

