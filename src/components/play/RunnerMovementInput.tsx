/**
 * ランナーの動き入力コンポーネント
 * - 打席結果後のランナーの進塁・アウト・得点を入力
 */
import React, { useState } from 'react';

interface RunnerMovementInputProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

const RunnerMovementInput: React.FC<RunnerMovementInputProps> = ({ onComplete, onCancel }) => {
  return (
    <div style={{ 
      padding: 20, 
      background: '#fff', 
      border: '1px solid #dee2e6', 
      borderRadius: 8,
      maxWidth: 800,
      margin: '0 auto',
    }}>
      <h3 style={{ 
        marginBottom: 20, 
        fontSize: 18, 
        fontWeight: 600, 
        color: '#212529',
        textAlign: 'center',
      }}>
        ランナーの動き入力
      </h3>

      <div style={{ 
        padding: 40, 
        textAlign: 'center', 
        color: '#6c757d',
        fontSize: 16,
        marginBottom: 20,
      }}>
        ランナーの進塁・アウト・得点を入力する画面（準備中）
      </div>

      {/* アクションボタン */}
      <div style={{ 
        display: 'flex', 
        gap: 12, 
        justifyContent: 'center',
      }}>
        <button
          type="button"
          onClick={() => onCancel && onCancel()}
          style={{ 
            padding: '10px 24px', 
            background: '#e74c3c', 
            color: '#fff', 
            border: 'none', 
            borderRadius: 6, 
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={() => onComplete && onComplete()}
          style={{
            padding: '10px 24px',
            background: '#27ae60',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          完了
        </button>
      </div>
    </div>
  );
};

export default RunnerMovementInput;
