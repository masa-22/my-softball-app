import React from 'react';
import {
  BoxScoreData,
  BoxScoreRowData,
  BoxScoreTeamData,
  MAX_BOX_SCORE_INNINGS,
} from '../../../hooks/useBoxScoreData';

type BoxScoreModalProps = {
  open: boolean;
  loading: boolean;
  data: BoxScoreData | null;
  onClose: () => void;
};

const INNING_HEADERS = Array.from({ length: MAX_BOX_SCORE_INNINGS }, (_, i) => i + 1);

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

const getInningCellStyle = (row: BoxScoreRowData, inning: number): React.CSSProperties => {
  const baseStyle: React.CSSProperties = { ...cellStyle, textAlign: 'center', minWidth: 48 };
  const status = row.inningStyles[inning];
  if (status === 'rbi') {
    return { ...baseStyle, backgroundColor: '#d0ebff', color: '#0b7285', fontWeight: 600 };
  }
  if (status === 'hit') {
    return { ...baseStyle, backgroundColor: '#ffe3e3', color: '#c92a2a', fontWeight: 600 };
  }
  return baseStyle;
};

const renderRow = (row: BoxScoreRowData) => {
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
      {INNING_HEADERS.map((inning) => (
        <td key={inning} style={getInningCellStyle(row, inning)}>
          {row.resultsByInning[inning] || ''}
        </td>
      ))}
    </tr>
  );
};

const renderTeamBlock = (team: BoxScoreTeamData) => (
  <div key={team.side} style={{ marginBottom: 28 }}>
    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{team.teamName}</div>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 560 }}>
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, width: 40 }}>打順</th>
            <th style={{ ...headerCellStyle, width: 40, minWidth: 40, whiteSpace: 'nowrap' }}>守備</th>
            <th style={{ ...headerCellStyle, minWidth: 140 }}>選手</th>
            {INNING_HEADERS.map((inning) => (
              <th key={inning} style={{ ...headerCellStyle, minWidth: 48 }}>
                {inning}回
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {team.rows.map(renderRow)}
        </tbody>
      </table>
      <div style={{ marginTop: 6, fontSize: 11, color: '#868e96' }}>
        {team.runnerRecords.length > 0 && (
          <div style={{ marginTop: 4 }}>
            {(() => {
              const steals = team.runnerRecords.filter(r => r.type === 'steal');
              const caughtStealings = team.runnerRecords.filter(r => r.type === 'caughtstealing');
              const runouts = team.runnerRecords.filter(r => r.type === 'runout');
              const items: string[] = [];
              
              if (steals.length > 0) {
                items.push(`盗塁:${steals.map(r => `${r.playerName}(${r.inning}回)`).join(',')}`);
              }
              if (caughtStealings.length > 0) {
                items.push(`盗塁死:${caughtStealings.map(r => `${r.playerName}(${r.inning}回)`).join(',')}`);
              }
              if (runouts.length > 0) {
                items.push(`走塁死:${runouts.map(r => `${r.playerName}(${r.inning}回)`).join(',')}`);
              }
              
              return items.join(' / ');
            })()}
          </div>
        )}
        {team.leftOnBase > 0 && (
          <div style={{ marginTop: team.runnerRecords.length > 0 ? 4 : 0 }}>
            残塁:{team.leftOnBase}
          </div>
        )}
      </div>
    </div>
  </div>
);

const BoxScoreModal: React.FC<BoxScoreModalProps> = ({ open, data, loading, onClose }) => {
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
          <div style={{ fontSize: 20, fontWeight: 700 }}>ボックススコア</div>
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

export default BoxScoreModal;


