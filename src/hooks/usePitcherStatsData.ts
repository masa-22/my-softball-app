import { useCallback, useEffect, useState } from 'react';
import { getGame } from '../services/gameService';
import { getGameState } from '../services/gameStateService';
import { getPlayers } from '../services/playerService';
import { getAtBats } from '../services/atBatService';
import { useAtBats } from './useAtBats';
import { getLineup } from '../services/lineupService';
import { getWinningPitcher } from '../services/winningPitcherService';
import { BATTING_RESULTS } from '../data/softball/battingResults';
import { Player } from '../types/Player';
import { AtBat, RunnerEvent } from '../types/AtBat';

type Side = 'home' | 'away';

export interface PitcherStats {
  winLoss: string;        // 勝敗 (勝, 敗, -)
  inningsPitched: string; // 投球回数 (例: "5.1")
  battersFaced: number;   // 打者
  pitches: number;         // 球数
  hits: number;           // 安打
  homeRuns: number;       // 本塁打
  sacrificeBunts: number; // 犠打
  sacrificeFlies: number; // 犠飛
  strikeouts: number;     // 三振
  walks: number;          // 四球
  hitByPitch: number;     // 死球
  earnedRuns: number;     // 自責点
  wildPitches: number;    // 暴投
}

export interface PitcherStatsRowData {
  key: string;
  playerId: string | null;
  name: string;
  stats: PitcherStats;
}

export interface PitcherStatsTeamData {
  teamName: string;
  side: Side;
  rows: PitcherStatsRowData[];
}

export interface PitcherStatsData {
  home: PitcherStatsTeamData;
  away: PitcherStatsTeamData;
}

const formatPlayerName = (player: Player | undefined) => {
  if (!player) return '';
  const family = player.familyName ?? '';
  const given = player.givenName ?? '';
  return `${family} ${given}`.trim();
};

// ランナーが出塁した時点から得点するまでの過程でエラーやパスボールがあったかチェック
const hasErrorOrPassedBallInScoring = (
  runnerId: string,
  scoringAtBat: AtBat,
  allAtBats: AtBat[]
): boolean => {
  // その打席で得点したランナーかチェック
  if (!scoringAtBat.scoredRunners.includes(runnerId)) {
    return false;
  }

  // その打席のランナーイベントでエラーやパスボールがあったかチェック
  if (scoringAtBat.runnerEvents) {
    for (const event of scoringAtBat.runnerEvents) {
      if (event.runnerId === runnerId && (event.type === 'passedball' || event.type === 'wildpitch')) {
        return true;
      }
    }
  }

  // その打席の守備記録でエラーがあったかチェック
  if (scoringAtBat.playDetails?.fielding) {
    for (const fielding of scoringAtBat.playDetails.fielding) {
      if (fielding.action === 'error') {
        return true;
      }
    }
  }

  // そのランナーが出塁した打席を探す（時系列順に）
  const sortedAtBats = [...allAtBats].sort((a, b) => a.index - b.index);
  const onBaseAtBat = sortedAtBats.find(a => 
    a.index < scoringAtBat.index &&
    a.result && 
    a.batterId === runnerId && (
      a.result.type === 'error' ||
      a.result.type === 'walk' || 
      a.result.type === 'deadball' || 
      BATTING_RESULTS[a.result.type]?.stats.isHit ||
      BATTING_RESULTS[a.result.type]?.stats.isOnBase
    )
  );

  if (onBaseAtBat) {
    // 出塁時のエラーをチェック
    if (onBaseAtBat.result?.type === 'error') {
      return true;
    }
    if (onBaseAtBat.playDetails?.fielding) {
      for (const fielding of onBaseAtBat.playDetails.fielding) {
        if (fielding.action === 'error') {
          return true;
        }
      }
    }
    // 出塁時のパスボールや暴投をチェック
    if (onBaseAtBat.runnerEvents) {
      for (const event of onBaseAtBat.runnerEvents) {
        if (event.runnerId === runnerId && (event.type === 'passedball' || event.type === 'wildpitch')) {
          return true;
        }
      }
    }

    // 出塁後から得点までの間の打席でエラーやパスボールがあったかチェック
    const betweenAtBats = sortedAtBats.filter(
      a => a.index > onBaseAtBat.index && a.index < scoringAtBat.index
    );
    for (const betweenAtBat of betweenAtBats) {
      // その打席でランナーが進塁した場合、エラーやパスボールをチェック
      if (betweenAtBat.runnerEvents) {
        for (const event of betweenAtBat.runnerEvents) {
          if (event.runnerId === runnerId && (event.type === 'passedball' || event.type === 'wildpitch')) {
            return true;
          }
        }
      }
      if (betweenAtBat.playDetails?.fielding) {
        for (const fielding of betweenAtBat.playDetails.fielding) {
          if (fielding.action === 'error') {
            return true;
          }
        }
      }
    }
  }

  return false;
};

