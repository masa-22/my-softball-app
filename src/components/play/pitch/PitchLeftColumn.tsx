import React from 'react';
import MiniScoreBoard from '../common/MiniScoreBoard';
import MiniDiamondField from './MiniDiamondField';

interface PitchLeftColumnProps {
  bso: { b: number; s: number; o: number };
  runners: { '1': string | null; '2': string | null; '3': string | null };
}

const PitchLeftColumn: React.FC<PitchLeftColumnProps> = ({ bso, runners }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 220 }}>
      <MiniScoreBoard bso={bso} />
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #dee2e6',
        padding: '12px',
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        position: 'relative',
        minHeight: 180,
      }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#495057' }}>
          ランナー状況
        </div>
        <MiniDiamondField runners={runners} />
      </div>
    </div>
  );
};

export default PitchLeftColumn;
