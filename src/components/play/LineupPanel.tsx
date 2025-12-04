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

  // 追加: 初期ラインナップのスナップショット（差分表示用）
  const [initialSnapshot] = React.useState<any[]>(() => JSON.parse(JSON.stringify(lineup)));

  // 追加: 保存確認ダイアログの状態
  const [showConfirm, setShowConfirm] = React.useState(false);

  // 追加: 差分抽出（変更箇所のみ）
  const diffs = React.useMemo(() => {
    return lineup
      .map((cur, idx) => {
        const prev = initialSnapshot[idx];
        if (!prev) return null;
        const posChanged = (prev.position || '') !== (cur.position || '');
        const playerChanged = (prev.playerId || '') !== (cur.playerId || '');
        if (!posChanged && !playerChanged) return null;
        return {
          idx,
          orderLabel: cur.battingOrder === 10 ? 'P' : cur.battingOrder,
          before: { position: prev.position || '—', playerId: prev.playerId || '' },
          after: { position: cur.position || '—', playerId: cur.playerId || '' },
        };
      })
      .filter(Boolean) as Array<{
        idx: number;
        orderLabel: string | number;
        before: { position: string; playerId: string };
        after: { position: string; playerId: string };
      }>;
  }, [lineup, initialSnapshot]);

  const getPlayerNameById = (pid: string) => {
    if (!pid) return '—';
    const p = players.find((x:any) => x.playerId === pid);
    return p ? `${p.familyName} ${p.givenName}` : pid;
  };

  const handleClickSave = () => setShowConfirm(true);
  const handleConfirmAccept = () => { setShowConfirm(false); onSave(); };
  const handleConfirmCancel = () => setShowConfirm(false);

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
            onClick={handleClickSave} 
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

      {/* 追加: 確認ダイアログ（ラインナップボードの一部をそのまま使用し、変更箇所のみ前後並列） */}
      {showConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:9999 }} onClick={handleConfirmCancel}>
          <div
            style={{
              position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
              background:'#fff', borderRadius:12, padding:16, minWidth:600, maxWidth:860,
              boxShadow:'0 10px 30px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight:700, marginBottom:12, fontSize:16 }}>ラインナップ変更の確認</div>
            {diffs.length === 0 ? (
              <div style={{ fontSize:13, color:'#495057', marginBottom:12 }}>変更はありません。</div>
            ) : (
              <>
                {/* 「ボードの一部」: 既存テーブルと同じスタイルで、変更箇所のみ抽出して表示 */}
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize: 13, border:'1px solid #dee2e6', borderRadius:6, overflow:'hidden' }}>
                  <thead>
                    <tr style={{ background:'#f5f5f5' }}>
                      <th style={{ border:'1px solid #ccc', padding:6, width:60 }}>打順</th>
                      <th style={{ border:'1px solid #ccc', padding:6 }}>変更前</th>
                      <th style={{ border:'1px solid #ccc', padding:6 }}>変更後</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffs.map(d => (
                      <tr key={d.idx} style={{ background:'#fff' }}>
                        <td style={{ border:'1px solid #ccc', padding:6, textAlign:'center' }}>{d.orderLabel}</td>
                        <td style={{ border:'1px solid #ccc', padding:6 }}>
                          <div>守備: {d.before.position}</div>
                          <div>選手: {getPlayerNameById(d.before.playerId)}</div>
                        </td>
                        <td style={{ border:'1px solid #ccc', padding:6 }}>
                          <div>守備: {d.after.position}</div>
                          <div>選手: {getPlayerNameById(d.after.playerId)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop:8, fontSize:12, color:'#6c757d' }}>
                  変更行のみ表示しています。上記内容で問題なければ「保存する」を押してください。
                </div>
              </>
            )}
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:12 }}>
              <button onClick={handleConfirmCancel} style={{ padding:'8px 12px' }}>キャンセル</button>
              <button onClick={handleConfirmAccept} style={{ padding:'8px 12px', background:'#27ae60', color:'#fff', border:'none', borderRadius:6 }}>
                保存する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LineupPanel;
