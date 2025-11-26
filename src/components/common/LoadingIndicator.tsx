import React from 'react';

const LoadingIndicator: React.FC = () => {
  const spinnerStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    border: '4px solid #ccc',
    borderTop: '4px solid #3498db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '50px auto',
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={spinnerStyle} />

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      <p style={{ color: '#555', marginTop: '10px' }}>読み込み中...</p>
    </div>
  );
};

export default LoadingIndicator;
