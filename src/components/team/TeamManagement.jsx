import React, { useState } from 'react';
import TeamSearch from './TeamSearch';
import TeamRegister from './TeamRegister';

const TeamManagement = () => {
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'register'

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>チーム管理</h1>

      {/* タブ切り替え */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ccc' }}>
        <button
          onClick={() => setActiveTab('search')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'search' ? '#3498db' : '#f0f0f0',
            color: activeTab === 'search' ? '#fff' : '#333',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          チーム検索
        </button>
        <button
          onClick={() => setActiveTab('register')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'register' ? '#27ae60' : '#f0f0f0',
            color: activeTab === 'register' ? '#fff' : '#333',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          新規登録
        </button>
      </div>

      {/* コンテンツ表示 */}
      <div style={{ padding: '20px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
        {activeTab === 'search' && <TeamSearch />}
        {activeTab === 'register' && <TeamRegister />}
      </div>
    </div>
  );
};

export default TeamManagement;
