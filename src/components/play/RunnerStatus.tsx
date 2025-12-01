/**
 * ランナー状況入力コンポーネント
 * - 左上：簡易スコアボード＋BSO
 * - 右側：ダイヤモンドUI（ベース選択→赤ハイライト→選手選択）
 * - 1球画面より右側（入力部）を大きく
 */
import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getMatches } from '../../services/matchService';
import { getTeams } from '../../services/teamService';
import { getPlays } from '../../services/playService';
import { getPlayers } from '../../services/playerService';
import { getLineup } from '../../services/lineupService';

type BaseKey = '1' | '2' | '3' | 'home';

interface RunnerStatusProps {
  onChange?: (runners: { '1': string | null; '2': string | null; '3': string | null }) => void;
}

const styles = {
  container: {
    fontFamily: '"Hiragino Kaku Gothic ProN", "Meiryo", sans-serif',
    padding: '0',
    maxWidth: '980px',
    margin: '0 auto',
  },
  mainLayout: { display: 'flex', gap: '16px', alignItems: 'flex-start' },
  leftColumn: { display: 'flex', flexDirection: 'column' as const, gap: '12px', width: '180px' },
  scoreBoard: { backgroundColor: '#e8e8e8', border: 'none', padding: '8px', borderRadius: 6 },
  bsoContainer: { display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' },
  bsoLabel: { fontWeight: 'bold', width: '15px' },
  dot: (color: string, active: boolean) => ({
    width: '12px', height: '12px', borderRadius: '50%', backgroundColor: active ? color : '#999', display: 'inline-block',
  }),
  pitchGrid: {
    backgroundColor: '#f5f5f5',
    border: 'none',
    padding: '8px',
    borderRadius: 6,
  },
  gridTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '10px',
  },
  gridCell: (isInner: boolean) => ({
    width: '20%',
    paddingTop: '20%',
    position: 'relative' as const,
    border: '1px solid #999',
    backgroundColor: isInner ? '#eaeaea' : '#fff',
  }),
  rightColumn: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' },
  fieldPanel: {
    width: '400px',
    height: '320px',
    background: 'linear-gradient(180deg, #c8f7c5, #baf2b6)',
    borderRadius: 8,
    border: '1px solid #ddd',
    position: 'relative' as const,
    padding: '12px',
  },
  baseLabel: { fontSize: 12, color: '#333', textAlign: 'center' as const, marginTop: 4 },
  playerItem: (selected: boolean) => ({
    display: 'flex', justifyContent: 'space-between', padding: '8px', borderRadius: 6, cursor: 'pointer',
    background: selected ? '#3498db' : '#fff', color: selected ? '#fff' : '#333', border: '1px solid #ddd', marginBottom: 6,
  }),
  pickerOverlay: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#fff',
    border: '2px solid #333',
    borderRadius: 8,
    padding: 16,
    zIndex: 10,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    minWidth: 280,
    maxHeight: '80%',
    overflow: 'auto',
  },
};

