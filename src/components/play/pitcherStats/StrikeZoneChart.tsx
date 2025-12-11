import React from 'react';
import { PitchSymbol } from '../common/PitchTypeSelector';
import { PitchData } from '../../../types/PitchData';

interface StrikeZoneChartProps {
  pitches: PitchData[];
  showIcon: boolean;
  showNumber: boolean;
}

const BASE_WIDTH = 260;
const BASE_HEIGHT = 325;

const styles = {
  gridWrapperOuter: {
    backgroundColor: '#fff',
    border: '1px solid #dee2e6',
    padding: '16px',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    width: '260px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'center',
  },
  gridWrapper: {
    position: 'relative' as const,
    width: '100%',
    aspectRatio: '260 / 325',
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
    
    const thickTop = row === 1 && col >= 1 && col <= 3;
    const thickBottom = row === 3 && col >= 1 && col <= 3;
    const thickLeft = col === 1 && row >= 1 && row <= 3;
    const thickRight = col === 3 && row >= 1 && row <= 3;

    let borderTop: string = '1px solid #adb5bd';
    let borderBottom: string = '1px solid #adb5bd';
    let borderLeft: string = '1px solid #adb5bd';
    let borderRight: string = '1px solid #adb5bd';

    if (thickTop) borderTop = '2px solid #212529';
    if (thickBottom) borderBottom = '2px solid #212529';
    if (thickLeft) borderLeft = '2px solid #212529';
    if (thickRight) borderRight = '2px solid #212529';

    return {
      borderTop,
      borderBottom,
      borderLeft,
      borderRight,
      backgroundColor: inInner ? '#f1f3f5' : '#fff',
      boxSizing: 'border-box' as const,
    };
  },
};

const StrikeZoneChart: React.FC<StrikeZoneChartProps> = ({ pitches, showIcon, showNumber }) => {
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
        {showIcon &&
          pitches.map((p) => {
            const leftPct = (p.x / BASE_WIDTH) * 100;
            const topPct = (p.y / BASE_HEIGHT) * 100;

            return (
              <div
                key={p.id}
                style={{
                  position: 'absolute',
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '10%',
                  height: '8%',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PitchSymbol
                  type={p.type}
                  number={showNumber ? p.order : undefined}
                  size={18}
                  result={p.result}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default StrikeZoneChart;

