/**
 * 球種選択コンポーネント
 * SVGアイコンと選択UIを提供
 */
import React from 'react';
import { PitchType } from '../../../types/PitchType';

// export { PitchType }; // Removed re-export to avoid confusion

interface PitchSymbolProps {
  type: PitchType;
  number?: number;
  size?: number;
  result?: 'swing' | 'looking' | 'ball' | 'inplay' | 'deadball' | 'foul';
}

export const PitchSymbol: React.FC<PitchSymbolProps> = ({ type, number, size = 30, result }) => {
  const textStyle = { fontSize: '12px', fontWeight: 'bold', textAnchor: 'middle' as const, dominantBaseline: 'central' as const };
  const cx = size / 2;
  const cy = size / 2;

  let fillColor = 'none';
  let textColor = 'black';
  
  if (result === 'swing' || result === 'looking' || result === 'foul') {
    fillColor = '#facc15'; // ストライク/ファウル系: 黄色
    textColor = 'black';
  } else if (result === 'ball') {
    fillColor = '#27ae60'; // ボール: 緑色
    textColor = 'white';
  } else if (result === 'inplay') {
    fillColor = '#3498db'; // インプレイ: 青色
    textColor = 'white';
  } else if (result === 'deadball') {
    fillColor = '#e74c3c'; // デッドボール: 赤色
    textColor = 'white';
  }

  let shape;
  switch (type) {
    case 'rise':
      shape = <polygon points={`${cx},2 ${size-2},${size-2} 2,${size-2}`} fill={fillColor} stroke="black" strokeWidth="1.5" />;
      break;
    case 'drop':
      shape = <polygon points={`2,2 ${size-2},2 ${cx},${size-2}`} fill={fillColor} stroke="black" strokeWidth="1.5" />;
      break;
    case 'cut':
      shape = <polygon points={`${size-2},2 ${size-2},${size-2} 2,${cx}`} fill={fillColor} stroke="black" strokeWidth="1.5" />;
      break;
    case 'changeup':
      shape = <rect x="4" y="4" width={size-8} height={size-8} fill={fillColor} stroke="black" strokeWidth="1.5" />;
      break;
    case 'chenrai':
      shape = <polygon points={`${cx},2 ${size-2},${cy} ${cx},${size-2} 2,${cy}`} fill={fillColor} stroke="black" strokeWidth="1.5" />;
      break;
    case 'slider':
      const outerRadius = size / 2 - 2;
      const innerRadius = size / 2 - 6;
      shape = (
        <>
          <circle cx={cx} cy={cy} r={outerRadius} fill={fillColor} stroke="black" strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r={innerRadius} fill="none" stroke="black" strokeWidth="1.5" />
        </>
      );
      break;
    case 'unknown':
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

interface PitchTypeSelectorProps {
  selectedType: PitchType;
  onSelect: (type: PitchType) => void;
}

const pitchTypesList: { type: PitchType; label: string }[] = [
  { type: 'rise', label: 'ライズ' },
  { type: 'drop', label: 'ドロップ' },
  { type: 'cut', label: 'カット' },
  { type: 'changeup', label: 'チェンジアップ' },
  { type: 'chenrai', label: 'チェンライ' },
  { type: 'slider', label: 'スライダー' },
  { type: 'unknown', label: '不明' },
];

const styles = {
  container: {
    backgroundColor: '#fff',
    border: '1px solid #dee2e6',
    padding: '12px',
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: 260,
    margin: '0 auto',
  },
  title: {
    fontWeight: 600,
    fontSize: '13px',
    marginBottom: '10px',
    color: '#495057',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(70px, 1fr))',
    gap: '8px',
  },
  item: (selected: boolean) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 6px',
    cursor: 'pointer',
    backgroundColor: selected ? '#e7f5ff' : 'transparent',
    borderRadius: '6px',
    border: selected ? '2px solid #4c6ef5' : '1px solid #dee2e6',
    transition: 'all 0.2s ease',
    minHeight: '65px',
  }),
  label: (selected: boolean) => ({
    fontSize: '12px',
    fontWeight: selected ? 600 : 400,
    color: selected ? '#1c7ed6' : '#495057',
    marginTop: '4px',
    textAlign: 'center' as const,
  }),
};

const PitchTypeSelector: React.FC<PitchTypeSelectorProps> = ({ selectedType, onSelect }) => {
  return (
    <div style={styles.container}>
      <div style={styles.title}>球種選択</div>
      <div style={styles.grid}>
        {pitchTypesList.map((item) => (
          <div
            key={item.type}
            style={styles.item(selectedType === item.type)}
            onClick={() => onSelect(item.type)}
          >
            <PitchSymbol type={item.type} size={26} />
            <div style={styles.label(selectedType === item.type)}>
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PitchTypeSelector;
