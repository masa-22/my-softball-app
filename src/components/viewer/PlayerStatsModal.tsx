import React, { useState, useEffect, useMemo } from 'react';
import { PlayerGameStats, PlayerBattingStats, PlayerPitchingStats } from '../../types/PlayerGameStats';
import { getPlayerStatsByPlayerId } from '../../services/playerGameStatsService';
import LoadingIndicator from '../common/LoadingIndicator';
import { Player } from '../../types/Player';

interface PlayerStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: {
    playerId: string;
    familyName: string;
    givenName: string;
    uniformNumber?: string;
  } | null;
}

type TabType = 'career' | 'history';

const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({ isOpen, onClose, player }) => {
  const [activeTab, setActiveTab] = useState<TabType>('career');
  const [stats, setStats] = useState<PlayerGameStats[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && player) {
      setLoading(true);
      setActiveTab('career'); // Reset tab on open
      getPlayerStatsByPlayerId(player.playerId)
        .then((data) => {
          setStats(data);
        })
        .catch((err) => {
          console.error(err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
        setStats([]);
    }
  }, [isOpen, player]);

  const careerStats = useMemo(() => {
    if (stats.length === 0) return null;

    const batting: PlayerBattingStats = {
      plateAppearances: 0,
      atBats: 0,
      hits: 0,
      doubles: 0,
      triples: 0,
      homeruns: 0,
      runsBattedIn: 0,
      runsScored: 0,
      walks: 0,
      deadballs: 0,
      strikeouts: 0,
      stolenBases: 0,
      sacrificeBunts: 0,
      sacrificeFlies: 0,
    };
    
    // 投手成績は登板した試合のみ集計
    const pitchingStatsList = stats.filter(s => s.pitching).map(s => s.pitching!);
    let pitching: PlayerPitchingStats | null = null;
    
    if (pitchingStatsList.length > 0) {
        pitching = {
            outsPitched: 0,
            batterFaced: 0,
            hitsAllowed: 0,
            runsAllowed: 0,
            earnedRuns: 0,
            strikeouts: 0,
            walks: 0,
            deadballs: 0,
            homersHit: 0,
            win: false, // 勝利数のカウントに使用
            loss: false, // 敗戦数のカウントに使用
        };
    }

    let wins = 0;
    let losses = 0;

    stats.forEach((game) => {
      // Batting
      batting.plateAppearances += game.batting.plateAppearances;
      batting.atBats += game.batting.atBats;
      batting.hits += game.batting.hits;
      batting.doubles += game.batting.doubles;
      batting.triples += game.batting.triples;
      batting.homeruns += game.batting.homeruns;
      batting.runsBattedIn += game.batting.runsBattedIn;
      batting.runsScored += game.batting.runsScored;
      batting.walks += game.batting.walks;
      batting.deadballs += game.batting.deadballs;
      batting.strikeouts += game.batting.strikeouts;
      batting.stolenBases += game.batting.stolenBases;
      batting.sacrificeBunts += game.batting.sacrificeBunts;
      batting.sacrificeFlies += game.batting.sacrificeFlies;

      // Pitching
      if (game.pitching && pitching) {
        pitching.outsPitched += game.pitching.outsPitched;
        pitching.batterFaced += game.pitching.batterFaced;
        pitching.hitsAllowed += game.pitching.hitsAllowed;
        pitching.runsAllowed += game.pitching.runsAllowed;
        pitching.earnedRuns += game.pitching.earnedRuns;
        pitching.strikeouts += game.pitching.strikeouts;
        pitching.walks += game.pitching.walks;
        pitching.deadballs += game.pitching.deadballs;
        pitching.homersHit += game.pitching.homersHit;
        if (game.pitching.win) wins++;
        if (game.pitching.loss) losses++;
      }
    });

    const average = batting.atBats > 0 ? (batting.hits / batting.atBats).toFixed(3) : '.---';
    const onBasePercentage = (batting.atBats + batting.walks + batting.deadballs + batting.sacrificeFlies) > 0 
        ? ((batting.hits + batting.walks + batting.deadballs) / (batting.atBats + batting.walks + batting.deadballs + batting.sacrificeFlies)).toFixed(3)
        : '.---';
    
    // ERA calculation: (Earned Runs * 7) / Innings Pitched
    // Innings Pitched = outsPitched / 3
    let era = '---';
    if (pitching && pitching.outsPitched > 0) {
        const innings = pitching.outsPitched / 3;
        era = ((pitching.earnedRuns * 7) / innings).toFixed(2);
    }

    return {
      batting,
      pitching,
      wins,
      losses,
      average,
      onBasePercentage,
      era,
      gameCount: stats.length
    };
  }, [stats]);

  if (!isOpen || !player) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3000,
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    padding: '16px',
    borderBottom: '1px solid #eee',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const contentStyle: React.CSSProperties = {
    padding: '16px',
    overflowY: 'auto',
    flex: 1,
  };

  const tabContainerStyle: React.CSSProperties = {
    display: 'flex',
    borderBottom: '1px solid #ddd',
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '12px 24px',
    cursor: 'pointer',
    backgroundColor: isActive ? '#fff' : '#f5f5f5',
    borderBottom: isActive ? '2px solid #3498db' : 'none',
    fontWeight: isActive ? 'bold' : 'normal',
    color: isActive ? '#3498db' : '#666',
  });

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    marginTop: '10px',
  };

  const thStyle: React.CSSProperties = {
    border: '1px solid #ddd',
    padding: '8px',
    backgroundColor: '#f9f9f9',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    border: '1px solid #ddd',
    padding: '8px',
    textAlign: 'center',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0 }}>
            {player.familyName} {player.givenName} <span style={{fontSize: '0.8em', color: '#666'}}>成績詳細</span>
          </h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#999'
            }}
          >
            &times;
          </button>
        </div>

        <div style={tabContainerStyle}>
          <div style={tabStyle(activeTab === 'career')} onClick={() => setActiveTab('career')}>
            通算成績
          </div>
          <div style={tabStyle(activeTab === 'history')} onClick={() => setActiveTab('history')}>
            試合履歴
          </div>
        </div>

        <div style={contentStyle}>
          {loading ? (
            <LoadingIndicator />
          ) : stats.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
               成績データがありません。
             </div>
          ) : activeTab === 'career' && careerStats ? (
            <div>
              <h3>打撃成績 (通算 {careerStats.gameCount}試合)</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>打率</th>
                      <th style={thStyle}>打席</th>
                      <th style={thStyle}>打数</th>
                      <th style={thStyle}>安打</th>
                      <th style={thStyle}>二塁打</th>
                      <th style={thStyle}>三塁打</th>
                      <th style={thStyle}>本塁打</th>
                      <th style={thStyle}>打点</th>
                      <th style={thStyle}>得点</th>
                      <th style={thStyle}>三振</th>
                      <th style={thStyle}>四球</th>
                      <th style={thStyle}>死球</th>
                      <th style={thStyle}>犠打</th>
                      <th style={thStyle}>犠飛</th>
                      <th style={thStyle}>盗塁</th>
                      <th style={thStyle}>出塁率</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={tdStyle}>{careerStats.average}</td>
                      <td style={tdStyle}>{careerStats.batting.plateAppearances}</td>
                      <td style={tdStyle}>{careerStats.batting.atBats}</td>
                      <td style={tdStyle}>{careerStats.batting.hits}</td>
                      <td style={tdStyle}>{careerStats.batting.doubles}</td>
                      <td style={tdStyle}>{careerStats.batting.triples}</td>
                      <td style={tdStyle}>{careerStats.batting.homeruns}</td>
                      <td style={tdStyle}>{careerStats.batting.runsBattedIn}</td>
                      <td style={tdStyle}>{careerStats.batting.runsScored}</td>
                      <td style={tdStyle}>{careerStats.batting.strikeouts}</td>
                      <td style={tdStyle}>{careerStats.batting.walks}</td>
                      <td style={tdStyle}>{careerStats.batting.deadballs}</td>
                      <td style={tdStyle}>{careerStats.batting.sacrificeBunts}</td>
                      <td style={tdStyle}>{careerStats.batting.sacrificeFlies}</td>
                      <td style={tdStyle}>{careerStats.batting.stolenBases}</td>
                      <td style={tdStyle}>{careerStats.onBasePercentage}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {careerStats.pitching && (
                <div style={{ marginTop: '24px' }}>
                  <h3>投手成績</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={thStyle}>防御率</th>
                          <th style={thStyle}>勝利</th>
                          <th style={thStyle}>敗戦</th>
                          <th style={thStyle}>投球回</th>
                          <th style={thStyle}>被安打</th>
                          <th style={thStyle}>被本塁打</th>
                          <th style={thStyle}>奪三振</th>
                          <th style={thStyle}>与四球</th>
                          <th style={thStyle}>与死球</th>
                          <th style={thStyle}>失点</th>
                          <th style={thStyle}>自責点</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={tdStyle}>{careerStats.era}</td>
                          <td style={tdStyle}>{careerStats.wins}</td>
                          <td style={tdStyle}>{careerStats.losses}</td>
                          <td style={tdStyle}>
                              {Math.floor(careerStats.pitching.outsPitched / 3)}
                              {careerStats.pitching.outsPitched % 3 !== 0 ? ` ${careerStats.pitching.outsPitched % 3}/3` : ''}
                          </td>
                          <td style={tdStyle}>{careerStats.pitching.hitsAllowed}</td>
                          <td style={tdStyle}>{careerStats.pitching.homersHit}</td>
                          <td style={tdStyle}>{careerStats.pitching.strikeouts}</td>
                          <td style={tdStyle}>{careerStats.pitching.walks}</td>
                          <td style={tdStyle}>{careerStats.pitching.deadballs}</td>
                          <td style={tdStyle}>{careerStats.pitching.runsAllowed}</td>
                          <td style={tdStyle}>{careerStats.pitching.earnedRuns}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={{...thStyle, textAlign: 'left'}}>日付</th>
                      <th style={{...thStyle, textAlign: 'left'}}>大会/試合名</th>
                      <th style={{...thStyle, textAlign: 'left'}}>対戦相手</th>
                      <th style={thStyle}>打席</th>
                      <th style={thStyle}>打数</th>
                      <th style={thStyle}>安打</th>
                      <th style={thStyle}>打点</th>
                      <th style={thStyle}>本塁打</th>
                      <th style={thStyle}>三振</th>
                      <th style={thStyle}>四死球</th>
                      <th style={thStyle}>盗塁</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((game) => (
                      <tr key={game.id}>
                        <td style={{...tdStyle, textAlign: 'left', minWidth: '80px'}}>{game.gameDate}</td>
                        <td style={{...tdStyle, textAlign: 'left', minWidth: '120px'}}>{game.gameName || '-'}</td>
                        <td style={{...tdStyle, textAlign: 'left', minWidth: '120px'}}>{game.opponentTeam}</td>
                        <td style={tdStyle}>{game.batting.plateAppearances}</td>
                        <td style={tdStyle}>{game.batting.atBats}</td>
                        <td style={tdStyle}>{game.batting.hits}</td>
                        <td style={tdStyle}>{game.batting.runsBattedIn}</td>
                        <td style={tdStyle}>{game.batting.homeruns}</td>
                        <td style={tdStyle}>{game.batting.strikeouts}</td>
                        <td style={tdStyle}>{game.batting.walks + game.batting.deadballs}</td>
                        <td style={tdStyle}>{game.batting.stolenBases}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerStatsModal;
