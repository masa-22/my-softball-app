/**
 * ダイヤモンドフィールド（大）
 * ランナー入力画面で使用
 */
import React from 'react';

type BaseKey = '1' | '2' | '3' | 'home';

interface DiamondFieldProps {
  runners: { '1': string | null; '2': string | null; '3': string | null };
  selectedBase: BaseKey | null;
  onBaseClick: (base: BaseKey) => void;
}

const DiamondField: React.FC<DiamondFieldProps> = ({ runners, selectedBase, onBaseClick }) => {
  const baseSize = 24;
  
  const baseFill = (key: BaseKey) => {
    if (selectedBase === key) return '#e74c3c';
    if (key !== 'home' && runners[key]) return '#ffb3b3';
    return '#fff';
  };

  return (
    <svg width="100%" height="100%" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="grassGrad" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#5fb55f" />
          <stop offset="100%" stopColor="#4a9d4a" />
        </radialGradient>
        <linearGradient id="dirtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#d4a574" />
          <stop offset="100%" stopColor="#b8895f" />
        </linearGradient>
      </defs>
      
      {/* 外野を含む全体の芝生 */}
      <rect x="0" y="0" width="400" height="400" fill="url(#grassGrad)" />
      
      {/* 内野の土部分 */}
      <path d="M200,360 L20,180 A255,255 0 0 1 380,180 L200,360 Z" fill="url(#dirtGrad)" />
      
      {/* ファウルライン */}
      <line x1="200" y1="360" x2="0" y2="160" stroke="#fff" strokeWidth="3" />
      <line x1="200" y1="360" x2="400" y2="160" stroke="#fff" strokeWidth="3" />
      
      {/* 外野のアーク */}
      <path d="M20,180 A255,255 0 0 1 380,180" fill="none" stroke="#fff" strokeWidth="2" />
      
      {/* 二塁からファウルラインへの補助線 */}
      <line x1="200" y1="165" x2="110" y2="255" stroke="#fff" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
      <line x1="200" y1="165" x2="290" y2="255" stroke="#fff" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
      
      {/* マウンド */}
      <circle cx="200" cy="270" r="15" fill="url(#dirtGrad)" stroke="#fff" strokeWidth="1" opacity="0.7" />
      <rect x="192" y="267" width="16" height="5" fill="#fff" rx="1" />
      
      {/* ホームベース */}
      <path 
        d="M200,370 L188,360 L188,348 L212,348 L212,360 Z" 
        fill={baseFill('home')} 
        stroke="#000" 
        strokeWidth="2"
        onClick={() => onBaseClick('home')} 
        style={{ cursor: 'pointer' }}
      />
      
      {/* 三塁ベース */}
      <rect
        x={110 - baseSize / 2} y={255 - baseSize / 2}
        width={baseSize} height={baseSize}
        transform={`rotate(45 110 255)`}
        fill={baseFill('3')} 
        stroke="#000" 
        strokeWidth="2"
        rx="2"
        onClick={() => onBaseClick('3')} 
        style={{ cursor: 'pointer' }}
      />
      
      {/* 二塁ベース */}
      <rect
        x={200 - baseSize / 2} y={165 - baseSize / 2}
        width={baseSize} height={baseSize}
        transform={`rotate(45 200 165)`}
        fill={baseFill('2')} 
        stroke="#000" 
        strokeWidth="2"
        rx="2"
        onClick={() => onBaseClick('2')} 
        style={{ cursor: 'pointer' }}
      />
      
      {/* 一塁ベース */}
      <rect
        x={290 - baseSize / 2} y={255 - baseSize / 2}
        width={baseSize} height={baseSize}
        transform={`rotate(-45 290 255)`}
        fill={baseFill('1')} 
        stroke="#000" 
        strokeWidth="2"
        rx="2"
        onClick={() => onBaseClick('1')} 
        style={{ cursor: 'pointer' }}
      />
    </svg>
  );
};

export default DiamondField;
