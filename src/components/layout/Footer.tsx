import React, { useState } from 'react';

const version = '1.0.3';
const updatedAt = '2025-12-10';

const Footer: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <footer
      style={{
        padding: '12px 20px',
        backgroundColor: '#f6f8fb',
        borderTop: '1px solid #e2e6ed',
        display: 'flex',
        justifyContent: 'center'
      }}
    >
      <div style={{ maxWidth: '1200px', width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-label="更新情報を表示"
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cfd6e3',
              backgroundColor: '#ffffff',
              color: '#4a5568',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
            }}
          >
            {open ? '更新情報を閉じる' : '更新情報を開く'}
          </button>

          {open && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                bottom: '40px',
                width: '320px',
                padding: '12px',
                backgroundColor: '#ffffff',
                border: '1px solid #d9e1ec',
                borderRadius: '10px',
                boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                color: '#2c3e50',
                zIndex: 10
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>更新情報</div>
                <div style={{ fontSize: '12px', color: '#7f8c8d' }}>最終更新: {updatedAt}</div>
              </div>
              <div style={{ fontSize: '13px', marginBottom: '6px' }}>バージョン: {version}</div>
              <ul style={{ paddingLeft: '18px', margin: 0, lineHeight: 1.5, fontSize: '13px' }}>
                <li>データ型 atBats / pitches にストライクカウントを保持</li>
                <li>守備変更が participants に反映されるように改善</li>
                <li>守備変更など participants の更新がボックススコア・打者成績・投手成績へ反映</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;

