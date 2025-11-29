import React, { useState, useMemo } from 'react';
import { getMatches } from '../../services/matchService';
import { getTeams } from '../../services/teamService';
import { useParams } from 'react-router-dom';
import { getPlays } from '../../services/playService';

// --- 型定義 ---
type PitchType = 'rise' | 'drop' | 'cut' | 'changeup' | 'chenrai' | 'slider' | 'unknown';

interface PitchData {
  id: number;
  x: number; // グリッド内の相対座標(px)
  y: number; // グリッド内の相対座標(px)
  type: PitchType;
  order: number;
  result: 'swing' | 'looking' | 'ball' | 'inplay';
}

// スタイル変更（タイトル削除・任意座標プロット対応）
const styles = {
  container: {
    fontFamily: '"Hiragino Kaku Gothic ProN", "Meiryo", sans-serif',
    padding: '0', // タイトル削除に伴い余白調整
    maxWidth: '980px', // 左を狭め、右を広げるため全体最大幅のみ調整
    margin: '0 auto',
  },
  mainLayout: {
    // 全体の枠線・余白を削除してグリッドを広く
    display: 'flex',
    gap: '16px',
    border: 'none',      // ← 枠削除
    padding: '0',        // ← 余白削除
    alignItems: 'flex-start',
  },
  leftColumn: {
    // 左パネルの幅をさらに狭く
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    width: '180px',      // ← 220px → 180px
  },
  rightColumn: {
    // 右側（グリッド）を最大化
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
  },
  scoreBoard: {
    // 落ち着いたグレー系の背景色
    backgroundColor: '#e8e8e8', // ← 変更: 落ち着いたライトグレー
    border: 'none',
    padding: '8px',
    borderRadius: 6,
    position: 'relative' as const,
  },
  scoreRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  bsoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '2px',
  },
  bsoLabel: {
    fontWeight: 'bold',
    width: '15px',
  },
  dot: (color: string, active: boolean) => ({
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: active ? color : '#999',
    display: 'inline-block',
    marginRight: '2px',
  }),
  // 縦長・さらに大型化（幅300→320, 高さ375→400相当）
  gridWrapper: {
    position: 'relative' as const,
    width: '320px',   // 列 64px × 5
    height: '400px',  // 行 80px × 5
    border: 'none',   // 全体枠をなくす
    boxSizing: 'content-box' as const,
  },
  gridOverlay: {
    position: 'absolute' as const,
    inset: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 64px)', // 64 * 5 = 320
    gridTemplateRows: 'repeat(5, 80px)',    // 80 * 5 = 400
    pointerEvents: 'none' as const,
  },
  // 格子状＋中央3×3外枠の太線を強化
  gridCell: (row: number, col: number) => {
    const inInner = row >= 1 && row <= 3 && col >= 1 && col <= 3;
    
    const thickTop    = row === 1 && col >= 1 && col <= 3;
    const thickBottom = row === 3 && col >= 1 && col <= 3;
    const thickLeft   = col === 1 && row >= 1 && row <= 3;
    const thickRight  = col === 3 && row >= 1 && row <= 3;

    let borderTop: string    = '1px solid #333';
    let borderBottom: string = '1px solid #333';
    let borderLeft: string   = '1px solid #333';
    let borderRight: string  = '1px solid #333';

    // 中央3×3の太枠を細く（4px → 2px）
    if (thickTop)    borderTop    = '2px solid black';
    if (thickBottom) borderBottom = '2px solid black';
    if (thickLeft)   borderLeft   = '2px solid black';
    if (thickRight)  borderRight  = '2px solid black';

    return {
      width: '64px',
      height: '80px',
      borderTop,
      borderBottom,
      borderLeft,
      borderRight,
      backgroundColor: inInner ? '#eaeaea' : '#fff',
      boxSizing: 'border-box' as const, // 太枠がセル内に収まるように調整
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
  legendPanel: {
    // 落ち着いた青系の背景色
    backgroundColor: '#d6e4f0', // ← 変更: 落ち着いた薄い青
    border: 'none',
    padding: '8px',
    borderRadius: 6,
  },
  legendTitle: {
    fontWeight: 'bold',
    fontSize: '16px',
    marginBottom: '6px',
  },
  legendItem: (selected: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px',
    cursor: 'pointer',
    backgroundColor: selected ? 'rgba(0,0,0,0.06)' : 'transparent',
    borderRadius: '4px',
  }),
};

