import React, { useRef, useState } from 'react';
import { registerTeam } from '../../services/teamService';

const TeamRegister: React.FC = () => {
  const teamNameRef = useRef<HTMLInputElement>(null);
  const teamAbbrRef = useRef<HTMLInputElement>(null);
  const prefectureRef = useRef<HTMLInputElement>(null);
  const affiliationRef = useRef<HTMLSelectElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const teamData = {
      teamName: teamNameRef.current?.value.trim() || '',
      teamAbbr: teamAbbrRef.current?.value.trim() || '',
      prefecture: prefectureRef.current?.value.trim() || '',
      affiliation: affiliationRef.current?.value.trim() || '',
    };

    if (!teamData.teamName || !teamData.teamAbbr || !teamData.prefecture || !teamData.affiliation) {
      setError('すべてのフィールドを入力してください。');
      return;
    }

    try {
      setError('');
      setSuccess('');
      setLoading(true);
      const newTeam = await registerTeam(teamData);
      setSuccess(`チーム「${newTeam.teamName}」を登録しました。(ID: ${newTeam.id})`);
      if (teamNameRef.current) teamNameRef.current.value = '';
      if (teamAbbrRef.current) teamAbbrRef.current.value = '';
      if (prefectureRef.current) prefectureRef.current.value = '';
      if (affiliationRef.current) affiliationRef.current.value = '';
    } catch (err: any) {
      console.error(err);
      if (err.code === 'DUPLICATE') {
        setError('同じチーム名と都道府県の組合せは既に登録されています。');
      } else {
        setError(err.message || 'チーム登録に失敗しました。');
      }
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

        <div style={{ marginBottom: '15px' }}>
          <label>都道府県</label>
          <input
            type="text"
            ref={prefectureRef}
            required
            placeholder="例: 千葉県"
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