const calculatePitcherStats = (
  playerId: string,
  atBats: AtBat[],
  side: Side,
  gameState: Awaited<ReturnType<typeof getGameState>> | null
): PitcherStats => {
  const stats: PitcherStats = {
    winLoss: '-',
    inningsPitched: '0.0',
    battersFaced: 0,
    pitches: 0,
    hits: 0,
    homeRuns: 0,
    sacrificeBunts: 0,
    sacrificeFlies: 0,
    strikeouts: 0,
    walks: 0,
    hitByPitch: 0,
    earnedRuns: 0,
    wildPitches: 0,
  };

  // その投手が投げた打席をフィルタ
  const pitcherAtBats = atBats.filter(
    (atBat) => atBat.type === 'bat' && atBat.pitcherId === playerId
  );

  // 投球回数の計算
  let totalOuts = 0;
  pitcherAtBats.forEach((atBat) => {
    const outsAdded = Math.max(0, atBat.situationAfter.outs - atBat.situationBefore.outs);
    totalOuts += outsAdded;
  });
  const inningWhole = Math.floor(totalOuts / 3);
  const inningRemainder = totalOuts % 3;
  stats.inningsPitched = `${inningWhole}.${inningRemainder}`;

  // 打者数
  stats.battersFaced = pitcherAtBats.length;

  // 球数
  pitcherAtBats.forEach((atBat) => {
    stats.pitches += atBat.pitches.length;
  });

  // 各種統計
  pitcherAtBats.forEach((atBat) => {
    if (atBat.result) {
      const resultDef = BATTING_RESULTS[atBat.result.type];
      if (resultDef) {
        // 安打
        if (resultDef.stats.isHit) {
          stats.hits++;
          // 本塁打
          if (atBat.result.type === 'homerun' || atBat.result.type === 'runninghomerun') {
            stats.homeRuns++;
          }
        }

        // 犠打
        if (atBat.result.type === 'sac_bunt' || atBat.result.type === 'sacrifice_bunt') {
          stats.sacrificeBunts++;
        }

        // 犠飛
        if (atBat.result.type === 'sac_fly' || atBat.result.type === 'sacrifice_fly') {
          stats.sacrificeFlies++;
        }

        // 三振
        if (
          atBat.result.type === 'strikeout_swinging' ||
          atBat.result.type === 'strikeout_looking' ||
          atBat.result.type === 'droppedthird'
        ) {
          stats.strikeouts++;
        }

        // 四球
        if (atBat.result.type === 'walk') {
          stats.walks++;
        }

        // 死球
        if (atBat.result.type === 'deadball') {
          stats.hitByPitch++;
        }
      }
    }

    // 暴投
    if (atBat.runnerEvents) {
      atBat.runnerEvents.forEach((event) => {
        if (event.type === 'wildpitch') {
          stats.wildPitches++;
        }
      });
    }
  });

  // 失点と自責点の計算
  // その投手が投げた打席で得点したランナーをカウント
  pitcherAtBats.forEach((atBat) => {
    if (atBat.scoredRunners && atBat.scoredRunners.length > 0) {
      // その打席で得点したランナーは、その投手の失点
      // 自責点の計算：エラーやパスボールがなかった得点のみカウント
      atBat.scoredRunners.forEach((runnerId) => {
        // そのランナーが出塁した時点から得点するまでの過程でエラーやパスボールがあったかチェック
        if (!hasErrorOrPassedBallInScoring(runnerId, atBat, atBats)) {
          stats.earnedRuns++;
        }
      });
    }
  });

  return stats;
};

