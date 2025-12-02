/**
 * 投球チャート（5×5グリッド）
 * ランナー入力画面で使用
 * 1球入力画面のStrikeZoneGridデザインを流用し、3/5に縮小表示
 */
import React from 'react';
import StrikeZoneGrid from '../pitch/StrikeZoneGrid';

const styles = {
  container: {
    backgroundColor: '#fff',
    border: '1px solid #dee2e6',
    padding: '12px',
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  title: {
    fontWeight: 600 as const,
    fontSize: '13px',
    marginBottom: 8,
    color: '#495057',
  },
};

const SCALE = 0.78; 
// StrikeZoneGridの実寸（内側）: gridWrapper 248x310 + outer padding(16*2)
const BASE_WIDTH = 248 + 16 * 2;
const BASE_HEIGHT = 310 + 16 * 2;
const SCALED_WIDTH = BASE_WIDTH * SCALE;
const SCALED_HEIGHT = BASE_HEIGHT * SCALE;

const PitchChart: React.FC = () => {
  return (
    <div style={styles.container}>
      <div style={styles.title}>投球チャート</div>
      {/* 実効サイズの固定枠 */}
      <div style={{ width: SCALED_WIDTH, height: SCALED_HEIGHT, overflow: 'hidden' }}>
        {/* 縮小描画。クリック不可にするためpointerEvents: 'none' */}
        <div style={{ transform: `scale(${SCALE})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
          <StrikeZoneGrid pitches={[]} onClickZone={() => { /* no-op */ }} />
        </div>
      </div>
    </div>
  );
};

export default PitchChart;
