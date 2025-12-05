import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getPendingUsers, getAllUsers, approveUser, UserApproval } from '../../services/userApprovalService';
import LoadingIndicator from '../common/LoadingIndicator';

const UserApprovalManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<UserApproval[]>([]);
  const [allUsers, setAllUsers] = useState<UserApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    loadUsers();
  }, [activeTab]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      if (activeTab === 'pending') {
        const users = await getPendingUsers();
        setPendingUsers(users);
      } else {
        const users = await getAllUsers();
        setAllUsers(users);
      }
    } catch (err: any) {
      console.error(err);
      setError('ユーザー一覧の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    if (!currentUser) {
      setError('ログインが必要です。');
      return;
    }

    try {
      setError('');
      setMessage('');
      await approveUser(userId, currentUser.uid);
      setMessage(`ユーザー（${userId}）を承認しました。`);
      await loadUsers();
    } catch (err: any) {
      console.error(err);
      setError('承認処理に失敗しました。');
    }
  };

  if (loading && pendingUsers.length === 0 && allUsers.length === 0) {
    return <LoadingIndicator />;
  }

  const usersToDisplay = activeTab === 'pending' ? pendingUsers : allUsers;

  return (
    <div style={{ width: '95%', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>ユーザー承認管理</h1>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ccc' }}>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'pending' ? '#f39c12' : '#f0f0f0',
            color: activeTab === 'pending' ? '#fff' : '#333',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          承認待ち ({pendingUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'all' ? '#3498db' : '#f0f0f0',
            color: activeTab === 'all' ? '#fff' : '#333',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          全ユーザー
        </button>
      </div>

      {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}
      {message && <p style={{ color: 'green', marginBottom: '10px' }}>{message}</p>}

      <div style={{ padding: '20px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
        {loading ? (
          <LoadingIndicator />
        ) : usersToDisplay.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
            {activeTab === 'pending' ? '承認待ちのユーザーはありません。' : 'ユーザーが登録されていません。'}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc', backgroundColor: '#fff' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'left' }}>ユーザーID</th>
                  <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'left' }}>メールアドレス</th>
                  <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'left' }}>登録日時</th>
                  <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'left' }}>承認状態</th>
                  {activeTab === 'pending' && (
                    <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>操作</th>
                  )}
                  {activeTab === 'all' && (
                    <>
                      <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'left' }}>承認日時</th>
                      <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'left' }}>承認者</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {usersToDisplay.map((user) => (
                  <tr key={user.userId}>
                    <td style={{ border: '1px solid #ccc', padding: '8px', fontSize: '13px', color: '#666' }}>
                      {user.userId}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>{user.email}</td>
                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                      {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleString('ja-JP') : '—'}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: user.approved ? '#d4edda' : '#fff3cd',
                        color: user.approved ? '#155724' : '#856404',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {user.approved ? '承認済み' : '承認待ち'}
                      </span>
                    </td>
                    {activeTab === 'pending' && (
                      <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleApprove(user.userId)}
                          style={{
                            padding: '6px 12px',
                            background: '#27ae60',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '13px'
                          }}
                        >
                          承認
                        </button>
                      </td>
                    )}
                    {activeTab === 'all' && (
                      <>
                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                          {user.approvedAt?.toDate ? user.approvedAt.toDate().toLocaleString('ja-JP') : '—'}
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: '8px', fontSize: '13px', color: '#666' }}>
                          {user.approvedBy || '—'}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button
          onClick={loadUsers}
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
          更新
        </button>
      </div>
    </div>
  );
};

export default UserApprovalManagement;

