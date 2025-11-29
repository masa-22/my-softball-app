/**
 * 1球・1プレー登録画面のメインコンポーネント
 * - スコアボード、打者・投手、コース入力、ランナー状況などを表示
 */
import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import ScoreBoard from './ScoreBoard';
import RunnerStatus from './RunnerStatus';
import PitchCourseInput from './PitchCourseInput';
import { getMatches } from '../../services/matchService';
import { getLineup } from '../../services/lineupService';
import { getPlayers } from '../../services/playerService';
import { getPlays } from '../../services/playService';

const PlayRegister: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();

  const [match, setMatch] = useState<any>(null);
  const [lineup, setLineup] = useState<any>(null);
  const [homePlayers, setHomePlayers] = useState<any[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<any[]>([]);
  const [currentBatter, setCurrentBatter] = useState<any>(null);
  const [currentPitcher, setCurrentPitcher] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'pitch' | 'runner'>('pitch');

  useEffect(() => {
    if (!matchId) return;
    const m = getMatches().find(x => x.id === matchId);
    setMatch(m);
    const l = getLineup(matchId);
    setLineup(l);
    if (m && l) {
      const homePs = getPlayers(m.homeTeamId);
      const awayPs = getPlayers(m.awayTeamId);
      setHomePlayers(homePs);
      setAwayPlayers(awayPs);
      const batterEntry = l.home[0]; // 仮: 先攻 1番打者
      const pitcherEntry = l.away.find((e: any) => e.position === '1'); // 仮: 後攻 投手
      const batter = homePs.find(p => p.playerId === batterEntry?.playerId) || null;
      const pitcher = awayPs.find(p => p.playerId === pitcherEntry?.playerId) || null;
      setCurrentBatter(batter);
      setCurrentPitcher(pitcher);
    }
  }, [matchId]);

  // 現在打者の打順（lineup から取得：数字のみ）
  const currentBattingOrder = useMemo(() => {
    if (!lineup || !currentBatter) return '';
    const entry = lineup.home.find((e: any) => e.playerId === currentBatter.playerId);
    if (!entry) return '';
    return entry.battingOrder === 10 ? '' : String(entry.battingOrder);
  }, [lineup, currentBatter]);

  // 現在打者の過去打席結果（直近から最大3件）
  const recentBatterResults = useMemo(() => {
    if (!matchId || !currentBatter) return [];
    const plays = getPlays(matchId).filter(p => p.batterId === currentBatter.playerId);
    // 打席終了っぽい結果のみ簡易抽出（ヒット/アウト/四球/死球 など）
    const atBatResults = plays
      .filter(p => ['ヒット', 'アウト', '四球', '死球', '得点', '犠打', '犠飛'].includes(p.result))
      .map(p => ({ inning: p.inning, half: p.topOrBottom, result: p.result }))
      .reverse()
      .slice(0, 3);
    return atBatResults;
  }, [matchId, currentBatter]);

  // 投手の現在回・球数・ストライク/ボール数
  const pitcherStats = useMemo(() => {
    if (!matchId || !currentPitcher) return { inningStr: '0', total: 0, strikes: 0, balls: 0, inning: 1, half: 'top' as 'top' | 'bottom' };
    const plays = getPlays(matchId);
    // アウト数（当該投手が関与した「アウト」結果をカウント）
    const outs = plays.filter(p => p.pitcherId === currentPitcher.playerId && p.result === 'アウト').length;
    const inningWhole = Math.floor(outs / 3);
    const inningRemainder = outs % 3;
    const inningStr = `${inningWhole}.${inningRemainder}`; // 例: 5アウト => 1.2回

    // 現在進行中の回と球数（簡易集計）
    const last = plays.length ? plays[plays.length - 1] : undefined;
    const currentInning = last ? last.inning : 1;
    const currentHalf = last ? last.topOrBottom : 'top';

    const thisInningPlays = plays.filter(
      p => p.inning === currentInning && p.topOrBottom === currentHalf && p.pitcherId === currentPitcher.playerId
    );
    const strikes = thisInningPlays.filter(p => p.result === 'ストライク' || p.result === 'ファウル').length;
    const balls = thisInningPlays.filter(p => p.result === 'ボール' || p.result === '死球' || p.result === '四球').length;
    const total = thisInningPlays.length;

    return { inningStr, total, strikes, balls, inning: currentInning, half: currentHalf };
  }, [matchId, currentPitcher]);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 20 }}>
      {/* スコアボード（常時上部） */}
      <ScoreBoard />

      {/* 現在の打者・投手情報（拡充版） */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, margin: '16px 0', alignItems: 'flex-start' }}>
        {/* 打者 */}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>打者</div>
          <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* 太字の打順（数字のみ）を先頭に表示 */}
            {currentBattingOrder && <span style={{ fontWeight: 'bold', fontSize: 18 }}>{currentBattingOrder}</span>}
            <span>{currentBatter ? `${currentBatter.familyName} ${currentBatter.givenName}` : '—'}</span>
          </div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {recentBatterResults.length > 0 ? (
              <div>
                直近打席:
                <ul style={{ margin: '4px 0 0 16px' }}>
                  {recentBatterResults.map((r, i) => (
                    <li key={i}>{`${r.inning}回${r.half === 'top' ? '表' : '裏'}: ${r.result}`}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <span>過去打席なし</span>
            )}
          </div>
        </div>

        {/* 投手 */}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>投手</div>
          <div style={{ marginBottom: 4 }}>{currentPitcher ? `${currentPitcher.familyName} ${currentPitcher.givenName}` : '—'}</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {/* イニングはアウト数から算出（例: 5アウト => 1.2回） */}
             {`投球回: ${pitcherStats.inningStr}回 / 球数: ${pitcherStats.total}球（S:${pitcherStats.strikes} B:${pitcherStats.balls}）`}
          </div>
        </div>
      </div>

      {/* タブ切り替え（既存） */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #eee', marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setActiveTab('pitch')}
          style={{
            padding: '10px 16px',
            background: activeTab === 'pitch' ? '#3498db' : '#f5f5f5',
            color: activeTab === 'pitch' ? '#fff' : '#333',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          コース・球種
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('runner')}
          style={{
            padding: '10px 16px',
            background: activeTab === 'runner' ? '#3498db' : '#f5f5f5',
            color: activeTab === 'runner' ? '#fff' : '#333',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          ランナー
        </button>
      </div>

      {/* タブ内容（既存） */}
      <div style={{ padding: 12, background: '#fafafa', borderRadius: 6, border: '1px solid #eee' }}>
        {activeTab === 'pitch' ? <PitchCourseInput /> : <RunnerStatus />}
      </div>
    </div>
  );
};

export default PlayRegister;
