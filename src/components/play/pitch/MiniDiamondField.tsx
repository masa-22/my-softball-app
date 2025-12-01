/**
 * ミニダイヤモンドフィールド（小）
 * 1球ごとの入力画面で使用（ランナー状況表示用）
 */
import React from 'react';

interface MiniDiamondFieldProps {
  runners: { '1': string | null; '2': string | null; '3': string | null };
}

const MiniDiamondField: React.FC<MiniDiamondFieldProps> = ({ runners }) => {
  const baseSize = 12;
  
  const baseFill = (key: '1' | '2' | '3' | 'home') => {
    if (key !== 'home' && runners[key]) return '#ffb3b3';
    return '#fff';
  };

  return (
    <svg width="100%" height="100%" viewBox="0 0 200 140" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '140px' }}>
      <defs>
        <radialGradient id="grassGradSmall" cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#5fb55f" />
          <stop offset="100%" stopColor="#4a9d4a" />
        </radialGradient>
        <linearGradient id="dirtGradSmall" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#d4a574" />
          <stop offset="100%" stopColor="#b8895f" />
        </linearGradient>
      </defs>
      
      <rect x="0" y="0" width="200" height="140" fill="url(#grassGradSmall)" />
      <path d="M100,122 L10,44 A127.5,127.5 0 0 1 190,44 L100,122 Z" fill="url(#dirtGradSmall)" />
      <line x1="100" y1="122" x2="0" y2="35" stroke="#fff" strokeWidth="2" />
      <line x1="100" y1="122" x2="200" y2="35" stroke="#fff" strokeWidth="2" />
      <path d="M10,44 A127.5,127.5 0 0 1 190,44" fill="none" stroke="#fff" strokeWidth="1.5" />
      
      {/* マウンド */}
      <circle cx="100" cy="83" r="8" fill="url(#dirtGradSmall)" stroke="#fff" strokeWidth="0.5" opacity="0.7" />
      <rect x="96" y="81.5" width="8" height="3" fill="#fff" rx="0.5" />
      
      {/* ホームベース */}
      <path 
        d="M100,127 L94,122 L94,117 L106,117 L106,122 Z" 
        fill={baseFill('home')} 
        stroke="#000" 
        strokeWidth="1.5"
      />
      
      {/* 三塁ベース */}
      <rect
        x={55 - baseSize / 2} y={76.5 - baseSize / 2}
        width={baseSize} height={baseSize}
        transform={`rotate(45 55 76.5)`}
        fill={baseFill('3')} 
        stroke="#000" 
        strokeWidth="1.5"
        rx="1"
      />
      
      {/* 二塁ベース */}
      <rect
        x={100 - baseSize / 2} y={37 - baseSize / 2}
        width={baseSize} height={baseSize}
        transform={`rotate(45 100 37)`}
        fill={baseFill('2')} 
        stroke="#000" 
        strokeWidth="1.5"
        rx="1"
      />
      
      {/* 一塁ベース */}
      <rect
        x={145 - baseSize / 2} y={76.5 - baseSize / 2}
        width={baseSize} height={baseSize}
        transform={`rotate(-45 145 76.5)`}
        fill={baseFill('1')} 
        stroke="#000" 
        strokeWidth="1.5"
        rx="1"
      />
    </svg>
  );
};

export default MiniDiamondField;
