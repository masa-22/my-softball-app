/**
 * 投球チャート（5×5グリッド）
 * ランナー入力画面で使用
 */
import React from 'react';

const styles = {
  container: {
    backgroundColor: '#fff',
    border: '1px solid #dee2e6',
    padding: '12px',
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  title: {
    fontWeight: 600,
    fontSize: '13px',
    marginBottom: 8,
    color: '#495057',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '10px',
  },
  cell: (isInner: boolean) => ({
    width: '20%',
    paddingTop: '20%',
    position: 'relative' as const,
    border: '1px solid #adb5bd',
    backgroundColor: isInner ? '#f1f3f5' : '#fff',
  }),
};

const PitchChart: React.FC = () => {
  const renderGrid = () => {
    const rows = [];
    for (let i = 0; i < 5; i++) {
      const cells = [];
      for (let j = 0; j < 5; j++) {
        const isInner = i >= 1 && i <= 3 && j >= 1 && j <= 3;
        cells.push(<td key={j} style={styles.cell(isInner)}></td>);
      }
      rows.push(<tr key={i}>{cells}</tr>);
    }
    return rows;
  };

  return (
    <div style={styles.container}>
      <div style={styles.title}>投球チャート</div>
      <table style={styles.table}>
        <tbody>{renderGrid()}</tbody>
      </table>
    </div>
  );
};

export default PitchChart;