const RunnerStatus: React.FC<RunnerStatusProps> = ({ onChange }) => {
  const { matchId } = useParams<{ matchId: string }>();
  const match = useMemo(() => (matchId ? getMatches().find(m => m.id === matchId) : null), [matchId]);

  const currentInningInfo = useMemo(() => {
    if (!matchId) return { inning: 1, half: 'top' as 'top' | 'bottom' };
    const plays = getPlays(matchId);
    if (!plays.length) return { inning: 1, half: 'top' as 'top' | 'bottom' };
    const last = plays[plays.length - 1];
    return { inning: last.inning, half: last.topOrBottom };
  }, [matchId]);

  const teamNames = useMemo(() => {
    if (!match) return { home: '先攻', away: '後攻' };
    const teams = getTeams();
    const home = teams.find(t => String(t.id) === String(match.homeTeamId));
    const away = teams.find(t => String(t.id) === String(match.awayTeamId));
    return { home: home?.teamAbbr || '先攻', away: away?.teamAbbr || '後攻' };
  }, [match]);

  const offenseTeamId = useMemo(() => {
    if (!match) return null;
    return currentInningInfo.half === 'top' ? match.homeTeamId : match.awayTeamId;
  }, [match, currentInningInfo]);

  const offensePlayers = useMemo(() => {
    if (offenseTeamId == null) return [];
    return getPlayers(offenseTeamId);
  }, [offenseTeamId]);

  // 現在のラインナップを取得
  const currentLineup = useMemo(() => {
    try {
      if (!matchId) return [];
      const lineup = getLineup(matchId);
      if (!lineup) return [];
      return currentInningInfo.half === 'top' ? lineup.home : lineup.away;
    } catch (error) {
      console.error('ラインナップ取得エラー:', error);
      return [];
    }
  }, [matchId, currentInningInfo]);

  // 現在のバッターとFP(打順10)を取得
  const currentBatterId = useMemo(() => {
    // TODO: 実際のバッターIDを取得するロジックを実装
    // 仮実装として打順1番を返す
    const batterEntry = currentLineup.find((e: any) => e.battingOrder === 1);
    return batterEntry?.playerId || null;
  }, [currentLineup]);

  const currentFPId = useMemo(() => {
    // FP(打順10)を取得
    const fpEntry = currentLineup.find((e: any) => e.battingOrder === 10);
    return fpEntry?.playerId || null;
  }, [currentLineup]);

  // 選択可能な選手リスト（バッターとFPを除外）
  const selectablePlayers = useMemo(() => {
    return offensePlayers.filter(p => 
      p.playerId !== currentBatterId && p.playerId !== currentFPId
    );
  }, [offensePlayers, currentBatterId, currentFPId]);

  const [bso, setBso] = useState({ b: 0, s: 0, o: 0 });
  const [selectedBase, setSelectedBase] = useState<BaseKey | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [runners, setRunners] = useState<{ '1': string | null; '2': string | null; '3': string | null }>({
    '1': null, '2': null, '3': null,
  });

  const commitRunner = () => {
    if (!selectedBase || selectedBase === 'home' || !selectedPlayerId) return;
    const next = { ...runners, [selectedBase]: selectedPlayerId } as typeof runners;
    setRunners(next);
    setSelectedPlayerId(null);
    // onChangeが定義されているか確認してから呼び出す
    if (onChange) {
      try {
        onChange(next);
      } catch (error) {
        console.error('onChange実行エラー:', error);
      }
    }
  };

  const baseSize = 24;
  const baseFill = (key: BaseKey) => {
    if (selectedBase === key) return '#e74c3c';
    // ランナーがいる塁は薄い赤色
    if (key !== 'home' && runners[key]) return '#ffb3b3';
    return '#fff';
  };

  const renderPitchGrid = () => {
    const rows = [];
    for (let i = 0; i < 5; i++) {
      const cells = [];
      for (let j = 0; j < 5; j++) {
        const isInner = i >= 1 && i <= 3 && j >= 1 && j <= 3;
        cells.push(<td key={j} style={styles.gridCell(isInner)}></td>);
      }
      rows.push(<tr key={i}>{cells}</tr>);
    }
    return rows;
  };

  return (
    <div style={styles.container}>
      <div style={styles.mainLayout}>
        <div style={styles.leftColumn}>
          <div style={styles.scoreBoard}>
            <div style={{ fontWeight: 'bold', marginBottom: 6 }}>
              {`${currentInningInfo.inning}回${currentInningInfo.half === 'top' ? '表' : '裏'}`}
            </div>
            <div style={{ display: 'flex' }}>
              <div style={{ paddingRight: 8, marginRight: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span>{teamNames.home}</span><span>0</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{teamNames.away}</span><span>0</span>
                </div>
              </div>
              <div>
                <div style={styles.bsoContainer}>
                  <span style={styles.bsoLabel}>B</span>
                  {[...Array(3)].map((_, i) => <span key={i} style={styles.dot('#4ade80', i < bso.b)} />)}
                </div>
                <div style={styles.bsoContainer}>
                  <span style={styles.bsoLabel}>S</span>
                  {[...Array(2)].map((_, i) => <span key={i} style={styles.dot('#facc15', i < bso.s)} />)}
                </div>
                <div style={styles.bsoContainer}>
                  <span style={styles.bsoLabel}>O</span>
                  {[...Array(2)].map((_, i) => <span key={i} style={styles.dot('#ef4444', i < bso.o)} />)}
                </div>
              </div>
            </div>
          </div>

          <div style={styles.pitchGrid}>
            <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: 4 }}>投球チャート</div>
            <table style={styles.gridTable}>
              <tbody>{renderPitchGrid()}</tbody>
            </table>
          </div>
        </div>

        <div style={styles.rightColumn}>
          <div style={styles.fieldPanel}>
            <svg width="100%" height="100%" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid meet">
              <defs>
                <radialGradient id="grassGrad" cx="50%" cy="30%" r="80%">
                  <stop offset="0%" stopColor="#5fb55f" />
                  <stop offset="100%" stopColor="#4a9d4a" />
                </radialGradient>
                <linearGradient id="dirtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#d4a574" />
                  <stop offset="100%" stopColor="#b8895f" />
                </linearGradient>
              </defs>
              
              <rect x="0" y="0" width="400" height="320" fill="url(#grassGrad)" />
              <path d="M200,280 L20,100 A255,255 0 0 1 380,100 L200,280 Z" fill="url(#dirtGrad)" />
              <line x1="200" y1="280" x2="0" y2="80" stroke="#fff" strokeWidth="3" />
              <line x1="200" y1="280" x2="400" y2="80" stroke="#fff" strokeWidth="3" />
              <path d="M20,100 A255,255 0 0 1 380,100" fill="none" stroke="#fff" strokeWidth="2" />
              
              {/* 2塁ベースから両ファウルラインへの垂線（少し上に移動） */}
              <line x1="200" y1="85" x2="110" y2="175" stroke="#fff" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
              <line x1="200" y1="85" x2="290" y2="175" stroke="#fff" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
              
              {/* マウンド */}
              <circle cx="200" cy="190" r="15" fill="url(#dirtGrad)" stroke="#fff" strokeWidth="1" opacity="0.7" />
              <rect x="192" y="187" width="16" height="5" fill="#fff" rx="1" />
              
              <path 
                d="M200,290 L188,280 L188,268 L212,268 L212,280 Z" 
                fill={baseFill('home')} 
                stroke="#000" 
                strokeWidth="2"
                onClick={() => setSelectedBase('home')} 
                style={{ cursor: 'pointer' }}
              />
              
              {/* 三塁ベース */}
              <rect
                x={110 - baseSize / 2} y={175 - baseSize / 2}
                width={baseSize} height={baseSize}
                transform={`rotate(45 110 175)`}
                fill={baseFill('3')} 
                stroke="#000" 
                strokeWidth="2"
                rx="2"
                onClick={() => setSelectedBase('3')} 
                style={{ cursor: 'pointer' }}
              />
              
              {/* 二塁ベース（5だけ上に移動） */}
              <rect
                x={200 - baseSize / 2} y={85 - baseSize / 2}
                width={baseSize} height={baseSize}
                transform={`rotate(45 200 85)`}
                fill={baseFill('2')} 
                stroke="#000" 
                strokeWidth="2"
                rx="2"
                onClick={() => setSelectedBase('2')} 
                style={{ cursor: 'pointer' }}
              />
              
              {/* 一塁ベース */}
              <rect
                x={290 - baseSize / 2} y={175 - baseSize / 2}
                width={baseSize} height={baseSize}
                transform={`rotate(-45 290 175)`}
                fill={baseFill('1')} 
                stroke="#000" 
                strokeWidth="2"
                rx="2"
                onClick={() => setSelectedBase('1')} 
                style={{ cursor: 'pointer' }}
              />
            </svg>

            {selectedBase && selectedBase !== 'home' && (
              <div style={styles.pickerOverlay}>
                <div style={{ fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
                  {`${selectedBase === '1' ? '一' : selectedBase === '2' ? '二' : '三'}塁のランナー選択`}
                </div>
                <div style={{ marginBottom: 8, color: '#666', fontSize: 12, textAlign: 'center' }}>
                  攻撃側: {currentInningInfo.half === 'top' ? teamNames.home : teamNames.away}
                </div>
                <div style={{ maxHeight: 240, overflow: 'auto', borderTop: '1px solid #eee', paddingTop: 8 }}>
                  {selectablePlayers.length ? (
                    selectablePlayers.map(p => {
                      const name = `${p.familyName || ''} ${p.givenName || ''}`.trim();
                      const selected = selectedPlayerId === p.playerId;
                      // ランナーとして既に選択されているかチェック
                      const isOnBase = Object.values(runners).includes(p.playerId);
                      return (
                        <div 
                          key={p.playerId} 
                          style={{
                            ...styles.playerItem(!!selected),
                            backgroundColor: selected ? '#3498db' : isOnBase ? '#ffe6e6' : '#fff',
                          }} 
                          onClick={() => setSelectedPlayerId(p.playerId)}
                        >
                          <span>{name}</span>
                          {isOnBase && <span style={{ fontSize: 10, color: '#e74c3c' }}>★</span>}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: '#999', textAlign: 'center' }}>選手データがありません</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={commitRunner}
                    disabled={!selectedPlayerId}
                    style={{
                      padding: '8px 16px', background: selectedPlayerId ? '#27ae60' : '#ccc',
                      color: '#fff', border: 'none', borderRadius: 6, cursor: selectedPlayerId ? 'pointer' : 'not-allowed', fontWeight: 'bold',
                    }}
                  >
                    確定
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedBase(null); setSelectedPlayerId(null); }}
                    style={{ padding: '8px 16px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}

            <div style={{ position: 'absolute', bottom: 8, left: 12, right: 12 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 11 }}>現在のランナー</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                {(['1','2','3'] as const).map(b => {
                  const pid = runners[b];
                  const player = selectablePlayers.find(p => p.playerId === pid);
                  const name = player ? `${player.familyName || ''} ${player.givenName || ''}`.trim() : '-';
                  return (
                    <div key={b} style={{ 
                      background: pid ? '#ffe6e6' : '#fff', 
                      border: '1px solid #ddd', 
                      borderRadius: 4, 
                      padding: 4, 
                      fontSize: 10 
                    }}>
                      <div style={{ color: '#666', marginBottom: 2 }}>
                        {b === '1' ? '一' : b === '2' ? '二' : '三'}塁
                      </div>
                      <div>{name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RunnerStatus;