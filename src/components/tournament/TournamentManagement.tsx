import React, { useState } from 'react';
import TournamentSearch from './TournamentSearch';
import TournamentRegister from './TournamentRegister';

type ActiveTab = 'search' | 'register';

const TournamentManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('search');

  return (
    <div style={{ width: '95%', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>大会管理</h1>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ccc' }}>
        <button onClick={() => setActiveTab('search')} style={{ padding: '10px 20px', backgroundColor: activeTab === 'search' ? '#3498db' : '#f0f0f0', color: activeTab === 'search' ? '#fff' : '#333', border: 'none', borderRadius: '4px 4px 0 0', cursor: 'pointer', fontWeight: 'bold' }}>大会検索</button>
        <button onClick={() => setActiveTab('register')} style={{ padding: '10px 20px', backgroundColor: activeTab === 'register' ? '#27ae60' : '#f0f0f0', color: activeTab === 'register' ? '#fff' : '#333', border: 'none', borderRadius: '4px 4px 0 0', cursor: 'pointer', fontWeight: 'bold' }}>新規登録</button>
      </div>

      <div style={{ padding: '20px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
        {activeTab === 'search' && <TournamentSearch />}
        {activeTab === 'register' && <TournamentRegister />}
      </div>
    </div>
  );
};

export default TournamentManagement;
