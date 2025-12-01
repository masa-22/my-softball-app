/**
 * 1球・1プレー登録画面のメインコンポーネント
 * - スコアボード、打者・投手、コース入力、ランナー状況などを表示
 */
import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import ScoreBoard from './ScoreBoard';
import RunnerStatus from './RunnerStatus';
import PitchCourseInput from './PitchCourseInput';
import PlayResultPanel from './PlayResultPanel';
import LineupPanel from './LineupPanel';
import { getMatches } from '../../services/matchService';
import { getLineup, saveLineup } from '../../services/lineupService';
import { getPlayers } from '../../services/playerService';
import { getPlays } from '../../services/playService';
import { getTeams } from '../../services/teamService';

const POSITIONS = ['1','2','3','4','5','6','7','8','9','DP','PH','PR','TR'];

const PlayRegister: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();

  const [match, setMatch] = useState<any>(null);
  const [lineup, setLineup] = useState<any>(null);
  const [homePlayers, setHomePlayers] = useState<any[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<any[]>([]);
  const [currentBatter, setCurrentBatter] = useState<any>(null);
  const [currentPitcher, setCurrentPitcher] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'pitch' | 'runner'>('pitch');
  
  // 追加: プレー結果入力モード
  const [showPlayResult, setShowPlayResult] = useState(false);

  // 追加: サイドバー編集用 state（先攻/後攻）
  const [homeLineup, setHomeLineup] = useState<any[]>([]);
  const [awayLineup, setAwayLineup] = useState<any[]>([]);
  const [homeTeamName, setHomeTeamName] = useState<string>('先攻');
  const [awayTeamName, setAwayTeamName] = useState<string>('後攻');

  // 追加: ランナー状態を管理
  const [runners, setRunners] = useState<{ '1': string | null; '2': string | null; '3': string | null }>({
    '1': null, '2': null, '3': null,
  });

  // ランナー変更ハンドラ
  const handleRunnersChange = (newRunners: { '1': string | null; '2': string | null; '3': string | null }) => {
    console.log('ランナー変更:', newRunners); // デバッグ用
    setRunners(newRunners);
  };

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
      // 打者・投手（仮）
      const batterEntry = l.home[0];
      const pitcherEntry = l.away.find((e: any) => e.position === '1');
      const batter = homePs.find(p => p.playerId === batterEntry?.playerId) || null;
      const pitcher = awayPs.find(p => p.playerId === pitcherEntry?.playerId) || null;
      setCurrentBatter(batter);
      setCurrentPitcher(pitcher);

      // 追加: サイドバー表示用ラインナップ
      setHomeLineup(l.home);
      setAwayLineup(l.away);

      // チーム名: teamService から取得して設定
      const teams = getTeams();
      const homeTeam = teams.find(t => String(t.id) === String(m.homeTeamId));
      const awayTeam = teams.find(t => String(t.id) === String(m.awayTeamId));
      setHomeTeamName(homeTeam ? homeTeam.teamName : '先攻');
      setAwayTeamName(awayTeam ? awayTeam.teamName : '後攻');
    }
  }, [matchId]);

  // 現在打者の打順（数字のみ）
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

  // 追加: ラインナップ編集ハンドラ
  const handlePositionChange = (side: 'home' | 'away', index: number, value: string) => {
    const list = side === 'home' ? [...homeLineup] : [...awayLineup];
    list[index].position = value;
    side === 'home' ? setHomeLineup(list) : setAwayLineup(list);
  };

  const handlePlayerChange = (side: 'home' | 'away', index: number, value: string) => {
    const list = side === 'home' ? [...homeLineup] : [...awayLineup];
    list[index].playerId = value;
    side === 'home' ? setHomeLineup(list) : setAwayLineup(list);
  };

  const handleSidebarSave = (side: 'home' | 'away') => {
    if (!matchId) return;
    const updatedLineup = side === 'home' 
      ? { home: homeLineup, away: awayLineup }
      : { home: homeLineup, away: awayLineup };
    saveLineup(matchId, updatedLineup);
  };

  // インプレイ登録時のコールバック
  const handleInplayCommit = () => {
    setShowPlayResult(true);
  };

  // プレー結果入力完了時のコールバック
  const handlePlayResultComplete = () => {
    setShowPlayResult(false);
    // 必要に応じてカウント・打者をリセット等
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20, backgroundColor: '#f8f9fa' }}>
      {/* スコアボード（常時上部） */}
      <ScoreBoard />

      {/* 本体は3カラム: 左=後攻ラインナップ, 中央=入力UI, 右=先攻ラインナップ */}
      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr 280px', gap:16 }}>
        {/* 左（後攻） */}
        <div>
          <LineupPanel
            teamName={awayTeamName}
            lineup={awayLineup}
            players={awayPlayers}
            currentPitcherId={currentPitcher?.playerId}
            runners={runners}
            onPositionChange={(idx, val) => handlePositionChange('away', idx, val)}
            onPlayerChange={(idx, val) => handlePlayerChange('away', idx, val)}
            onSave={() => handleSidebarSave('away')}
          />
          
          {/* 投手情報 */}
          <div style={{ marginTop: 12, padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #dee2e6' }}>
            <div style={{ fontWeight: 600, marginBottom: 6, color: '#495057', fontSize: 14 }}>現在の投手</div>
            <div style={{ marginBottom: 6, fontSize: 15, fontWeight: 500 }}>
              {currentPitcher ? `${currentPitcher.familyName} ${currentPitcher.givenName}` : '—'}
            </div>
            <div style={{ fontSize: 12, color: '#6c757d' }}>
              {`投球回: ${pitcherStats.inningStr}回 / 球数: ${pitcherStats.total}球`}
            </div>
            <div style={{ fontSize: 12, color: '#6c757d' }}>
              {`S:${pitcherStats.strikes} B:${pitcherStats.balls}`}
            </div>
          </div>
        </div>

        {/* 中央: タブ or プレー結果入力 */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          {!showPlayResult ? (
            <>
              {/* タブ切り替え */}
              <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #dee2e6', marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('pitch')}
                  style={{ 
                    padding: '12px 20px', 
                    background: activeTab === 'pitch' ? '#4c6ef5' : 'transparent', 
                    color: activeTab === 'pitch' ? '#fff' : '#495057', 
                    border: 'none', 
                    borderRadius: '8px 8px 0 0', 
                    fontWeight: 600, 
                    cursor: 'pointer',
                    fontSize: 15,
                    transition: 'all 0.2s ease',
                  }}
                >
                  コース・球種
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('runner')}
                  style={{ 
                    padding: '12px 20px', 
                    background: activeTab === 'runner' ? '#4c6ef5' : 'transparent', 
                    color: activeTab === 'runner' ? '#fff' : '#495057', 
                    border: 'none', 
                    borderRadius: '8px 8px 0 0', 
                    fontWeight: 600, 
                    cursor: 'pointer',
                    fontSize: 15,
                    transition: 'all 0.2s ease',
                  }}
                >
                  ランナー
                </button>
              </div>

              <div>
                {activeTab === 'pitch' ? (
                  <PitchCourseInput onInplayCommit={handleInplayCommit} />
                ) : activeTab === 'runner' ? (
                  <RunnerStatus onChange={handleRunnersChange} />
                ) : null}
              </div>
            </>
          ) : (
            <PlayResultPanel onComplete={handlePlayResultComplete} />
          )}
        </div>

        {/* 右（先攻） */}
        <div>
          <LineupPanel
            teamName={homeTeamName}
            lineup={homeLineup}
            players={homePlayers}
            currentBatterId={currentBatter?.playerId}
            runners={runners}
            onPositionChange={(idx, val) => handlePositionChange('home', idx, val)}
            onPlayerChange={(idx, val) => handlePlayerChange('home', idx, val)}
            onSave={() => handleSidebarSave('home')}
          />
          
          {/* 打者情報 */}
          <div style={{ marginTop: 12, padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #dee2e6' }}>
            <div style={{ fontWeight: 600, marginBottom: 6, color: '#495057', fontSize: 14 }}>現在の打者</div>
            <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              {currentBattingOrder && <span style={{ fontWeight: 700, fontSize: 18, color: '#212529' }}>{currentBattingOrder}</span>}
              <span style={{ fontSize: 15, fontWeight: 500 }}>
                {currentBatter ? `${currentBatter.familyName} ${currentBatter.givenName}` : '—'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#6c757d' }}>
              {recentBatterResults.length > 0 ? (
                <div>
                  直近打席:
                  <ul style={{ margin: '4px 0 0 16px', paddingLeft: 0 }}>
                    {recentBatterResults.map((r, i) => (
                      <li key={i} style={{ fontSize: 11 }}>{`${r.inning}回${r.half === 'top' ? '表' : '裏'}: ${r.result}`}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <span>過去打席なし</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayRegister;
