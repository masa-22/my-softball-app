import React, { useRef, useState } from 'react';
import { registerTeam } from '../../services/teamService';

const TeamRegister = () => {
  const teamNameRef = useRef();
  const teamAbbrRef = useRef();
  const affiliationRef = useRef();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    const teamData = {
      teamName: teamNameRef.current.value.trim(),
      teamAbbr: teamAbbrRef.current.value.trim(),
      affiliation: affiliationRef.current.value.trim(),
    };

    // バリデーション
    if (!teamData.teamName || !teamData.teamAbbr || !teamData.affiliation) {
      setError('すべてのフィールドを入力してください。');
      return;
    }

    try {
      setError('');
      setSuccess('');
      setLoading(true);
      const newTeam = await registerTeam(teamData);
      setSuccess(`チーム「${newTeam.teamName}」を登録しました。(ID: ${newTeam.id})`);
      teamNameRef.current.value = '';
      teamAbbrRef.current.value = '';
      affiliationRef.current.value = '';
    } catch (err) {
      console.error(err);
      setError('チーム登録に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>チーム新規登録</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>チーム名</label>
          <input
            type="text"
            ref={teamNameRef}
            required
            placeholder="例: 東京理科大学"
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>チーム略称</label>
          <input
            type="text"
            ref={teamAbbrRef}
            required
            placeholder="例: 理科大"
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>所属</label>
          <select
            ref={affiliationRef}
            required
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="">選択してください</option>
            <option value="大学">大学</option>
            <option value="社会人">社会人</option>
            <option value="日本リーグ">日本リーグ</option>
            <option value="高校">高校</option>
            <option value="その他">その他</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#27ae60',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          {loading ? '登録中...' : 'チームを登録'}
        </button>
      </form>
    </div>
  );
};

export default TeamRegister;
