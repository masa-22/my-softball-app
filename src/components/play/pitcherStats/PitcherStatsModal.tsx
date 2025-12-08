import React from 'react';
import {
  PitcherStatsData,
  PitcherStatsRowData,
  PitcherStatsTeamData,
  PitcherStats,
} from '../../../hooks/usePitcherStatsData';

type PitcherStatsModalProps = {
  open: boolean;
  loading: boolean;
  data: PitcherStatsData | null;
  onClose: () => void;
};

const STATS_HEADERS = [
  { key: 'winLoss', label: '勝敗' },
  { key: 'name', label: '名前' },
  { key: 'inningsPitched', label: '投球回数' },
  { key: 'battersFaced', label: '打者' },
  { key: 'pitches', label: '球数' },
  { key: 'hits', label: '安打' },
  { key: 'homeRuns', label: '本塁打' },
  { key: 'sacrificeBunts', label: '犠打' },
  { key: 'sacrificeFlies', label: '犠飛' },
  { key: 'strikeouts', label: '三振' },
  { key: 'walks', label: '四球' },
  { key: 'hitByPitch', label: '死球' },
  { key: 'runs', label: '失点' },
  { key: 'earnedRuns', label: '自責点' },
  { key: 'wildPitches', label: '暴投' },
] as const;

const cellStyle: React.CSSProperties = {
  border: '1px solid #dee2e6',
  padding: '6px 8px',
  fontSize: 13,
  verticalAlign: 'middle',
};

const headerCellStyle: React.CSSProperties = {
  ...cellStyle,
  fontWeight: 600,
  backgroundColor: '#f8f9fa',
  textAlign: 'center',
};

const getStatValue = (row: PitcherStatsRowData, statKey: string): string | number => {
  if (statKey === 'name') {
    return row.name || '';
  }
  if (statKey === 'winLoss') {
    return row.stats.winLoss;
  }
  if (statKey === 'inningsPitched') {
    return row.stats.inningsPitched;
  }
  const value = row.stats[statKey as keyof PitcherStats];
  return typeof value === 'number' ? value : 0;
};

const renderRow = (row: PitcherStatsRowData) => {
  return (
    <tr key={row.key}>
      {STATS_HEADERS.map((header) => (
        <td key={header.key} style={{ ...cellStyle, textAlign: header.key === 'name' ? 'left' : 'center', minWidth: header.key === 'name' ? 140 : 48 }}>
          {getStatValue(row, header.key) || ''}
        </td>
      ))}
    </tr>
  );
};

const renderTeamBlock = (team: PitcherStatsTeamData) => (
  <div key={team.side} style={{ marginBottom: 28 }}>
    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{team.teamName}</div>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 520 }}>
        <thead>
          <tr>
            {STATS_HEADERS.map((header) => (
              <th key={header.key} style={{ ...headerCellStyle, minWidth: header.key === 'name' ? 140 : 48 }}>
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {team.rows.map(renderRow)}
        </tbody>
      </table>
    </div>
  </div>
);

const PitcherStatsModal: React.FC<PitcherStatsModalProps> = ({ open, data, loading, onClose }) => {
  if (!open) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 2000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '60px 16px',
    boxSizing: 'border-box',
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: '24px 24px 16px',
    maxWidth: 960,
    width: '100%',
    maxHeight: '100%',
    overflowY: 'auto',
    boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
  };

  const handleOverlayClick = () => onClose();
  const handleModalClick: React.MouseEventHandler<HTMLDivElement> = (e) => e.stopPropagation();

  return (
    <div style={overlayStyle} onClick={handleOverlayClick}>
      <div style={modalStyle} onClick={handleModalClick}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>投手成績</div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: '#e9ecef',
              borderRadius: 20,
              padding: '6px 14px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            閉じる
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#495057' }}>読み込み中...</div>
        ) : data ? (
          <>
            {renderTeamBlock(data.home)}
            {renderTeamBlock(data.away)}
          </>
        ) : (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#868e96' }}>
            表示できるデータがありません。
          </div>
        )}
      </div>
    </div>
  );
};

export default PitcherStatsModal;

