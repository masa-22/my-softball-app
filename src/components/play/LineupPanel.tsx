/**
 * ラインナップパネルコンポーネント
 * プレー登録画面の両脇に表示されるラインナップ編集パネル
 */
import React from 'react';

const POSITIONS = ['1','2','3','4','5','6','7','8','9','DP','PH','PR','TR'];

interface LineupPanelProps {
  teamName: string;
  lineup: any[];
  players: any[];
  currentBatterId?: string | null;
  currentPitcherId?: string | null;
  runners: { '1': string | null; '2': string | null; '3': string | null };
  onPositionChange: (index: number, value: string) => void;
  onPlayerChange: (index: number, value: string) => void;
  onSave: () => void;
}

const LineupPanel: React.FC<LineupPanelProps> = ({
  teamName,
  lineup,
  players,
  currentBatterId,
  currentPitcherId,
  runners,
  onPositionChange,
  onPlayerChange,
  onSave,
}) => {
  const getUsedPositions = (): Set<string> => {
    const used = new Set<string>();
    lineup.forEach(e => { if (e.position) used.add(e.position); });
    return used;
  };

  const usedPositions = getUsedPositions();

  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 16, color: '#212529' }}>
        {teamName}
      </div>
      
      <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 8, background: '#fff' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background:'#f5f5f5' }}>
              <th style={{ border:'1px solid #ccc', padding:6, width:50 }}>打順</th>
              <th style={{ border:'1px solid #ccc', padding:6, width:50 }}>守備</th>
              <th style={{ border:'1px solid #ccc', padding:6 }}>選手</th>
            </tr>
          </thead>
          <tbody>
            {lineup.map((entry, idx) => {
              const displayOrder = entry.battingOrder === 10 ? 'P' : entry.battingOrder;

              const isCurrentPitcher = !!currentPitcherId && entry.playerId === currentPitcherId;
              const isCurrentBatter = !!currentBatterId && entry.playerId === currentBatterId;
              const isRunner = Object.values(runners).includes(entry.playerId);

              let rowBg = 'transparent';
              if (isCurrentBatter) {
                rowBg = '#e8f7e8';
              } else if (isCurrentPitcher) {
                rowBg = '#ffe3ea';
              } else if (isRunner) {
                rowBg = '#fff4e6';
              }

              return (
                <tr key={idx} style={{ backgroundColor: rowBg }}>
                  <td style={{ border:'1px solid #ccc', padding:6, textAlign:'center', width:50 }}>
                    {displayOrder}
                  </td>
                  <td style={{ border:'1px solid #ccc', padding:6, width:50 }}>
                    <select
                      value={entry.position || ''}
                      onChange={(e) => onPositionChange(idx, e.target.value)}
                      style={{ width:'100%' }}
                    >
                      <option value="">選択</option>
                      {POSITIONS.map(pos => {
                        const disable = usedPositions.has(pos) && pos !== entry.position;
                        return <option key={pos} value={pos} disabled={disable}>{pos}</option>;
                      })}
                    </select>
                  </td>
                  <td style={{ border:'1px solid #ccc', padding:6 }}>
                    <select
                      value={entry.playerId || ''}
                      onChange={(e) => onPlayerChange(idx, e.target.value)}
                      style={{ width:'100%' }}
                    >
                      <option value="">選択</option>
                      {players.map((p:any) => (
                        <option key={p.playerId} value={p.playerId}>
                          {p.familyName} {p.givenName}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ textAlign:'right', marginTop:8 }}>
          <button 
            onClick={onSave} 
            style={{ 
              padding:'6px 10px', 
              background:'#27ae60', 
              color:'#fff', 
              border:'none', 
              borderRadius:4,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ラインナップを保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default LineupPanel;
