import React, { useState } from 'react';
import PlayerSearch from './PlayerSearch';
import PlayerRegister from './PlayerRegister';
import PlayerBulkRegister from './PlayerBulkRegister';

type ActiveTab = 'search' | 'register' | 'bulk';

const PlayerManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('search');

  return (
    <div style={{ width: '95%', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>選手管理</h1>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ccc' }}>
        <button onClick={() => setActiveTab('search')} style={{ padding: '10px 20px', backgroundColor: activeTab === 'search' ? '#3498db' : '#f0f0f0', color: activeTab === 'search' ? '#fff' : '#333', border: 'none', borderRadius: '4px 4px 0 0', cursor: 'pointer', fontWeight: 'bold' }}>選手検索</button>
        <button onClick={() => setActiveTab('register')} style={{ padding: '10px 20px', backgroundColor: activeTab === 'register' ? '#27ae60' : '#f0f0f0', color: activeTab === 'register' ? '#fff' : '#333', border: 'none', borderRadius: '4px 4px 0 0', cursor: 'pointer', fontWeight: 'bold' }}>新規登録</button>
        <button onClick={() => setActiveTab('bulk')} style={{ padding: '10px 20px', backgroundColor: activeTab === 'bulk' ? '#9b59b6' : '#f0f0f0', color: activeTab === 'bulk' ? '#fff' : '#333', border: 'none', borderRadius: '4px 4px 0 0', cursor: 'pointer', fontWeight: 'bold' }}>一括登録</button>
      </div>

      <div style={{ padding: '20px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
        {activeTab === 'search' && <PlayerSearch />}
        {activeTab === 'register' && <PlayerRegister />}
        {activeTab === 'bulk' && <PlayerBulkRegister />}
      </div>
    </div>
  );
};

export default PlayerManagement;
