import React, { useState, useEffect, useMemo } from 'react';
import { PlayerGameStats } from '../../types/PlayerGameStats';
import {
  getPlayerBattingStatsDetail,
  getPlayerPitchingStatsDetail,
  getPlayerStatsByPlayerId,
  type BattingStatsRow,
  type GameHistoryRow,
  type PitchingStatsRow,
  type GameHistoryPitcherRow,
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
type StatsCategory = 'batting' | 'pitching';
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

const FIELDING_HEADERS = [
  { key: 'putouts' as const, label: '刺殺' },
  { key: 'assists' as const, label: '補殺' },
  { key: 'errors' as const, label: '失策' },
];

const PITCHING_HEADERS: { key: keyof PitchingStatsRow; label: string }[] = [
  { key: 'era', label: '防御率' },
  { key: 'wins', label: '勝利' },
  { key: 'losses', label: '敗戦' },
  { key: 'inningsPitched', label: '投球回' },
  { key: 'battersFaced', label: '打者' },
  { key: 'hits', label: '被安打' },
  { key: 'homeRuns', label: '被本塁打' },
  { key: 'strikeouts', label: '奪三振' },
  { key: 'walks', label: '与四球' },
  { key: 'hitByPitch', label: '与死球' },
  { key: 'runs', label: '失点' },
  { key: 'earnedRuns', label: '自責点' },
  { key: 'whip', label: 'WHIP' },
  { key: 'winPercentage', label: '勝率' },
];

function sumFieldingFromHistory(rows: GameHistoryRow[]): { putouts: number; assists: number; errors: number } {
  return rows.reduce(
    (acc, r) => ({
      putouts: acc.putouts + (r.putouts ?? 0),
      assists: acc.assists + (r.assists ?? 0),
      errors: acc.errors + (r.errors ?? 0),
    }),
    { putouts: 0, assists: 0, errors: 0 }
  );
}

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
  const [statsCategory, setStatsCategory] = useState<StatsCategory>('batting');
  const [activeTab, setActiveTab] = useState<TabType>('career');
  const [period, setPeriod] = useState<PeriodOption>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [battingDetail, setBattingDetail] = useState<{ career: BattingStatsRow; gameHistory: GameHistoryRow[] } | null>(null);
  const [pitchingDetail, setPitchingDetail] = useState<{ career: PitchingStatsRow; gameHistory: GameHistoryPitcherRow[] } | null>(null);
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
      setPitchingDetail(null);
      setAllGameStats([]);
      setErrorMessage(null);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    setActiveTab('career');
    Promise.all([
      getPlayerBattingStatsDetail(player.playerId, startDate, endDate),
      getPlayerPitchingStatsDetail(player.playerId, startDate, endDate),
      getPlayerStatsByPlayerId(player.playerId),
    ])
      .then(([batting, pitching, stats]) => {
        setBattingDetail(batting);
        setPitchingDetail(pitching);
        setAllGameStats(stats);
        setErrorMessage(null);
      })
      .catch((err) => {
        console.error('[PlayerStatsModal]', err);
        setBattingDetail(null);
        setPitchingDetail(null);
        setAllGameStats([]);
        const msg = err?.message || err?.code || String(err);
        setErrorMessage(`読み込みエラー: ${msg}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, player?.playerId, startDate, endDate]);

  const hasPitchingRecords = useMemo(() => {
    if (allGameStats.some((s) => s.pitching)) return true;
    if (pitchingDetail && (pitchingDetail.career.g > 0 || pitchingDetail.gameHistory.length > 0)) return true;
    return false;
  }, [allGameStats, pitchingDetail]);

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
          <div style={tabStyle(statsCategory === 'batting')} onClick={() => setStatsCategory('batting')}>
            打撃
          </div>
          {hasPitchingRecords && (
            <div style={tabStyle(statsCategory === 'pitching')} onClick={() => setStatsCategory('pitching')}>
              投手
            </div>
          )}
        </div>
        <div style={{ ...tabContainerStyle, borderBottom: 'none' }}>
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
          ) : statsCategory === 'batting' ? (
            !battingDetail || (battingDetail.career.g === 0 && battingDetail.gameHistory.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                打撃成績データがありません。
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
                          <th key={label} style={thStyle}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>{renderBattingRow(battingDetail.career)}</tbody>
                  </table>
                </div>
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
                        <th style={thStyle}>打順</th>
                        <th style={thStyle}>守備</th>
                        {BATTING_HEADERS.map(({ label }) => (
                          <th key={label} style={thStyle}>{label}</th>
                        ))}
                        {FIELDING_HEADERS.map(({ label }) => (
                          <th key={label} style={thStyle}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {battingDetail?.gameHistory.map((row) => (
                        <tr key={row.gameId}>
                          <td style={{ ...tdStyle, textAlign: 'left', minWidth: '90px' }}>{row.gameDate}</td>
                          <td style={{ ...tdStyle, textAlign: 'left', minWidth: '120px' }}>{row.gameName || '-'}</td>
                          <td style={{ ...tdStyle, textAlign: 'left', minWidth: '120px' }}>{row.opponentTeam}</td>
                          <td style={tdStyle}>{row.battingOrder ?? '-'}</td>
                          <td style={tdStyle}>{row.positionLabel || '-'}</td>
                          {BATTING_HEADERS.map(({ key }) => (
                            <td key={key} style={tdStyle}>
                              {typeof row[key] === 'number' ? row[key] : row[key]}
                            </td>
                          ))}
                          {FIELDING_HEADERS.map(({ key }) => (
                            <td key={key} style={tdStyle}>{row[key] ?? '-'}</td>
                          ))}
                        </tr>
                      ))}
                      {battingDetail?.gameHistory && battingDetail.gameHistory.length > 0 && (
                        <tr style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                          <td colSpan={3} style={{ ...tdStyle, textAlign: 'left' }}>合計</td>
                          <td style={tdStyle}></td>
                          <td style={tdStyle}></td>
                          {BATTING_HEADERS.map(({ key }) => (
                            <td key={key} style={tdStyle}>
                              {typeof battingDetail.career[key] === 'number'
                                ? battingDetail.career[key]
                                : battingDetail.career[key]}
                            </td>
                          ))}
                          {FIELDING_HEADERS.map(({ key }) => (
                            <td key={key} style={tdStyle}>
                              {sumFieldingFromHistory(battingDetail.gameHistory)[key]}
                            </td>
                          ))}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            !pitchingDetail || (pitchingDetail.career.g === 0 && pitchingDetail.gameHistory.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                投手成績データがありません。
                <div style={{ fontSize: 12, marginTop: 8 }}>
                  dev_pitcherSeasonStats または dev_pitcherGameStats にデータがあるか確認してください。
                </div>
              </div>
            ) : activeTab === 'career' && pitchingDetail ? (
              <div>
                <h3>投手成績 (通算 {pitchingDetail.career.g}試合)</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        {PITCHING_HEADERS.map(({ label }) => (
                          <th key={label} style={thStyle}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {PITCHING_HEADERS.map(({ key }) => (
                          <td key={key} style={tdStyle}>
                            {typeof pitchingDetail.career[key] === 'number'
                              ? pitchingDetail.career[key]
                              : pitchingDetail.career[key]}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div>
                <h3>試合ごとの投手成績</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, textAlign: 'left' }}>日付</th>
                        <th style={{ ...thStyle, textAlign: 'left' }}>大会/試合名</th>
                        <th style={{ ...thStyle, textAlign: 'left' }}>対戦相手</th>
                        {PITCHING_HEADERS.map(({ label }) => (
                          <th key={label} style={thStyle}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pitchingDetail?.gameHistory.map((row) => (
                        <tr key={row.gameId}>
                          <td style={{ ...tdStyle, textAlign: 'left', minWidth: '90px' }}>{row.gameDate}</td>
                          <td style={{ ...tdStyle, textAlign: 'left', minWidth: '120px' }}>{row.gameName || '-'}</td>
                          <td style={{ ...tdStyle, textAlign: 'left', minWidth: '120px' }}>{row.opponentTeam}</td>
                          {PITCHING_HEADERS.map(({ key }) => (
                            <td key={key} style={tdStyle}>
                              {typeof row[key] === 'number' ? row[key] : row[key]}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {pitchingDetail?.gameHistory && pitchingDetail.gameHistory.length > 0 && (
                        <tr style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                          <td colSpan={3} style={{ ...tdStyle, textAlign: 'left' }}>合計</td>
                          {PITCHING_HEADERS.map(({ key }) => (
                            <td key={key} style={tdStyle}>
                              {typeof pitchingDetail.career[key] === 'number'
                                ? pitchingDetail.career[key]
                                : pitchingDetail.career[key]}
                            </td>
                          ))}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerStatsModal;
