import React, { useState, useEffect, useMemo } from 'react';
import { PlayerGameStats, PlayerPitchingStats } from '../../types/PlayerGameStats';
import {
  getPlayerBattingStatsDetail,
  getPlayerStatsByPlayerId,
  type BattingStatsRow,
  type GameHistoryRow,
} from '../../services/playerGameStatsService';
import LoadingIndicator from '../common/LoadingIndicator';

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
type PeriodOption = 'all' | '1month' | '3months' | 'custom';

const BATTING_HEADERS: { key: keyof BattingStatsRow; label: string }[] = [
  { key: 'g', label: 'G' },
  { key: 'ab', label: 'AB' },
  { key: 'r', label: 'R' },
  { key: 'h', label: 'H' },
  { key: '2b', label: '2B' },
  { key: '3b', label: '3B' },
  { key: 'hr', label: 'HR' },
  { key: 'rbi', label: 'RBI' },
  { key: 'bb', label: 'BB' },
  { key: 'so', label: 'SO' },
  { key: 'sb', label: 'SB' },
  { key: 'cs', label: 'CS' },
  { key: 'avg', label: 'AVG' },
  { key: 'obp', label: 'OBP' },
  { key: 'slg', label: 'SLG' },
  { key: 'ops', label: 'OPS' },
];

function getPeriodDates(period: PeriodOption, customStart?: string, customEnd?: string): { startDate?: string; endDate?: string } {
  const today = new Date();
  const toYYYYMMDD = (d: Date) => d.toISOString().slice(0, 10);

  switch (period) {
    case 'all':
      return {};
    case '1month': {
      const start = new Date(today);
      start.setMonth(start.getMonth() - 1);
      return { startDate: toYYYYMMDD(start), endDate: toYYYYMMDD(today) };
    }
    case '3months': {
      const start = new Date(today);
      start.setMonth(start.getMonth() - 3);
      return { startDate: toYYYYMMDD(start), endDate: toYYYYMMDD(today) };
    }
    case 'custom':
      return { startDate: customStart, endDate: customEnd };
    default:
      return {};
  }
}

