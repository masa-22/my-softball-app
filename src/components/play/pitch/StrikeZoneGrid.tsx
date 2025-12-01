/**
 * ストライクゾーングリッド（5×5）
 * 投球位置を記録するコンポーネント
 */
import React from 'react';
import { PitchSymbol, PitchType } from '../common/PitchTypeSelector';

interface PitchData {
  id: number;
  x: number;
  y: number;
  type: PitchType;
  order: number;
  result: 'swing' | 'looking' | 'ball' | 'inplay';
}

interface StrikeZoneGridProps {
  pitches: PitchData[];
  onClickZone: (x: number, y: number) => void;
  children?: React.ReactNode;
}

const styles = {
  gridWrapperOuter: {
    backgroundColor: '#fff',
    border: '1px solid #dee2e6',
    padding: '16px',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    width: '100%',
  },
  gridWrapper: {
    position: 'relative' as const,
    width: '100%',
    maxWidth: '248px',
    height: '310px',
    border: '1px solid #dee2e6',
    boxSizing: 'border-box' as const,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#fff',
    margin: '0 auto',
  },
  gridOverlay: {
    position: 'absolute' as const,
    inset: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gridTemplateRows: 'repeat(5, 1fr)',
    pointerEvents: 'none' as const,
  },
  gridCell: (row: number, col: number) => {
    const inInner = row >= 1 && row <= 3 && col >= 1 && col <= 3;
    
    const thickTop    = row === 1 && col >= 1 && col <= 3;
    const thickBottom = row === 3 && col >= 1 && col <= 3;
    const thickLeft   = col === 1 && row >= 1 && row <= 3;
    const thickRight  = col === 3 && row >= 1 && row <= 3;

    let borderTop: string    = '1px solid #adb5bd';
    let borderBottom: string = '1px solid #adb5bd';
    let borderLeft: string   = '1px solid #adb5bd';
    let borderRight: string  = '1px solid #adb5bd';

    if (thickTop)    borderTop    = '2px solid #212529';
    if (thickBottom) borderBottom = '2px solid #212529';
    if (thickLeft)   borderLeft   = '2px solid #212529';
    if (thickRight)  borderRight  = '2px solid #212529';

    return {
      borderTop,
      borderBottom,
      borderLeft,
      borderRight,
      backgroundColor: inInner ? '#f1f3f5' : '#fff',
      boxSizing: 'border-box' as const,
    };
  },
  clickLayer: {
    position: 'absolute' as const,
    inset: 0,
    cursor: 'crosshair',
  },
  pitchPoint: (x: number, y: number) => ({
    position: 'absolute' as const,
    left: x - 20,
    top: y - 20,
    width: 40,
    height: 40,
    pointerEvents: 'none' as const,
  }),
};

const StrikeZoneGrid: React.FC<StrikeZoneGridProps> = ({ pitches, onClickZone, children }) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    onClickZone(x, y);
  };

  return (
    <div style={styles.gridWrapperOuter}>
      <div style={styles.gridWrapper}>
        <div style={styles.gridOverlay}>
          {[...Array(5)].map((_, row) =>
            [...Array(5)].map((_, col) => (
              <div key={`${row}-${col}`} style={styles.gridCell(row, col)} />
            ))
          )}
        </div>
        <div style={styles.clickLayer} onClick={handleClick} />
        {pitches.map(p => (
          <div key={p.id} style={styles.pitchPoint(p.x, p.y)}>
            <PitchSymbol type={p.type} number={p.order} size={40} result={p.result} />
          </div>
        ))}
        {children}
      </div>
    </div>
  );
};

export default StrikeZoneGrid;