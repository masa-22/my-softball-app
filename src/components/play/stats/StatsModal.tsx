import React from 'react';
import {
  StatsData,
  StatsRowData,
  StatsTeamData,
  PlayerStats,
} from '../../../hooks/useStatsData';

type StatsModalProps = {
  open: boolean;
  loading: boolean;
  data: StatsData | null;
  onClose: () => void;
};

const STATS_HEADERS = [
  { key: 'plateAppearances', label: '打席' },
  { key: 'atBats', label: '打数' },
  { key: 'hits', label: '安打' },
  { key: 'runs', label: '得点' },
  { key: 'rbi', label: '打点' },
  { key: 'sacrifice', label: '犠打' },
  { key: 'fourBall', label: '四死球' },
  { key: 'strikeouts', label: '三振' },
  { key: 'stolenBases', label: '盗塁' },
  { key: 'homeRuns', label: '本塁打' },
  { key: 'triples', label: '三塁打' },
  { key: 'doubles', label: '二塁打' },
  { key: 'singles', label: '単打' },
  { key: 'assists', label: '捕殺' },
  { key: 'putouts', label: '刺殺' },
  { key: 'errors', label: '失策' },
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

const getStatValue = (row: StatsRowData, statKey: string): number => {
  // 四死球は四球と死球の合計として計算
  if (statKey === 'fourBall') {
    return row.stats.walks + row.stats.hitByPitch;
  }
  const value = row.stats[statKey as keyof PlayerStats];
  return typeof value === 'number' ? value : 0;
};

const renderRow = (row: StatsRowData) => {
  const orderDisplay = row.orderLabel ?? '';
  return (
    <tr key={row.key}>
      <td style={{ ...cellStyle, width: 40, textAlign: 'center', fontWeight: 600 }}>
        {orderDisplay}
      </td>
      <td
        style={{
          ...cellStyle,
          width: 40,
          minWidth: 40,
          textAlign: 'center',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        {row.positionLabel || '-'}
      </td>
      <td style={{ ...cellStyle, minWidth: 140 }}>
        <span>{row.name || '未設定'}</span>
      </td>
      {STATS_HEADERS.map((header) => (
        <td key={header.key} style={{ ...cellStyle, textAlign: 'center', minWidth: 48 }}>
          {getStatValue(row, header.key) || ''}
        </td>
      ))}
    </tr>
  );
};

const renderTeamBlock = (team: StatsTeamData) => (
  <div key={team.side} style={{ marginBottom: 28 }}>
    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{team.teamName}</div>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 520 }}>
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, width: 40, minWidth: 40, whiteSpace: 'nowrap' }}>打順</th>
            <th style={{ ...headerCellStyle, width: 40, minWidth: 40, whiteSpace: 'nowrap' }}>守備</th>
            <th style={{ ...headerCellStyle, minWidth: 140 }}>選手</th>
            {STATS_HEADERS.map((header) => (
              <th key={header.key} style={{ ...headerCellStyle, minWidth: 48 }}>
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {team.rows.map(renderRow)}
        </tbody>
      </table>
      <div style={{ marginTop: 6, fontSize: 11, color: '#868e96' }}>
        代打・代走は元の打順の直後に表示されます。
      </div>
    </div>
  </div>
);

const StatsModal: React.FC<StatsModalProps> = ({ open, data, loading, onClose }) => {
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
          <div style={{ fontSize: 20, fontWeight: 700 }}>打撃成績</div>
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

export default StatsModal;

