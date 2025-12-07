import React, { useEffect, useState } from 'react';
import { getPlayers } from '../../services/playerService';
import { getTeams } from '../../services/teamService';

interface TeamPlayerListProps {
  teamId: string | number;
  onClose: () => void;
}

const TeamPlayerList: React.FC<TeamPlayerListProps> = ({ teamId, onClose }) => {
  const [players, setPlayers] = useState<any[]>([]);
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const teamsData = await getTeams();
        const teamData = teamsData.find(t => String(t.id) === String(teamId));
        setTeam(teamData || null);
        
        const playerList = await getPlayers(teamId);
        setPlayers(playerList.sort((a, b) => {
          const nameA = `${a.familyName || ''} ${a.givenName || ''}`.trim();
          const nameB = `${b.familyName || ''} ${b.givenName || ''}`.trim();
          return nameA.localeCompare(nameB);
        }));
      } catch (error) {
        console.error('Error loading team and players:', error);
        setTeam(null);
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [teamId]);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div style={{ width: 'min(90vw, 800px)', maxHeight: '80vh', overflowY: 'auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 10px 0' }}>
          {team ? `${team.teamName} (${team.teamAbbr})` : 'チーム'} の選手一覧
        </h2>
        {team && (
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            <p style={{ margin: '4px 0' }}><strong>所属:</strong> {team.affiliation}</p>
            {team.prefecture && <p style={{ margin: '4px 0' }}><strong>都道府県:</strong> {team.prefecture}</p>}
          </div>
        )}
      </div>

      {players.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
          <p>このチームにはまだ選手が登録されていません。</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'left' }}>選手ID</th>
                <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'left' }}>苗字</th>
                <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'left' }}>名前</th>
                <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>利き手</th>
                <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>利き打ち</th>
                <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>入学年度</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.playerId}>
                  <td style={{ border: '1px solid #ccc', padding: '8px', fontSize: '13px', color: '#666' }}>
                    {player.playerId}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{player.familyName}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{player.givenName}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{player.throwing}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{player.batting}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>
                    {player.entryYear || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '10px', fontSize: '13px', color: '#666', textAlign: 'right' }}>
            合計: {players.length}名
          </div>
        </div>
      )}

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button
          onClick={onClose}
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
          閉じる
        </button>
      </div>
    </div>
  );
};

export default TeamPlayerList;

