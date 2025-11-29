/**
 * 1プレーの結果入力・表示用コンポーネント。
 * - 打撃結果や進塁、アウト、得点などを入力・表示する。
 */
import React, { useState } from 'react';

interface PlayResultPanelProps {
  onComplete?: () => void; // 入力完了時のコールバック
}

const PlayResultPanel: React.FC<PlayResultPanelProps> = ({ onComplete }) => {
  const [result, setResult] = useState<string>('');

  const handleSubmit = () => {
    // ここで結果を保存
    console.log('プレー結果:', result);
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <div style={{ padding: 16, background: '#fff', border: '1px solid #ddd', borderRadius: 6 }}>
      <h3 style={{ marginBottom: 16 }}>プレー結果入力</h3>
      
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>打撃結果</label>
        <select
          value={result}
          onChange={(e) => setResult(e.target.value)}
          style={{ width: '100%', padding: 8, fontSize: 16 }}
        >
          <option value="">選択してください</option>
          <option value="single">シングルヒット</option>
          <option value="double">ツーベース</option>
          <option value="triple">スリーベース</option>
          <option value="homerun">ホームラン</option>
          <option value="groundout">ゴロアウト</option>
          <option value="flyout">フライアウト</option>
          <option value="error">エラー</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => onComplete && onComplete()}
          style={{ padding: '8px 16px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!result}
          style={{
            padding: '8px 16px',
            background: result ? '#27ae60' : '#ccc',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: result ? 'pointer' : 'not-allowed',
          }}
        >
          確定
        </button>
      </div>
    </div>
  );
};

export default PlayResultPanel;
