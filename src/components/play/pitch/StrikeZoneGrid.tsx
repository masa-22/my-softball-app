/**
 * ストライクゾーングリッド（5×5）
 * 投球位置を記録するコンポーネント
 */
import React from 'react';
import { PitchSymbol } from '../common/PitchTypeSelector';
import { PitchType } from '../../../types/PitchType';

interface PitchData {
  id: number;
  x: number;
  y: number;
  type: PitchType;
  order: number;
  result: 'swing' | 'looking' | 'ball' | 'inplay' | 'deadball' | 'foul';
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
    width: '260px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'center',
  },
  gridWrapper: {
    position: 'relative' as const,
    width: '100%',
    aspectRatio: '260 / 325', // ランナーパネルと同等の比率
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
    // 廃止: 直接JSX内でスタイル定義
  }),
};

// 座標計算用定数（StrikeZoneGridのサイズに合わせる）
// 248 x 310 は固定値ではなく、このアスペクト比で表示されると想定
const BASE_WIDTH = 260;
const BASE_HEIGHT = 325;

const StrikeZoneGrid: React.FC<StrikeZoneGridProps> = ({ pitches, onClickZone, children }) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    // クリック位置を正規化された座標 (0-248, 0-310) に変換
    const scaleX = BASE_WIDTH / rect.width;
    const scaleY = BASE_HEIGHT / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    onClickZone(x, y);
  };

  // childrenにもスケーリングが必要な場合があるが、ここではPitchResultSelector等のダイアログ表示用
  // children (PitchResultSelector) は position: absolute で表示されるが、
  // 親要素 (gridWrapper) が相対配置なので、children内の配置ロジックによっては修正が必要かもしれない。
  // 今回は単純なoverlayとして表示されていると仮定。

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
        {pitches.map(p => {
          // 座標を％変換して配置
          const leftPct = (p.x / BASE_WIDTH) * 100;
          const topPct = (p.y / BASE_HEIGHT) * 100;
          
          return (
            <div key={p.id} style={{
              position: 'absolute',
              left: `${leftPct}%`,
              top: `${topPct}%`,
              transform: 'translate(-50%, -50%)', // 中心基準
              width: '15%', // 相対サイズ
              height: '12%', // 相対サイズ (aspect ratio考慮)
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <PitchSymbol type={p.type} number={p.order} size={30} result={p.result} /> 
            </div>
          );
        })}
        {children}
      </div>
    </div>
  );
};

export default StrikeZoneGrid;