/**
 * ランナー状況入力コンポーネント
 * - 左上：簡易スコアボード＋BSO
 * - 右側：ダイヤモンドUI（ベース選択→赤ハイライト→選手選択）
 * - 1球画面より右側（入力部）を大きく
 */
import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import MiniScoreBoard from './common/MiniScoreBoard';
import DiamondField from './runner/DiamondField';
import PitchChart from './runner/PitchChart';
import AdvanceReasonDialog, { RunnerAdvancement, AdvanceReasonResult } from './runner/AdvanceReasonDialog';
import OutReasonDialog, { RunnerOut, OutReasonResult } from './runner/OutReasonDialog';
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
  leftColumn: { 
    display: 'flex', 
    flexDirection: 'column' as const, 
    gap: '12px', 
    width: '220px' 
  },
  rightColumn: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' },
  fieldPanel: {
    width: '100%',
    maxWidth: '500px',
    minHeight: 'auto', // 固定高さを削除して自動調整
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #dee2e6',
    position: 'relative' as const,
    padding: '16px',
    paddingBottom: '20px', // 下部に余白を追加
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  playerItem: (selected: boolean) => ({
    display: 'flex', 
    justifyContent: 'space-between', 
    padding: '10px 12px', 
    borderRadius: 8, 
    cursor: 'pointer',
    background: selected ? '#4c6ef5' : '#fff', 
    color: selected ? '#fff' : '#212529', 
    border: '1px solid ' + (selected ? '#4c6ef5' : '#dee2e6'), 
    marginBottom: 8,
    transition: 'all 0.2s ease',
    fontWeight: selected ? 600 : 400,
  }),
  pickerOverlay: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#fff',
    border: '1px solid #dee2e6',
    borderRadius: 12,
    padding: 20,
    zIndex: 10,
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    minWidth: 320,
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

  const currentBatterId = useMemo(() => {
    const batterEntry = currentLineup.find((e: any) => e.battingOrder === 1);
    return batterEntry?.playerId || null;
  }, [currentLineup]);

  const currentFPId = useMemo(() => {
    const fpEntry = currentLineup.find((e: any) => e.battingOrder === 10);
    return fpEntry?.playerId || null;
  }, [currentLineup]);

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
  const [previousRunners, setPreviousRunners] = useState<{ '1': string | null; '2': string | null; '3': string | null }>({
    '1': null, '2': null, '3': null,
  });

  // ダイアログ表示用state
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [showOutDialog, setShowOutDialog] = useState(false);
  const [pendingAdvancements, setPendingAdvancements] = useState<RunnerAdvancement[]>([]);
  const [pendingOuts, setPendingOuts] = useState<RunnerOut[]>([]);

  // ランナー変更を検出して適切なダイアログを表示
  const detectRunnerChanges = (
    before: { '1': string | null; '2': string | null; '3': string | null },
    after: { '1': string | null; '2': string | null; '3': string | null }
  ) => {
    const advancements: RunnerAdvancement[] = [];
    const outs: RunnerOut[] = [];

    // 各ベースをチェック
    (['1', '2', '3'] as const).forEach(base => {
      const beforePlayer = before[base];
      if (!beforePlayer) return;

      // プレー後にそのランナーがどこにいるか探す
      const afterBases = ['1', '2', '3', 'home'] as const;
      const foundBase = afterBases.find(b => after[b as '1' | '2' | '3'] === beforePlayer);

      if (foundBase && foundBase !== base) {
        // 進塁した
        const player = selectablePlayers.find(p => p.playerId === beforePlayer);
        if (player) {
          advancements.push({
            runnerId: beforePlayer,
            runnerName: `${player.familyName} ${player.givenName}`.trim(),
            fromBase: base,
            toBase: foundBase,
          });
        }
      } else if (!foundBase) {
        // ランナーが消えた（アウトまたは得点）
        // 本塁への移動は得点なのでアウト扱いしない
        const player = selectablePlayers.find(p => p.playerId === beforePlayer);
        if (player) {
          outs.push({
            runnerId: beforePlayer,
            runnerName: `${player.familyName} ${player.givenName}`.trim(),
            fromBase: base,
            outAtBase: base, // とりあえず元の塁でアウト
          });
        }
      }
    });

    return { advancements, outs };
  };

  const commitRunner = () => {
    if (!selectedBase || selectedBase === 'home' || !selectedPlayerId) return;
    const next = { ...runners, [selectedBase]: selectedPlayerId } as typeof runners;
    
    // 変更を検出
    const { advancements, outs } = detectRunnerChanges(previousRunners, next);
    
    if (advancements.length > 0) {
      setPendingAdvancements(advancements);
      setShowAdvanceDialog(true);
      setPreviousRunners(next); // 変更を記録
    } else if (outs.length > 0) {
      setPendingOuts(outs);
      setShowOutDialog(true);
      setPreviousRunners(next); // 変更を記録
    } else {
      // 変更なし、そのまま確定
      setRunners(next);
      setPreviousRunners(next);
      setSelectedBase(null);
      setSelectedPlayerId(null);
      if (onChange) {
        try {
          onChange(next);
        } catch (error) {
          console.error('onChange実行エラー:', error);
        }
      }
    }
  };

  const handleAdvanceConfirm = (results: AdvanceReasonResult[]) => {
    console.log('進塁理由:', results);
    // TODO: playServiceに保存
    
    const next = { ...runners };
    setRunners(next);
    setSelectedBase(null);
    setSelectedPlayerId(null);
    setShowAdvanceDialog(false);
    setPendingAdvancements([]);
    
    if (onChange) {
      try {
        onChange(next);
      } catch (error) {
        console.error('onChange実行エラー:', error);
      }
    }
  };

  const handleOutConfirm = (results: OutReasonResult[]) => {
    console.log('アウト理由:', results);
    // TODO: playServiceに保存
    
    const next = { ...runners };
    setRunners(next);
    setSelectedBase(null);
    setSelectedPlayerId(null);
    setShowOutDialog(false);
    setPendingOuts([]);
    
    if (onChange) {
      try {
        onChange(next);
      } catch (error) {
        console.error('onChange実行エラー:', error);
      }
    }
  };

  const handleDialogCancel = () => {
    // キャンセル時は変更を戻す
    setRunners(previousRunners);
    setShowAdvanceDialog(false);
    setShowOutDialog(false);
    setPendingAdvancements([]);
    setPendingOuts([]);
    setSelectedBase(null);
    setSelectedPlayerId(null);
  };

  return (
    <div style={styles.container}>
      {/* 進塁理由ダイアログ */}
      {showAdvanceDialog && (
        <AdvanceReasonDialog
          advancements={pendingAdvancements}
          context="pitch"
          onConfirm={handleAdvanceConfirm}
          onCancel={handleDialogCancel}
        />
      )}

      {/* アウト理由ダイアログ */}
      {showOutDialog && (
        <OutReasonDialog
          outs={pendingOuts}
          context="pitch"
          onConfirm={handleOutConfirm}
          onCancel={handleDialogCancel}
        />
      )}

      <div style={styles.mainLayout}>
        <div style={styles.leftColumn}>
          <MiniScoreBoard bso={bso} />
          <PitchChart />
        </div>

        <div style={styles.rightColumn}>
          <div style={styles.fieldPanel}>
            <div style={{ marginBottom: 0 }}>
              <DiamondField 
                runners={runners} 
                selectedBase={selectedBase} 
                onBaseClick={setSelectedBase} 
              />
            </div>

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

            <div style={{ marginTop: 0, paddingLeft: 12, paddingRight: 12 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: 12, color: '#495057' }}>現在のランナー</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {(['1','2','3'] as const).map(b => {
                  const pid = runners[b];
                  const player = selectablePlayers.find(p => p.playerId === pid);
                  const name = player ? `${player.familyName || ''} ${player.givenName || ''}`.trim() : '-';
                  return (
                    <div key={b} style={{ 
                      background: pid ? '#ffe6e6' : '#fff', 
                      border: '1px solid #ddd', 
                      borderRadius: 6, 
                      padding: 6, 
                      fontSize: 11 
                    }}>
                      <div style={{ color: '#666', marginBottom: 3, fontWeight: 600 }}>
                        {b === '1' ? '一' : b === '2' ? '二' : '三'}塁
                      </div>
                      <div style={{ fontWeight: 500 }}>{name}</div>
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