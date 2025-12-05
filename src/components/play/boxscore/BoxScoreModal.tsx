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

const renderRow = (row: BoxScoreRowData) => (
  <tr key={row.key} style={{ backgroundColor: row.isSubstitute ? '#fff5f5' : '#fff' }}>
    <td style={{ ...cellStyle, width: 40, textAlign: 'center', fontWeight: 600 }}>
      {row.isSubstitute ? '' : row.battingOrder}
    </td>
    <td style={{ ...cellStyle, width: 64, textAlign: 'center', fontWeight: 600 }}>
      {row.positionLabel || '-'}
    </td>
    <td style={{ ...cellStyle, minWidth: 140 }}>
      <span>{row.name || '未設定'}</span>
    </td>
    {INNING_HEADERS.map((inning) => (
      <td key={inning} style={{ ...cellStyle, textAlign: 'center', minWidth: 48 }}>
        {row.resultsByInning[inning] || ''}
      </td>
    ))}
  </tr>
);

const renderTeamBlock = (team: BoxScoreTeamData) => (
  <div key={team.side} style={{ marginBottom: 28 }}>
    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{team.teamName}</div>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 520 }}>
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, width: 40 }}>打順</th>
            <th style={{ ...headerCellStyle, width: 64 }}>守備</th>
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
        代打・代走は元の打順の直後に表示されます。
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