// --- SVGアイコンコンポーネント ---
const PitchSymbol: React.FC<{ type: PitchType; number?: number; size?: number; result?: 'swing' | 'looking' | 'ball' | 'inplay' }> = ({ type, number, size = 30, result }) => {
  const textStyle = { fontSize: '12px', fontWeight: 'bold', textAnchor: 'middle' as const, dominantBaseline: 'central' as const };
  
  const cx = size / 2;
  const cy = size / 2;

  // 結果に応じた塗りつぶし色（ストライク系=黄色、ボール=青、インプレイ=緑）
  let fillColor = 'none';
  let textColor = 'black';
  if (result === 'swing' || result === 'looking') {
    fillColor = '#facc15'; // ストライク系: 黄色塗りつぶし
    textColor = 'black';   // 黄色背景なので文字は黒
  } else if (result === 'ball') {
    fillColor = '#3498db'; // ボール: 青塗りつぶし
    textColor = 'white';
  } else if (result === 'inplay') {
    fillColor = '#27ae60'; // インプレイ: 緑塗りつぶし
    textColor = 'white';
  }

  let shape;
  switch (type) {
    case 'rise': // △（白抜き）
      shape = <polygon points={`${cx},2 ${size-2},${size-2} 2,${size-2}`} fill={fillColor} stroke="black" strokeWidth="1.5" />;
      break;
    case 'drop': // ▽（白抜き）
      shape = <polygon points={`2,2 ${size-2},2 ${cx},${size-2}`} fill={fillColor} stroke="black" strokeWidth="1.5" />;
      break;
    case 'cut': // ◁（白抜き）
      shape = <polygon points={`${size-2},2 ${size-2},${size-2} 2,${cx}`} fill={fillColor} stroke="black" strokeWidth="1.5" />;
      break;
    case 'changeup': // □（正方形・白抜き）
      shape = <rect x="4" y="4" width={size-8} height={size-8} fill={fillColor} stroke="black" strokeWidth="1.5" />;
      break;
    case 'chenrai': // ◇（ダイヤ・白抜き）
      shape = <polygon points={`${cx},2 ${size-2},${cy} ${cx},${size-2} 2,${cy}`} fill={fillColor} stroke="black" strokeWidth="1.5" />;
      break;
    case 'slider': // ◎（二重丸）
      const outerRadius = size / 2 - 2;
      const innerRadius = size / 2 - 6;
      shape = (
        <>
          <circle cx={cx} cy={cy} r={outerRadius} fill={fillColor} stroke="black" strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r={innerRadius} fill="none" stroke="black" strokeWidth="1.5" />
        </>
      );
      break;
    case 'unknown': // ×
      shape = (
        <>
          <line x1="5" y1="5" x2={size-5} y2={size-5} stroke="black" strokeWidth="1.5" />
          <line x1={size-5} y1="5" x2="5" y2={size-5} stroke="black" strokeWidth="1.5" />
        </>
      );
      break;
    default:
      shape = <circle cx={cx} cy={cy} r={size / 2 - 2} fill={fillColor} stroke="black" strokeWidth="1.5" />;
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {shape}
      {number && (
        <text 
          x={cx} 
          y={cy + (type === 'drop' ? -2 : type === 'rise' ? 4 : 0)} 
          style={{ ...textStyle, fill: textColor }}
        >
          {number}
        </text>
      )}
    </svg>
  );
};


