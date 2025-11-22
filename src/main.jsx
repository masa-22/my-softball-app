import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.jsx'; // AuthProviderをインポート

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider> {/* <App /> を AuthProvider でラップする */}
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