const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({ isOpen, onClose, player }) => {
  const [activeTab, setActiveTab] = useState<TabType>('career');
  const [period, setPeriod] = useState<PeriodOption>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [battingDetail, setBattingDetail] = useState<{ career: BattingStatsRow; gameHistory: GameHistoryRow[] } | null>(null);
  const [allGameStats, setAllGameStats] = useState<PlayerGameStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { startDate, endDate } = useMemo(
    () => getPeriodDates(period, customStart || undefined, customEnd || undefined),
    [period, customStart, customEnd]
  );

  useEffect(() => {
    if (!isOpen || !player) {
      setBattingDetail(null);
      setAllGameStats([]);
      setErrorMessage(null);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    setActiveTab('career');
    Promise.all([
      getPlayerBattingStatsDetail(player.playerId, startDate, endDate),
      getPlayerStatsByPlayerId(player.playerId),
    ])
      .then(([batting, stats]) => {
        setBattingDetail(batting);
        setAllGameStats(stats);
        setErrorMessage(null);
      })
      .catch((err) => {
        console.error('[PlayerStatsModal]', err);
        setBattingDetail(null);
        setAllGameStats([]);
        const msg = err?.message || err?.code || String(err);
        setErrorMessage(`読み込みエラー: ${msg}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, player?.playerId, startDate, endDate]);

  const filteredPitchingStats = useMemo(() => {
    if (allGameStats.length === 0) return [];
    if (!startDate && !endDate) return allGameStats.filter((s) => s.pitching);
    return allGameStats.filter((s) => {
      if (!s.pitching) return false;
      if (startDate && s.gameDate < startDate) return false;
      if (endDate && s.gameDate > endDate) return false;
      return true;
    });
  }, [allGameStats, startDate, endDate]);

  const careerPitching = useMemo((): { pitching: PlayerPitchingStats; wins: number; losses: number; era: string } | null => {
    if (filteredPitchingStats.length === 0) return null;
    const pitching: PlayerPitchingStats = {
      outsPitched: 0,
      batterFaced: 0,
      hitsAllowed: 0,
      runsAllowed: 0,
      earnedRuns: 0,
      strikeouts: 0,
      walks: 0,
      deadballs: 0,
      homersHit: 0,
      win: false,
      loss: false,
    };
    let wins = 0;
    let losses = 0;
    filteredPitchingStats.forEach((s) => {
      const p = s.pitching!;
      pitching.outsPitched += p.outsPitched;
      pitching.batterFaced += p.batterFaced;
      pitching.hitsAllowed += p.hitsAllowed;
      pitching.runsAllowed += p.runsAllowed;
      pitching.earnedRuns += p.earnedRuns;
      pitching.strikeouts += p.strikeouts;
      pitching.walks += p.walks;
      pitching.deadballs += p.deadballs;
      pitching.homersHit += p.homersHit;
      if (p.win) wins++;
      if (p.loss) losses++;
    });
    const era =
      pitching.outsPitched > 0
        ? ((pitching.earnedRuns * 7) / (pitching.outsPitched / 3)).toFixed(2)
        : '---';
    return { pitching, wins, losses, era };
  }, [filteredPitchingStats]);

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
    maxWidth: '900px',
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

  const periodSelectStyle: React.CSSProperties = {
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  };

  const renderBattingRow = (row: BattingStatsRow) => (
    <tr key="batting">
      {BATTING_HEADERS.map(({ key }) => (
        <td key={key} style={tdStyle}>
          {typeof row[key] === 'number' ? row[key] : row[key]}
        </td>
      ))}
    </tr>
  );

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0 }}>
            {player.familyName} {player.givenName}{' '}
            <span style={{ fontSize: '0.8em', color: '#666' }}>成績詳細</span>
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#999',
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
          <div style={periodSelectStyle}>
            <span style={{ fontWeight: 600 }}>表示期間:</span>
            {(['all', '1month', '3months', 'custom'] as const).map((p) => (
              <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="period"
                  checked={period === p}
                  onChange={() => setPeriod(p)}
                />
                {p === 'all' && '全期間'}
                {p === '1month' && '直近1ヶ月'}
                {p === '3months' && '直近3ヶ月'}
                {p === 'custom' && 'カスタム'}
              </label>
            ))}
            {period === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  placeholder="開始日"
                />
                <span>〜</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  placeholder="終了日"
                />
              </>
            )}
          </div>

          {loading ? (
            <LoadingIndicator />
          ) : errorMessage ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#c0392b' }}>
              <div>{errorMessage}</div>
              <div style={{ fontSize: 12, marginTop: 8, color: '#666' }}>
                Functions のデプロイまたはエミュレータの起動を確認してください。
              </div>
            </div>
          ) : !battingDetail || (battingDetail.career.g === 0 && battingDetail.gameHistory.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              成績データがありません。
              <div style={{ fontSize: 12, marginTop: 8 }}>
                dev_playerSeasonStats または dev_playerGameStats にデータがあるか確認してください。
              </div>
            </div>
          ) : activeTab === 'career' && battingDetail ? (
            <div>
              <h3>打撃成績 (通算 {battingDetail.career.g}試合)</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      {BATTING_HEADERS.map(({ label }) => (
                        <th key={label} style={thStyle}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>{renderBattingRow(battingDetail.career)}</tbody>
                </table>
              </div>

              {careerPitching && (
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
                          <td style={tdStyle}>{careerPitching.era}</td>
                          <td style={tdStyle}>{careerPitching.wins}</td>
                          <td style={tdStyle}>{careerPitching.losses}</td>
                          <td style={tdStyle}>
                            {Math.floor(careerPitching.pitching.outsPitched / 3)}
                            {careerPitching.pitching.outsPitched % 3 !== 0
                              ? ` ${careerPitching.pitching.outsPitched % 3}/3`
                              : ''}
                          </td>
                          <td style={tdStyle}>{careerPitching.pitching.hitsAllowed}</td>
                          <td style={tdStyle}>{careerPitching.pitching.homersHit}</td>
                          <td style={tdStyle}>{careerPitching.pitching.strikeouts}</td>
                          <td style={tdStyle}>{careerPitching.pitching.walks}</td>
                          <td style={tdStyle}>{careerPitching.pitching.deadballs}</td>
                          <td style={tdStyle}>{careerPitching.pitching.runsAllowed}</td>
                          <td style={tdStyle}>{careerPitching.pitching.earnedRuns}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h3>試合ごとの打撃成績</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, textAlign: 'left' }}>日付</th>
                      <th style={{ ...thStyle, textAlign: 'left' }}>大会/試合名</th>
                      <th style={{ ...thStyle, textAlign: 'left' }}>対戦相手</th>
                      {BATTING_HEADERS.map(({ label }) => (
                        <th key={label} style={thStyle}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {battingDetail?.gameHistory.map((row) => (
                      <tr key={row.gameId}>
                        <td style={{ ...tdStyle, textAlign: 'left', minWidth: '90px' }}>{row.gameDate}</td>
                        <td style={{ ...tdStyle, textAlign: 'left', minWidth: '120px' }}>{row.gameName || '-'}</td>
                        <td style={{ ...tdStyle, textAlign: 'left', minWidth: '120px' }}>{row.opponentTeam}</td>
                        {BATTING_HEADERS.map(({ key }) => (
                          <td key={key} style={tdStyle}>
                            {typeof row[key] === 'number' ? row[key] : row[key]}
                          </td>
                        ))}
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