// 先発投手を特定（最初の打席で投げた投手、またはlineupから取得）
const getStartingPitcher = (
  side: Side,
  atBats: AtBat[],
  lineup: Awaited<ReturnType<typeof getLineup>> | null
): string | null => {
  // lineupから先発投手を取得（position === '1'）
  if (lineup) {
    const lineupSide = side === 'home' ? lineup.away : lineup.home; // 投手は相手チーム
    const pitcherEntry = lineupSide.find((e) => e.position === '1');
    if (pitcherEntry?.playerId) {
      return pitcherEntry.playerId;
    }
  }

  // lineupから取得できない場合、最初の打席で投げた投手を先発投手とする
  const firstAtBat = atBats
    .filter((a) => a.type === 'bat' && a.pitcherId)
    .find((a) => {
      const isPitcherSide =
        (side === 'home' && a.topOrBottom === 'bottom') ||
        (side === 'away' && a.topOrBottom === 'top');
      return isPitcherSide;
    });

  return firstAtBat?.pitcherId || null;
};

// 投手の交代タイミングを特定
const getPitcherChanges = (
  side: Side,
  atBats: AtBat[]
): Array<{ pitcherId: string; startIndex: number; endIndex: number }> => {
  const changes: Array<{ pitcherId: string; startIndex: number; endIndex: number }> = [];
  let currentPitcher: string | null = null;
  let startIndex = 0;

  const sortedAtBats = [...atBats]
    .filter((a) => a.type === 'bat' && a.pitcherId)
    .filter((a) => {
      const isPitcherSide =
        (side === 'home' && a.topOrBottom === 'bottom') ||
        (side === 'away' && a.topOrBottom === 'top');
      return isPitcherSide;
    })
    .sort((a, b) => a.index - b.index);

  sortedAtBats.forEach((atBat) => {
    if (currentPitcher !== atBat.pitcherId) {
      if (currentPitcher) {
        changes.push({
          pitcherId: currentPitcher,
          startIndex,
          endIndex: atBat.index - 1,
        });
      }
      currentPitcher = atBat.pitcherId;
      startIndex = atBat.index;
    }
  });

  if (currentPitcher && sortedAtBats.length > 0) {
    changes.push({
      pitcherId: currentPitcher,
      startIndex,
      endIndex: sortedAtBats[sortedAtBats.length - 1].index,
    });
  }

  return changes;
};

// 各時点でのスコアを計算
const getScoreAtAtBat = (
  atBatIndex: number,
  atBats: AtBat[],
  gameState: Awaited<ReturnType<typeof getGameState>> | null
): { home: number; away: number } => {
  let homeScore = 0;
  let awayScore = 0;

  const sortedAtBats = [...atBats].sort((a, b) => a.index - b.index);
  sortedAtBats.forEach((atBat) => {
    if (atBat.index > atBatIndex) return;
    if (atBat.scoredRunners && atBat.scoredRunners.length > 0) {
      if (atBat.topOrBottom === 'top') {
        homeScore += atBat.scoredRunners.length;
      } else {
        awayScore += atBat.scoredRunners.length;
      }
    }
  });

  return { home: homeScore, away: awayScore };
};

