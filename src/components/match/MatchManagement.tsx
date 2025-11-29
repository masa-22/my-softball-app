import React, { useState } from 'react';
import MatchSearch from './MatchSearch';
import MatchRegister from './MatchRegister';

type ActiveTab = 'search' | 'register';

const MatchManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('search');

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <h1>試合管理</h1>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ccc' }}>
        <button onClick={() => setActiveTab('search')} style={{ padding: '10px 20px', backgroundColor: activeTab === 'search' ? '#3498db' : '#f0f0f0', color: activeTab === 'search' ? '#fff' : '#333', border: 'none', borderRadius: '4px 4px 0 0', cursor: 'pointer', fontWeight: 'bold' }}>試合検索</button>
        <button onClick={() => setActiveTab('register')} style={{ padding: '10px 20px', backgroundColor: activeTab === 'register' ? '#27ae60' : '#f0f0f0', color: activeTab === 'register' ? '#fff' : '#333', border: 'none', borderRadius: '4px 4px 0 0', cursor: 'pointer', fontWeight: 'bold' }}>新規登録</button>
      </div>

      <div style={{ padding: '20px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
        {activeTab === 'search' && <MatchSearch />}
        {activeTab === 'register' && <MatchRegister />}
      </div>
    </div>
  );
};

export default MatchManagement;
