import React, { useEffect, useMemo, useState } from 'react';
import {
  SpecialEntryResolution,
  SpecialLineupEntry,
} from '../../../hooks/useLineupManager';

interface SpecialSubstitutionModalProps {
  open: boolean;
  entries: SpecialLineupEntry[];
  onSubmit: (resolutions: SpecialEntryResolution[]) => Promise<void> | void;
  onCancel: () => void;
}

const roleLabelMap: Record<SpecialLineupEntry['role'], string> = {
  PH: '代打 (PH)',
  PR: '代走 (PR)',
  TR: 'テンポラリー (TR)',
};

const SpecialSubstitutionModal: React.FC<SpecialSubstitutionModalProps> = ({
  open,
  entries,
  onSubmit,
  onCancel,
}) => {
  const [selectionMap, setSelectionMap] = useState<Record<string, { playerId?: string; position?: string }>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const initial: Record<string, { playerId?: string; position?: string }> = {};
    entries.forEach(entry => {
      initial[entry.id] = {
        playerId:
          entry.role === 'TR'
            ? entry.previousPlayerId || entry.currentPlayerId
            : entry.previousPlayerId || entry.currentPlayerId,
        position: entry.previousPosition || entry.lineupPosition,
      };
    });
    setSelectionMap(initial);
  }, [entries]);

  const isSubmitDisabled = useMemo(() => {
    if (entries.length === 0) return true;
    return entries.some(entry => {
      const state = selectionMap[entry.id];
      if (!state) return true;
      if (entry.role === 'TR') {
        return false;
      }
      return !state.playerId || !state.position;
    });
  }, [entries, selectionMap]);

  const handlePlayerChange = (entryId: string, value: string) => {
    setSelectionMap(prev => ({ ...prev, [entryId]: { ...prev[entryId], playerId: value } }));
  };

  const handlePositionChange = (entryId: string, value: string) => {
    setSelectionMap(prev => ({ ...prev, [entryId]: { ...prev[entryId], position: value } }));
  };

  const handleSubmit = async () => {
    if (isSubmitDisabled || submitting) return;
    setSubmitting(true);
    try {
      const payload: SpecialEntryResolution[] = entries.map(entry => ({
        entryId: entry.id,
        selectedPlayerId: entry.role === 'TR' ? undefined : selectionMap[entry.id]?.playerId,
        selectedPosition: selectionMap[entry.id]?.position,
      }));
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || entries.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        zIndex: 2100,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '60px 16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          background: '#fff',
          borderRadius: 16,
          padding: '24px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700 }}>攻守交代時の出場選手確認</div>
          <button
            type="button"
            onClick={onCancel}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: 20,
              cursor: 'pointer',
              color: '#868e96',
            }}
            aria-label="close"
          >
            ×
          </button>
        </div>

        <p style={{ fontSize: 13, color: '#495057', marginBottom: 16 }}>
          PH/PR（代打・代走）は攻守交代後に残す選手を指定してください。TR（テンポラリーランナー）は自動で元の選手に戻ります。
        </p>

        <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={thStyle}>チーム</th>
                <th style={thStyle}>打順</th>
                <th style={thStyle}>区分</th>
                <th style={thStyle}>現在の選手</th>
                <th style={thStyle}>戻す/残す選手</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id}>
                  <td style={tdStyle}>{entry.teamName}</td>
                  <td style={tdStyle}>{entry.battingOrder === 10 ? 'FP' : `${entry.battingOrder}番`}</td>
                  <td style={tdStyle}>{roleLabelMap[entry.role]}</td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{entry.currentPlayerName || '未設定'}</div>
                    {entry.previousPlayerName && (
                      <div style={{ fontSize: 12, color: '#868e96' }}>
                        直前: {entry.previousPlayerName}
                      </div>
                    )}
                  </td>
                  <td style={{ ...tdStyle, minWidth: 240 }}>
                    {entry.role === 'TR' ? (
                      <div style={{ fontSize: 12, color: '#495057' }}>
                        {entry.previousPlayerName
                          ? `${entry.previousPlayerName} に戻します`
                          : '自動的に元の選手へ戻します'}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <select
                          value={selectionMap[entry.id]?.playerId || ''}
                          onChange={e => handlePlayerChange(entry.id, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: 6,
                            border: '1px solid #ced4da',
                          }}
                        >
                          <option value="" disabled>
                            選手を選択
                          </option>
                          {entry.candidatePlayers.map(option => (
                            <option key={option.playerId} value={option.playerId}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={selectionMap[entry.id]?.position || ''}
                          onChange={e => handlePositionChange(entry.id, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: 6,
                            border: '1px solid #ced4da',
                          }}
                        >
                          <option value="" disabled>
                            守備位置を選択
                          </option>
                          {entry.candidatePositions.map(position => (
                            <option key={position} value={position}>
                              {position}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          style={{
            marginTop: 20,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={secondaryButtonStyle}
            disabled={submitting}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              ...primaryButtonStyle,
              opacity: isSubmitDisabled || submitting ? 0.6 : 1,
              cursor: isSubmitDisabled || submitting ? 'not-allowed' : 'pointer',
            }}
            disabled={isSubmitDisabled || submitting}
          >
            {submitting ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
};

const thStyle: React.CSSProperties = {
  border: '1px solid #dee2e6',
  padding: '8px 10px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: 12,
  color: '#495057',
};

const tdStyle: React.CSSProperties = {
  border: '1px solid #f1f3f5',
  padding: '8px 10px',
  verticalAlign: 'top',
};

const primaryButtonStyle: React.CSSProperties = {
  border: 'none',
  backgroundColor: '#1c7ed6',
  color: '#fff',
  padding: '8px 18px',
  borderRadius: 999,
  fontWeight: 600,
};

const secondaryButtonStyle: React.CSSProperties = {
  border: '1px solid #ced4da',
  backgroundColor: '#fff',
  color: '#343a40',
  padding: '8px 18px',
  borderRadius: 999,
  fontWeight: 600,
};

export default SpecialSubstitutionModal;

