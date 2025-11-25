import React, { useState } from 'react';
import Header from './Header';
import TeamManagement from '../team/TeamManagement';

const MainLayout = ({ children }) => {
  const [currentPage, setCurrentPage] = useState('home');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main style={{ flex: 1, padding: '20px', width: '100%', boxSizing: 'border-box' }}>
        {children}
      </main>
    </div>
  );
};

export default MainLayout;