// 勝利投手を判定
const determineWinningPitcher = (
  side: Side,
  atBats: AtBat[],
  gameState: Awaited<ReturnType<typeof getGameState>> | null,
  lineup: Awaited<ReturnType<typeof getLineup>> | null,
  allPitchers: string[]
): string | null => {
  if (!gameState || gameState.status !== 'finished') return null;

  const isHomeTeam = side === 'home';
  const finalHomeScore = gameState.scores.top_total;
  const finalAwayScore = gameState.scores.bottom_total;
  const winningTeam = finalHomeScore > finalAwayScore ? 'home' : finalAwayScore > finalHomeScore ? 'away' : null;

  if (!winningTeam || (winningTeam === 'home' && side !== 'home') || (winningTeam === 'away' && side !== 'away')) {
    return null; // 負けたチームには勝利投手はいない
  }

  const startingPitcher = getStartingPitcher(side, atBats, lineup);
  const pitcherChanges = getPitcherChanges(side, atBats);
  const finalInning = Math.max(...atBats.map((a) => a.inning || 0), 0);

  // 先発投手の投球回数を計算
  const startingPitcherAtBats = atBats.filter(
    (a) => a.type === 'bat' && a.pitcherId === startingPitcher
  );
  let startingPitcherOuts = 0;
  startingPitcherAtBats.forEach((atBat) => {
    const outsAdded = Math.max(0, atBat.situationAfter.outs - atBat.situationBefore.outs);
    startingPitcherOuts += outsAdded;
  });
  const startingPitcherInnings = startingPitcherOuts / 3;

  // 先発投手の交代タイミングを特定
  const startingPitcherChange = pitcherChanges.find((c) => c.pitcherId === startingPitcher);
  const startingPitcherEndIndex = startingPitcherChange?.endIndex || 0;

  // 条件1: 先発投手が4回以上投げて、交代時にリードしていて、そのリードが維持された場合
  if (startingPitcher && startingPitcherInnings >= 4) {
    const scoreAtChange = getScoreAtAtBat(startingPitcherEndIndex, atBats, gameState);
    const wasLeading =
      (isHomeTeam && scoreAtChange.home > scoreAtChange.away) ||
      (!isHomeTeam && scoreAtChange.away > scoreAtChange.home);

    if (wasLeading) {
      // 交代後もリードが維持されたかチェック
      const scoreAfterChange = getScoreAtAtBat(atBats.length, atBats, gameState);
      const stillLeading =
        (isHomeTeam && scoreAfterChange.home > scoreAfterChange.away) ||
        (!isHomeTeam && scoreAfterChange.away > scoreAfterChange.home);

      if (stillLeading) {
        return startingPitcher;
      }
    }
  }

  // 条件2: 5回または6回で終了した試合で先発投手が3回以上投げて、交代時にリードしていて、そのリードが維持された場合
  if (startingPitcher && (finalInning === 5 || finalInning === 6) && startingPitcherInnings >= 3) {
    const scoreAtChange = getScoreAtAtBat(startingPitcherEndIndex, atBats, gameState);
    const wasLeading =
      (isHomeTeam && scoreAtChange.home > scoreAtChange.away) ||
      (!isHomeTeam && scoreAtChange.away > scoreAtChange.home);

    if (wasLeading) {
      const scoreAfterChange = getScoreAtAtBat(atBats.length, atBats, gameState);
      const stillLeading =
        (isHomeTeam && scoreAfterChange.home > scoreAfterChange.away) ||
        (!isHomeTeam && scoreAfterChange.away > scoreAfterChange.home);

      if (stillLeading) {
        return startingPitcher;
      }
    }
  }

  // 条件3: 1または2の条件を満たさず、2人以上の救援投手が出場した場合
  // この場合は、試合終了時に登板した投手を提示して選ばせる必要がある
  // 既に選択されている場合はそれを返す
  const reliefPitchers = allPitchers.filter((p) => p !== startingPitcher);
  if (reliefPitchers.length >= 2) {
    // 既に選択されている勝利投手を取得
    // matchIdが必要だが、この関数では取得できないため、後でbuildPitcherRowsForSideで処理
    return null; // 一旦nullを返し、後で処理
  }

  // 救援投手が1人の場合、その投手を勝利投手とする
  if (reliefPitchers.length === 1) {
    return reliefPitchers[0];
  }

  return null;
};

