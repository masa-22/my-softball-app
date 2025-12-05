import React, { useState, useEffect } from 'react';
import { getTeams } from '../../services/teamService';
import { registerPlayer } from '../../services/playerService';
import Modal from '../common/Modal';

interface PlayerFormData {
  teamId: string;
  familyName: string;
  givenName: string;
  throwing: string;
  batting: string;
  entryYear: string;
}

const PlayerBulkRegister: React.FC = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<PlayerFormData[]>([
    { teamId: '', familyName: '', givenName: '', throwing: '右', batting: '右', entryYear: '' }
  ]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPlayers, setPendingPlayers] = useState<PlayerFormData[]>([]);

  useEffect(() => {
    const ts = getTeams();
    setTeams(ts);
  }, []);

  const addPlayerRow = () => {
    setPlayers([...players, { teamId: '', familyName: '', givenName: '', throwing: '右', batting: '右', entryYear: '' }]);
  };

  const removePlayerRow = (index: number) => {
    if (players.length > 1) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const updatePlayer = (index: number, field: keyof PlayerFormData, value: string) => {
    const updated = [...players];
    updated[index] = { ...updated[index], [field]: value };
    setPlayers(updated);
  };

  const validatePlayers = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    players.forEach((player, index) => {
      if (!player.teamId) {
        errors.push(`${index + 1}行目: チームを選択してください。`);
      }
      if (!player.familyName || !player.givenName) {
        errors.push(`${index + 1}行目: 苗字と名前を入力してください。`);
      }
      if (!player.throwing || !player.batting) {
        errors.push(`${index + 1}行目: 利き手と利き打ちを選択してください。`);
      }
      
      const selectedTeam = teams.find(t => String(t.id) === String(player.teamId));
      if (selectedTeam && selectedTeam.affiliation === '大学' && !player.entryYear) {
        errors.push(`${index + 1}行目: 大学チームの場合、入学年度を入力してください。`);
      }
    });

    return { valid: errors.length === 0, errors };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const validation = validatePlayers();
    if (!validation.valid) {
      setError(validation.errors.join('\n'));
      return;
    }

    setPendingPlayers(players);
    setConfirmOpen(true);
  };

  const confirmRegister = async () => {
    if (pendingPlayers.length === 0) return;
    
    setConfirmOpen(false);
    setLoading(true);
    setError('');
    setMessage('');

    const results: { success: number; failed: number; errors: string[] } = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < pendingPlayers.length; i++) {
      const player = pendingPlayers[i];
      try {
        const selectedTeam = teams.find(t => String(t.id) === String(player.teamId));
        await registerPlayer({
          teamId: player.teamId,
          familyName: player.familyName,
          givenName: player.givenName,
          throwing: player.throwing,
          batting: player.batting,
          entryYear: player.entryYear || null
        });
        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`${i + 1}行目: ${err.message || '登録に失敗しました。'}`);
      }
    }

    if (results.success > 0) {
      setMessage(`${results.success}名の選手を登録しました。`);
      if (results.failed > 0) {
        setError(`${results.failed}名の登録に失敗しました。\n${results.errors.join('\n')}`);
      }
      // フォームをリセット
      setPlayers([{ teamId: '', familyName: '', givenName: '', throwing: '右', batting: '右', entryYear: '' }]);
    } else {
      setError(`すべての登録に失敗しました。\n${results.errors.join('\n')}`);
    }

    setLoading(false);
    setPendingPlayers([]);
  };

  const getSelectedTeam = (teamId: string) => {
    return teams.find(t => String(t.id) === String(teamId));
  };

  return (
    <div>
      <h2>選手一括登録</h2>
      {error && <p style={{ color: 'red', whiteSpace: 'pre-line' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>チーム</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>苗字</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>名前</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>利き手</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>利き打ち</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>入学年度</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center', width: '80px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => {
                const selectedTeam = getSelectedTeam(player.teamId);
                return (
                  <tr key={index}>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                      <select
                        value={player.teamId}
                        onChange={(e) => updatePlayer(index, 'teamId', e.target.value)}
                        style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                      >
                        <option value="">チームを選択</option>
                        {teams.map(t => (
                          <option key={t.id} value={t.id}>{t.teamName} ({t.teamAbbr})</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                      <input
                        value={player.familyName}
                        onChange={(e) => updatePlayer(index, 'familyName', e.target.value)}
                        style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                      />
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                      <input
                        value={player.givenName}
                        onChange={(e) => updatePlayer(index, 'givenName', e.target.value)}
                        style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                      />
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                      <select
                        value={player.throwing}
                        onChange={(e) => updatePlayer(index, 'throwing', e.target.value)}
                        style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                      >
                        <option>右</option>
                        <option>左</option>
                        <option>両</option>
                      </select>
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                      <select
                        value={player.batting}
                        onChange={(e) => updatePlayer(index, 'batting', e.target.value)}
                        style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                      >
                        <option>右</option>
                        <option>左</option>
                        <option>両</option>
                      </select>
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                      <input
                        value={player.entryYear}
                        onChange={(e) => updatePlayer(index, 'entryYear', e.target.value)}
                        placeholder={selectedTeam?.affiliation === '大学' ? '必須' : '任意'}
                        disabled={selectedTeam?.affiliation !== '大学'}
                        style={{ 
                          width: '100%', 
                          padding: '6px', 
                          boxSizing: 'border-box',
                          backgroundColor: selectedTeam?.affiliation === '大学' ? '#fff' : '#f5f5f5'
                        }}
                      />
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => removePlayerRow(index)}
                        disabled={players.length === 1}
                        style={{
                          padding: '4px 8px',
                          background: players.length === 1 ? '#ccc' : '#e74c3c',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: players.length === 1 ? 'not-allowed' : 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={addPlayerRow}
            style={{
              padding: '10px 20px',
              background: '#3498db',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            + 行を追加
          </button>
        </div>

        <button
          disabled={loading}
          type="submit"
          style={{
            width: '100%',
            padding: '12px',
            background: '#27ae60',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '登録中...' : `一括登録 (${players.length}名)`}
        </button>
      </form>

      {/* 確認モーダル */}
      {confirmOpen && pendingPlayers.length > 0 && (
        <Modal onClose={() => setConfirmOpen(false)}>
          <div>
            <h3>登録内容の確認</h3>
            <p style={{ marginBottom: '16px' }}>以下の {pendingPlayers.length} 名の選手を登録しますか？</p>
            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left' }}>チーム</th>
                    <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left' }}>苗字</th>
                    <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left' }}>名前</th>
                    <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left' }}>利き手</th>
                    <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left' }}>利き打ち</th>
                    <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left' }}>入学年度</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPlayers.map((player, index) => {
                    const team = teams.find(t => String(t.id) === String(player.teamId));
                    return (
                      <tr key={index}>
                        <td style={{ border: '1px solid #ccc', padding: '6px' }}>
                          {team ? `${team.teamName} (${team.teamAbbr})` : player.teamId}
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: '6px' }}>{player.familyName}</td>
                        <td style={{ border: '1px solid #ccc', padding: '6px' }}>{player.givenName}</td>
                        <td style={{ border: '1px solid #ccc', padding: '6px' }}>{player.throwing}</td>
                        <td style={{ border: '1px solid #ccc', padding: '6px' }}>{player.batting}</td>
                        <td style={{ border: '1px solid #ccc', padding: '6px' }}>{player.entryYear || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={() => setConfirmOpen(false)}
                style={{ padding: '8px 12px', flex: 1, border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
              >
                キャンセル
              </button>
              <button
                onClick={confirmRegister}
                style={{ padding: '8px 12px', flex: 1, background: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                登録する
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PlayerBulkRegister;

