import React, { useMemo } from 'react';
import { PitchData } from '../../../types/PitchData';

const BASE_WIDTH = 260;
const BASE_HEIGHT = 325;

interface HeatmapChartProps {
  pitches: PitchData[];
}

// 5×5グリッドの各セルに来た投球の割合を計算
const calculateHeatmapData = (pitches: PitchData[]): number[][] => {
  const grid: number[][] = Array(5)
    .fill(0)
    .map(() => Array(5).fill(0));

  if (pitches.length === 0) return grid;

  // 各セルに来た投球数をカウント
  pitches.forEach((pitch) => {
    const col = Math.min(4, Math.max(0, Math.floor((pitch.x / BASE_WIDTH) * 5)));
    const row = Math.min(4, Math.max(0, Math.floor((pitch.y / BASE_HEIGHT) * 5)));
    grid[row][col]++;
  });

  // 割合に変換
  const total = pitches.length;
  return grid.map((row) => row.map((count) => count / total));
};

// 割合に応じた背景色を取得
const getBackgroundColor = (ratio: number): string | undefined => {
  if (ratio >= 0.35) return '#c92a2a'; // 濃い赤
  if (ratio >= 0.3) return '#e03131'; // 赤
  if (ratio >= 0.25) return '#ff6b6b'; // 薄い赤
  if (ratio >= 0.2) return '#ffa8a8'; // さらに薄い赤
  return undefined; // 背景色なし
};

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
  gridCell: (row: number, col: number, backgroundColor?: string) => {
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
      backgroundColor: backgroundColor || (inInner ? '#f1f3f5' : '#fff'),
      boxSizing: 'border-box' as const,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '11px',
      color: backgroundColor ? '#fff' : '#495057',
      fontWeight: 600,
    };
  },
};

const HeatmapChart: React.FC<HeatmapChartProps> = ({ pitches }) => {
  const heatmapData = useMemo(() => calculateHeatmapData(pitches), [pitches]);

  return (
    <div style={styles.gridWrapperOuter}>
      <div style={styles.gridWrapper}>
        <div style={styles.gridOverlay}>
          {[...Array(5)].map((_, row) =>
            [...Array(5)].map((_, col) => {
              const ratio = heatmapData[row][col];
              const backgroundColor = getBackgroundColor(ratio);
              const percentage = (ratio * 100).toFixed(1);

              return (
                <div
                  key={`${row}-${col}`}
                  style={styles.gridCell(row, col, backgroundColor)}
                >
                  {ratio > 0 && `${percentage}%`}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default HeatmapChart;