// 敗戦投手を判定（試合終了からさかのぼり、初めて相手にリードを許した失点が記録された投手）
const determineLosingPitcher = (
  side: Side,
  atBats: AtBat[],
  gameState: Awaited<ReturnType<typeof getGameState>> | null
): string | null => {
  if (!gameState || gameState.status !== 'finished') return null;

  const isHomeTeam = side === 'home';
  const finalHomeScore = gameState.scores.top_total;
  const finalAwayScore = gameState.scores.bottom_total;
  const losingTeam = finalHomeScore < finalAwayScore ? 'home' : finalAwayScore < finalHomeScore ? 'away' : null;

  if (!losingTeam || (losingTeam === 'home' && side !== 'home') || (losingTeam === 'away' && side !== 'away')) {
    return null; // 勝ったチームには敗戦投手はいない
  }

  // 試合終了からさかのぼり、初めて相手にリードを許した失点が記録された投手を探す
  const sortedAtBats = [...atBats]
    .filter((a) => a.type === 'bat' && a.pitcherId)
    .filter((a) => {
      const isPitcherSide =
        (side === 'home' && a.topOrBottom === 'bottom') ||
        (side === 'away' && a.topOrBottom === 'top');
      return isPitcherSide;
    })
    .sort((a, b) => b.index - a.index); // 逆順

  let currentHomeScore = finalHomeScore;
  let currentAwayScore = finalAwayScore;

  // 最初から負けている場合、最初の失点を記録した投手を探す
  const initiallyLosing = (isHomeTeam && currentHomeScore < currentAwayScore) ||
                          (!isHomeTeam && currentAwayScore < currentHomeScore);
  
  if (initiallyLosing) {
    // 最初から負けている場合、最初の失点を記録した投手を探す
    for (const atBat of sortedAtBats) {
      if (atBat.scoredRunners && atBat.scoredRunners.length > 0) {
        // この打席で得点があった場合、この投手が敗戦投手の候補
        // ただし、この打席の前に既に負けていた場合は、さらにさかのぼる必要がある
        if (atBat.topOrBottom === 'top') {
          currentHomeScore -= atBat.scoredRunners.length;
        } else {
          currentAwayScore -= atBat.scoredRunners.length;
        }
        
        // この打席の前のスコアで、まだリードしていたか、または同点だった場合
        const wasLeadingOrTied =
          (isHomeTeam && currentHomeScore >= currentAwayScore) ||
          (!isHomeTeam && currentAwayScore >= currentHomeScore);
        
        if (wasLeadingOrTied) {
          // この打席で初めて負けた
          return atBat.pitcherId;
        }
      }
    }
    // 最初から負けていた場合、最初の失点を記録した投手を返す
    const firstScoringAtBat = sortedAtBats.find((a) => a.scoredRunners && a.scoredRunners.length > 0);
    return firstScoringAtBat?.pitcherId || null;
  }

  // 最初はリードしていたが、途中で負けた場合
  for (const atBat of sortedAtBats) {
    // その打席で得点したランナーを差し引く前のスコアを保存
    const beforeHomeScore = currentHomeScore;
    const beforeAwayScore = currentAwayScore;
    
    // その打席で得点したランナーを差し引く
    if (atBat.scoredRunners && atBat.scoredRunners.length > 0) {
      if (atBat.topOrBottom === 'top') {
        currentHomeScore -= atBat.scoredRunners.length;
      } else {
        currentAwayScore -= atBat.scoredRunners.length;
      }

      // 得点を差し引く前のスコアでリードしていたかチェック
      const wasLeading =
        (isHomeTeam && beforeHomeScore > beforeAwayScore) ||
        (!isHomeTeam && beforeAwayScore > beforeHomeScore);
      
      // 得点を差し引いた後のスコアで同点または負けているかチェック
      const nowTiedOrBehind =
        (isHomeTeam && currentHomeScore <= currentAwayScore) ||
        (!isHomeTeam && currentAwayScore <= currentHomeScore);

      if (wasLeading && nowTiedOrBehind) {
        // この打席でリードを許した
        return atBat.pitcherId;
      }
    }
  }

  return null;
};

const buildPitcherRowsForSide = async ({
  side,
  players,
  atBats,
  gameState,
  lineup,
  matchId,
}: {
  side: Side;
  players: Player[];
  atBats: AtBat[];
  gameState: Awaited<ReturnType<typeof getGameState>> | null;
  lineup: Awaited<ReturnType<typeof getLineup>> | null;
  matchId: string;
}): Promise<PitcherStatsRowData[]> => {
  const rows: PitcherStatsRowData[] = [];
  const pitchersSet = new Set<string>();

  // そのサイドの投手を特定（pitcherIdでフィルタ）
  // side === 'home'の場合、topOrBottom === 'bottom'の打席で投げている（後攻の攻撃時に先攻が守備）
  // side === 'away'の場合、topOrBottom === 'top'の打席で投げている（先攻の攻撃時に後攻が守備）
  atBats.forEach((atBat) => {
    if (atBat.type === 'bat' && atBat.pitcherId) {
      const isPitcherSide =
        (side === 'home' && atBat.topOrBottom === 'bottom') ||
        (side === 'away' && atBat.topOrBottom === 'top');

      if (isPitcherSide && !pitchersSet.has(atBat.pitcherId)) {
        pitchersSet.add(atBat.pitcherId);
      }
    }
  });

  // 勝利投手・敗戦投手を判定
  const allPitcherIds = Array.from(pitchersSet);
  let winningPitcher = determineWinningPitcher(side, atBats, gameState, lineup, allPitcherIds);
  
  // 条件3の場合、既に選択されている勝利投手を取得
  if (!winningPitcher && gameState?.status === 'finished') {
    try {
      const savedWinningPitcher = await getWinningPitcher(matchId, side);
      if (savedWinningPitcher && allPitcherIds.includes(savedWinningPitcher)) {
        winningPitcher = savedWinningPitcher;
      }
    } catch (error) {
      console.error('Error getting winning pitcher:', error);
    }
  }
  
  const losingPitcher = determineLosingPitcher(side, atBats, gameState);

  // 投手ごとに統計を計算
  pitchersSet.forEach((pitcherId) => {
    const player = players.find((p) => p.playerId === pitcherId);
    const displayName = formatPlayerName(player) || '未登録';
    const stats = calculatePitcherStats(pitcherId, atBats, side, gameState);

    // 勝敗を設定
    if (gameState?.status === 'finished') {
      if (pitcherId === winningPitcher) {
        stats.winLoss = '勝';
      } else if (pitcherId === losingPitcher) {
        stats.winLoss = '敗';
      }
    }

    rows.push({
      key: `${side}-pitcher-${pitcherId}`,
      playerId: pitcherId,
      name: displayName,
      stats,
    });
  });

  // 投手がいない場合
  if (rows.length === 0) {
    rows.push({
      key: `${side}-pitcher-empty`,
      playerId: null,
      name: '',
      stats: {
        winLoss: '-',
        inningsPitched: '0.0',
        battersFaced: 0,
        pitches: 0,
        hits: 0,
        homeRuns: 0,
        sacrificeBunts: 0,
        sacrificeFlies: 0,
        strikeouts: 0,
        walks: 0,
        hitByPitch: 0,
        earnedRuns: 0,
        wildPitches: 0,
      },
    });
  }

  return rows;
};