interface PitchCourseInputProps {
  onInplayCommit?: () => void; // インプレイ登録時のコールバック
}

const PitchCourseInput: React.FC<PitchCourseInputProps> = ({ onInplayCommit }) => {
  const { matchId } = useParams<{ matchId: string }>();
  const match = useMemo(() => (matchId ? getMatches().find(m => m.id === matchId) : null), [matchId]);

  // スコアボードのチーム名は略称（teamAbbr）
  const teamNames = useMemo(() => {
    if (!match) return { home: '先攻', away: '後攻' };
    const teams = getTeams();
    const home = teams.find(t => String(t.id) === String(match.homeTeamId));
    const away = teams.find(t => String(t.id) === String(match.awayTeamId));
    return { home: home?.teamAbbr || '先攻', away: away?.teamAbbr || '後攻' };
  }, [match]);

  // 現在イニング（playsから推定）
  const currentInningInfo = useMemo(() => {
    if (!matchId) return { inning: 1, halfLabel: '表' };
    const plays = getPlays(matchId);
    if (!plays.length) return { inning: 1, halfLabel: '表' };
    const last = plays[plays.length - 1];
    return { inning: last.inning, halfLabel: last.topOrBottom === 'top' ? '表' : '裏' };
  }, [matchId]);

  const [pitches, setPitches] = useState<PitchData[]>([]);
  const [selectedPitchType, setSelectedPitchType] = useState<PitchType>('rise');
  const [bso, setBso] = useState({ b: 0, s: 0, o: 0 });
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);
  const [pendingResult, setPendingResult] = useState<'swing' | 'looking' | 'ball' | 'inplay' | ''>('');

  // 任意座標クリック→結果選択パネル表示
  const handleClickLayer = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPendingPoint({ x, y });
    setPendingResult('');
  };

  // 結果確定→プロット＋カウント更新
  const commitPitch = () => {
    if (!pendingPoint || !pendingResult) return;
    const newPitch: PitchData = {
      id: Date.now(),
      x: pendingPoint.x,
      y: pendingPoint.y,
      type: selectedPitchType,
      order: pitches.length + 1,
      result: pendingResult,
    };
    const next = [...pitches, newPitch];
    setPitches(next);

    // カウント更新ロジック（簡易）
    setBso(prev => {
      let { b, s, o } = prev;
      if (pendingResult === 'ball') {
        b = Math.min(3, b + 1);
      } else if (pendingResult === 'swing' || pendingResult === 'looking') {
        s = Math.min(2, s + 1);
      } else if (pendingResult === 'inplay') {
        o = Math.min(2, o + 1);
      }
      return { b, s, o };
    });

    setPendingPoint(null);
    setPendingResult('');

    // インプレイの場合はコールバック実行
    if (pendingResult === 'inplay' && onInplayCommit) {
      onInplayCommit();
    }
  };

  // 球種名を日本語で取得
  const getPitchTypeName = (type: PitchType): string => {
    const item = pitchTypesList.find(p => p.type === type);
    return item ? item.label : '不明';
  };

  const pitchTypesList: { type: PitchType; label: string }[] = [
    { type: 'rise', label: 'ライズ' },
    { type: 'drop', label: 'ドロップ' },
    { type: 'cut', label: 'カット' },
    { type: 'changeup', label: 'チェンジアップ' },
    { type: 'chenrai', label: 'チェンライ' },
    { type: 'slider', label: 'スライダー' },
    { type: 'unknown', label: '不明' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.mainLayout}>
        {/* 左パネル（スコア・球種） */}
        <div style={styles.leftColumn}>
          {/* スコア・カウントボード（試合日時 -> 現在イニング（表／裏）に変更、略称表示） */}
          <div style={styles.scoreBoard}>
            <div style={{ marginBottom: '8px' }}>
              {`${currentInningInfo.inning}回${currentInningInfo.halfLabel}`}
            </div>
            <div style={{ display: 'flex' }}>
              <div style={{ paddingRight: '8px', marginRight: '8px' /* 枠線なし */ }}>
                <div style={styles.scoreRow}><span>{teamNames.home}</span> <span>0</span></div>
                <div style={styles.scoreRow}><span>{teamNames.away}</span> <span>0</span></div>
              </div>
              <div>
                <div style={styles.bsoContainer}>
                  <span style={styles.bsoLabel}>B</span>
                  {[...Array(3)].map((_, i) => <span key={i} style={styles.dot('#4ade80', i < bso.b)} />)}
                </div>
                <div style={styles.bsoContainer}>
                  <span style={styles.bsoLabel}>S</span>
                  {[...Array(2)].map((_, i) => <span key={i} style={styles.dot('#facc15', i < bso.s)} />)}
                </div>
                <div style={styles.bsoContainer}>
                  <span style={styles.bsoLabel}>O</span>
                  {[...Array(2)].map((_, i) => <span key={i} style={styles.dot('#ef4444', i < bso.o)} />)}
                </div>
              </div>
            </div>
          </div>

          {/* 球種選択（凡例） */}
          <div style={styles.legendPanel}>
            <div style={styles.legendTitle}>球種</div>
            {pitchTypesList.map((item) => (
              <div
                key={item.type}
                style={styles.legendItem(selectedPitchType === item.type)}
                onClick={() => setSelectedPitchType(item.type)}
              >
                <span>{item.label}</span>
                {/* 凡例は塗りつぶしなし */}
                <PitchSymbol type={item.type} size={24} />
              </div>
            ))}
          </div>
        </div>

        {/* 右：ストライクゾーン */}
        <div style={styles.rightColumn}>
          <div style={styles.gridWrapper}>
            <div style={styles.gridOverlay}>
              {[...Array(5)].map((_, row) =>
                [...Array(5)].map((_, col) => (
                  <div key={`${row}-${col}`} style={styles.gridCell(row, col)} />
                ))
              )}
            </div>
            <div style={styles.clickLayer} onClick={handleClickLayer} />
            {pitches.map(p => (
              <div key={p.id} style={styles.pitchPoint(p.x, p.y)}>
                <PitchSymbol type={p.type} number={p.order} size={40} result={p.result} />
              </div>
            ))}

            {/* 結果選択ミニパネル（画面中央に固定表示） */}
            {pendingPoint && (
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)', // 中央揃え
                  background: '#fff',
                  border: '2px solid #333',
                  borderRadius: 8,
                  padding: 16,
                  zIndex: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  minWidth: 280,
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 16, textAlign: 'center' }}>
                  球種: {getPitchTypeName(selectedPitchType)}
                </div>
                <div style={{ fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>結果を選択</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {(['swing','looking','ball','inplay'] as const).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setPendingResult(r)}
                      style={{
                        padding: '8px 12px',
                        background: pendingResult === r ? '#3498db' : '#f5f5f5',
                        color: pendingResult === r ? '#fff' : '#333',
                        border: '2px solid ' + (pendingResult === r ? '#3498db' : '#ccc'),
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontWeight: pendingResult === r ? 'bold' : 'normal',
                      }}
                    >
                      {r === 'swing' ? 'スイング' : r === 'looking' ? '見逃し' : r === 'ball' ? 'ボール' : 'インプレイ'}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={commitPitch}
                    disabled={!pendingResult}
                    style={{
                      padding: '8px 16px',
                      background: pendingResult ? '#27ae60' : '#ccc',
                      color:'#fff',
                      border:'none',
                      borderRadius:6,
                      cursor: pendingResult ? 'pointer' : 'not-allowed',
                      fontWeight: 'bold',
                    }}
                  >
                    決定
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPendingPoint(null); setPendingResult(''); }}
                    style={{ padding: '8px 16px', background: '#e74c3c', color: '#fff', border:'none', borderRadius:6, cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PitchCourseInput;