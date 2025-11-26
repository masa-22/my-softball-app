import React, { ReactNode } from 'react';
import Header from './Header';

interface Props {
  children: ReactNode;
}

const MainLayout: React.FC<Props> = ({ children }) => {
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