const buildPitcherStatsData = async (matchId: string, atBats: AtBat[]): Promise<PitcherStatsData | null> => {
  const game = await getGame(matchId);
  if (!game || !game.topTeam || !game.bottomTeam) return null;

  let gameState = null;
  try {
    gameState = await getGameState(matchId);
  } catch (error) {
    console.warn('Error getting game state (may be permission issue):', error);
    // gameStateが取得できない場合でも続行
  }

  const lineup = await getLineup(matchId);
  const homePlayers = await getPlayers(game.topTeam.id);
  const awayPlayers = await getPlayers(game.bottomTeam.id);

  const homeTeam: PitcherStatsTeamData = {
    teamName: game.topTeam.name,
    side: 'home',
    rows: await buildPitcherRowsForSide({
      side: 'home',
      players: homePlayers,
      atBats,
      gameState,
      lineup,
      matchId,
    }),
  };

  const awayTeam: PitcherStatsTeamData = {
    teamName: game.bottomTeam.name,
    side: 'away',
    rows: await buildPitcherRowsForSide({
      side: 'away',
      players: awayPlayers,
      atBats,
      gameState,
      lineup,
      matchId,
    }),
  };

  return { home: homeTeam, away: awayTeam };
};

export const usePitcherStatsData = (matchId?: string) => {
  const [data, setData] = useState<PitcherStatsData | null>(null);
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
        const next = await buildPitcherStatsData(matchId, currentAtBats);
        setData(next);
      } catch (error) {
        console.warn('pitcher stats load error', error);
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

  const refresh = useCallback(() => loadData(), [loadData]);

  return { data, loading, refresh };
};

// 条件3の場合に使用する、登板した投手のリストを取得
export const getPitchersForSelection = async (matchId: string, side: Side): Promise<Array<{ playerId: string; player: Player | undefined }>> => {
  const game = await getGame(matchId);
  if (!game || !game.topTeam || !game.bottomTeam) return [];

  const atBats = await getAtBats(matchId);
  const players = side === 'home' ? await getPlayers(game.topTeam.id) : await getPlayers(game.bottomTeam.id);
  const pitchersSet = new Set<string>();

  atBats.forEach((atBat) => {
    if (atBat.type === 'bat' && atBat.pitcherId) {
      const isPitcherSide =
        (side === 'home' && atBat.topOrBottom === 'bottom') ||
        (side === 'away' && atBat.topOrBottom === 'top');

      if (isPitcherSide && !pitchersSet.has(atBat.pitcherId)) {
        pitchersSet.add(atBat.pitcherId);
      }
    }
  });

  return Array.from(pitchersSet).map((pitcherId) => ({
    playerId: pitcherId,
    player: players.find((p) => p.playerId === pitcherId),
  }));
};

