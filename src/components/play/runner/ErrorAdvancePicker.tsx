import React, { useState } from 'react';
import { POSITIONS } from '../../../data/softball/positions';
import {
  advanceErrorLabel,
  createAdvanceErrorId,
  type AdvanceErrorOption,
  type ErrorType,
} from '../../../utils/advanceErrors';

const FIELD_POSITIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((code) => POSITIONS[code]);

interface ErrorAdvancePickerProps {
  catalog: AdvanceErrorOption[];
  selectedId?: string;
  onSelect: (errorId: string) => void;
  onAdd: (error: AdvanceErrorOption) => void;
  positionPlayerNames?: Record<string, string>;
}

const chip = (selected: boolean): React.CSSProperties => ({
  padding: '8px 14px',
  background: selected ? '#4c6ef5' : '#fff',
  color: selected ? '#fff' : '#495057',
  border: `2px solid ${selected ? '#4c6ef5' : '#dee2e6'}`,
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: selected ? 600 : 400,
});

/**
 * 進塁理由がエラーのとき、既存失策を選ぶか新しい失策を追加する。
 */
const ErrorAdvancePicker: React.FC<ErrorAdvancePickerProps> = ({
  catalog,
  selectedId,
  onSelect,
  onAdd,
  positionPlayerNames = {},
}) => {
  const [adding, setAdding] = useState(false);
  const [positionAbbr, setPositionAbbr] = useState('');
  const [errorType, setErrorType] = useState<ErrorType | ''>('');

  const commitAdd = () => {
    if (!positionAbbr || !errorType) return;
    const created: AdvanceErrorOption = {
      id: createAdvanceErrorId(),
      positionAbbr,
      errorType,
      origin: 'new',
      countsAsNew: true,
    };
    onAdd(created);
    onSelect(created.id);
    setAdding(false);
    setPositionAbbr('');
    setErrorType('');
  };

  return (
    <div style={{ marginTop: 8, padding: 12, background: '#e9ecef', borderRadius: 8, border: '1px solid #dee2e6' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#495057' }}>どのエラーで進塁したか *</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {catalog.map((err) => (
          <button key={err.id} type="button" onClick={() => onSelect(err.id)} style={chip(selectedId === err.id)}>
            {advanceErrorLabel(err)}
          </button>
        ))}
        <button type="button" onClick={() => setAdding((v) => !v)} style={chip(adding)}>
          別のエラーを追加
        </button>
      </div>
      {catalog.length === 0 && !adding && (
        <div style={{ fontSize: 12, color: '#868e96', marginBottom: 8 }}>失策がまだないので、追加してください。</div>
      )}
      {adding && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#495057' }}>エラーした守備位置 *</div>
          <select
            value={positionAbbr}
            onChange={(e) => setPositionAbbr(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #ced4da',
              fontSize: 13,
              width: '100%',
              maxWidth: 280,
              marginBottom: 10,
            }}
          >
            <option value="">選択してください</option>
            {FIELD_POSITIONS.map((pos) => {
              const name = positionPlayerNames[pos.abbr];
              return (
                <option key={pos.abbr} value={pos.abbr}>
                  {name ? `${pos.name}（${name}）` : pos.name}
                </option>
              );
            })}
          </select>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#495057' }}>どういうエラーか *</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button type="button" onClick={() => setErrorType('throw')} style={chip(errorType === 'throw')}>
              送球
            </button>
            <button type="button" onClick={() => setErrorType('catch')} style={chip(errorType === 'catch')}>
              捕球
            </button>
          </div>
          <button
            type="button"
            onClick={commitAdd}
            disabled={!positionAbbr || !errorType}
            style={{
              padding: '8px 16px',
              background: positionAbbr && errorType ? '#4c6ef5' : '#adb5bd',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: positionAbbr && errorType ? 'pointer' : 'not-allowed',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            このエラーを追加
          </button>
        </div>
      )}
    </div>
  );
};

export default ErrorAdvancePicker;
