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
import { getGameState, updateRunnersRealtime } from '../../services/gameStateService';
import { addRunsRealtime } from '../../services/gameStateService';
// 追加: アウト・イニング進行のリアルタイム更新
import { updateCountsRealtime, closeHalfInningRealtime } from '../../services/gameStateService';

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
  // 追加: アウト追加ダイアログ用スタイル
  addOutDialog: {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#fff',
    border: '1px solid #dee2e6',
    borderRadius: 12,
    padding: 20,
    zIndex: 1000,
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    minWidth: 320,
    maxWidth: 400,
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
  // 追加: アウト追加ダイアログ（単一選択）
  const [showAddOutDialog, setShowAddOutDialog] = useState(false);
  const [selectedOutRunner, setSelectedOutRunner] = useState<{ runnerId: string; fromBase: '1' | '2' | '3' } | null>(null);

  // 追加: 同一タブ内リアルタイム同期用カスタムイベント
  const notifyGameStatesUpdated = () => {
    try {
      window.dispatchEvent(new Event('game_states_updated'));
    } catch {
      // noop
    }
  };

  const updateRunners = () => {
    if (!matchId) return;
    const gs = getGameState(matchId);
    if (gs) {
      const next = { '1': gs.runners['1b'], '2': gs.runners['2b'], '3': gs.runners['3b'] } as const;
      setRunners(next);
      setPreviousRunners(next);
    }
  };

  // ▼ 追加: ランナー変更を検出（進塁/アウト）
  const detectRunnerChanges = (
    before: { '1': string | null; '2': string | null; '3': string | null },
    after: { '1': string | null; '2': string | null; '3': string | null }
  ) => {
    const advancements: RunnerAdvancement[] = [];
    const outs: RunnerOut[] = [];

    (['1', '2', '3'] as const).forEach(base => {
      const beforePlayer = before[base];
      if (!beforePlayer) return;

      const afterBases = ['1', '2', '3', 'home'] as const;
      const foundBase = afterBases.find(b => after[b as '1' | '2' | '3'] === beforePlayer);

      if (foundBase && foundBase !== base) {
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
        const player = selectablePlayers.find(p => p.playerId === beforePlayer);
        if (player) {
          outs.push({
            runnerId: beforePlayer,
            runnerName: `${player.familyName} ${player.givenName}`.trim(),
            fromBase: base,
            outAtBase: base,
          });
        }
      }
    });

    return { advancements, outs };
  };

  // ▼ 追加: gameState のランナー購読（リアルタイム）
  React.useEffect(() => {
    if (!matchId) return;
    updateRunners();
    const t = window.setInterval(updateRunners, 500);
    const onStorage = (e: StorageEvent) => { if (e.key === 'game_states') updateRunners(); };
    window.addEventListener('storage', onStorage);
    // 追加: 同一タブ内の更新通知を購読
    const onLocalUpdate = () => updateRunners();
    window.addEventListener('game_states_updated', onLocalUpdate);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('game_states_updated', onLocalUpdate);
    };
  }, [matchId]);

  // ベース名ラベル
  const baseLabel = (b: BaseKey) => (b === 'home' ? 'ホーム' : b === '1' ? '一塁' : b === '2' ? '二塁' : '三塁');

  // 走者氏名取得
  const getRunnerName = (playerId: string | null) => {
    if (!playerId) return '';
    // selectablePlayers だと打者/FP等が除外され名前解決できない場合があるため、チーム全員から取得
    const p = offensePlayers.find(sp => sp.playerId === playerId);
    return p ? `${p.familyName} ${p.givenName}`.trim() : '';
  };

  // 直前の塁にいる最も近い走者を探す（targetより手前の最大の塁）
  const findNearestPriorRunner = (target: '2' | '3'): { fromBase: '1' | '2'; runnerId: string } | null => {
    if (target === '2') {
      if (runners['1']) return { fromBase: '1', runnerId: runners['1']! };
      return null;
    }
    // target === '3'
    if (runners['2']) return { fromBase: '2', runnerId: runners['2']! };
    if (runners['1']) return { fromBase: '1', runnerId: runners['1']! };
    return null;
  };

  // クリック時の挙動:
  // - 既に走者がいる塁をクリック → 確認 → アウト理由ダイアログ
  // - 本塁クリック → 三塁走者がいれば確認 → 得点として進塁理由ダイアログ
  // - 空き塁クリック → その塁より手前にいる最も近い走者をその塁へ進塁として扱う（いなければ何もしない）
  const handleBaseClick = (base: BaseKey) => {
    if (!matchId) return;

    // 本塁（得点処理）
    if (base === 'home') {
      const thirdRunner = runners['3'];
      if (!thirdRunner) return; // 三塁走者がいないなら何もしない
      const name = getRunnerName(thirdRunner) || '三塁走者';
      const ok = window.confirm(`${name}の得点を記録しますか？`);
      if (!ok) return;

      // 次状態（3塁を空に）
      const next = { ...runners, '3': null };

      // 進塁理由ダイアログを準備（3→Home）
      setPendingAdvancements([{
        runnerId: thirdRunner,
        runnerName: name,
        fromBase: '3',
        toBase: 'home',
      }]);
      setPreviousRunners(next);
      setShowAdvanceDialog(true);
      return;
    }

    // 既に走者がいる塁 → アウト確認（'1' | '2' | '3' に限定して参照）
    if (base === '1' || base === '2' || base === '3') {
      const currentRunnerId = runners[base];
      if (currentRunnerId) {
        const name = getRunnerName(currentRunnerId) || '走者';
        const ok = window.confirm(`${baseLabel(base)}のランナー「${name}」をアウトにしますか？`);
        if (!ok) return;

        // 次状態（該当塁を空に）
        const next = { ...runners, [base]: null } as typeof runners;
        setPreviousRunners(next);

        setPendingOuts([{
          runnerId: currentRunnerId,
          runnerName: name,
          fromBase: base,
          outAtBase: base,
        }]);
        setShowOutDialog(true);
        return;
      }
    }

    // 空き塁クリック時：新規登録はしない。手前の塁の既存走者を進塁扱い
    if (base === '2' || base === '3') {
      const prior = findNearestPriorRunner(base);
      if (!prior) return; // 手前に走者がいないなら何もしない

      const name = getRunnerName(prior.runnerId) || (prior.fromBase === '1' ? '一塁走者' : '二塁走者');
      const ok = window.confirm(`${name}を${baseLabel(base)}へ進塁として記録しますか？`);
      if (!ok) return;

      // 次状態: from を空にし、target に配置
      const next = { ...runners } as typeof runners;
      next[prior.fromBase] = null;
      next[base] = prior.runnerId;

      // 進塁理由ダイアログ（from→to）
      setPendingAdvancements([{
        runnerId: prior.runnerId,
        runnerName: name,
        fromBase: prior.fromBase,
        toBase: base,
      }]);
      setPreviousRunners(next);
      setShowAdvanceDialog(true);
      return;
    }

    // 一塁クリック（手前の塁が存在しないため、何もしない）
    return;
  };

  // commitRunner は新規登録用だが、今回は使用しない（残置）
  const commitRunner = () => {
    if (!selectedBase || selectedBase === 'home' || !selectedPlayerId) return;

    // 同一選手の以前の塁をクリアしてから配置（重複防止）
    const next = { ...runners } as typeof runners;
    (['1','2','3'] as const).forEach(b => {
      if (next[b] === selectedPlayerId) next[b] = null;
    });
    next[selectedBase] = selectedPlayerId;

    // 変更を検出
    const { advancements, outs } = detectRunnerChanges(previousRunners, next);

    if (advancements.length > 0) {
      // 進塁理由ダイアログ
      setPendingAdvancements(advancements);
      setShowAdvanceDialog(true);
      setPreviousRunners(next); // 確定時に適用する次状態を保持
    } else if (outs.length > 0) {
      // 理論上ここには来ない（選手移動でアウトにはならない）が保険
      setPendingOuts(outs);
      setShowOutDialog(true);
      setPreviousRunners(next);
    } else {
      // 変更なし
      setRunners(next);
      setPreviousRunners(next);
      setSelectedBase(null);
      setSelectedPlayerId(null);

      if (matchId) {
        updateRunnersRealtime(matchId, { '1b': next['1'], '2b': next['2'], '3b': next['3'] });
      }
      if (onChange) {
        try { onChange(next); } catch (e) { console.error(e); }
      }
    }
  };

  const handleAdvanceConfirm = (results: AdvanceReasonResult[]) => {
    console.log('進塁理由:', results);

    // 進塁イベントの記録用に保持（ダイアログクローズ前に退避）
    const advs = [...pendingAdvancements];

    // 直前に保持した次状態を適用
    const next = { ...previousRunners };
    
    // 明示的に進塁処理：元の塁を null、進んだ塁に選手IDを設定
    advs.forEach(adv => {
      // 元の塁を null に
      if (adv.fromBase === '1' || adv.fromBase === '2' || adv.fromBase === '3') {
        next[adv.fromBase] = null;
      }
      // 進んだ塁に選手IDを設定（ホームは除く）
      if (adv.toBase === '1' || adv.toBase === '2' || adv.toBase === '3') {
        next[adv.toBase] = adv.runnerId;
      }
      // ホームへの進塁の場合は null のまま（得点）
    });
    
    setRunners(next);
    setSelectedBase(null);
    setSelectedPlayerId(null);
    setShowAdvanceDialog(false);
    setPendingAdvancements([]);

    // 反映（得点含む）
    if (matchId) {
      // runners を game_states に保存
      console.log('Updating runners to game_states (advance):', next);
      updateRunnersRealtime(matchId, { '1b': next['1'], '2b': next['2'], '3b': next['3'] });

      // 3→Home の進塁が含まれる場合は1点加算
      const scoredCount =
        advs.filter(a => a.toBase === 'home').length ||
        results.filter(r => r && advs.some(a => a.runnerId === r.runnerId && a.toBase === 'home')).length;
      if (scoredCount > 0) {
        const half = getGameState(matchId)?.top_bottom || 'top';
        addRunsRealtime(matchId, half, scoredCount);
      }
      // 同一タブ内にも即時通知
      notifyGameStatesUpdated();
    }

    if (onChange) {
      try { onChange(next); } catch (e) { console.error(e); }
    }
  };

  const handleOutConfirm = (results: OutReasonResult[]) => {
    console.log('アウト理由:', results);

    // 記録用に保持
    const outs = [...pendingOuts];

    // 直前に保持した次状態（アウトで走者を消した状態）を適用
    const next = { ...previousRunners };
    
    // 明示的にアウトになった走者の塁を null に設定
    outs.forEach(out => {
      if (out.fromBase === '1' || out.fromBase === '2' || out.fromBase === '3') {
        next[out.fromBase] = null;
      }
    });
    
    setRunners(next);
    setSelectedBase(null);
    setSelectedPlayerId(null);
    setShowOutDialog(false);
    setPendingOuts([]);

    if (matchId) {
      // runners を game_states に保存（アウトになった塁は null）
      console.log('Updating runners to game_states:', next);
      updateRunnersRealtime(matchId, { '1b': next['1'], '2b': next['2'], '3b': next['3'] });

      // BSOのOを加算（複数対応）。3到達でイニング進行
      const gs = getGameState(matchId);
      const currentO = gs?.counts.o ?? 0;
      const addO = outs.length;
      const newO = Math.min(3, currentO + addO);
      updateCountsRealtime(matchId, { o: newO });

      if (newO >= 3) {
        closeHalfInningRealtime(matchId);
      }
      // 同一タブ内にも即時通知
      notifyGameStatesUpdated();
    }

    if (onChange) {
      try { onChange(next); } catch (e) { console.error(e); }
    }
  }; // ← 追加: handleOutConfirm の閉じカッコ

  const handleDialogCancel = () => {
    setShowAdvanceDialog(false);
    setShowOutDialog(false);
    setPendingAdvancements([]);
    setPendingOuts([]);
  };

  // 追加: アウト追加ボタンクリック
  const handleAddOutClick = () => {
    setShowAddOutDialog(true);
  };

  // 追加: アウト追加ダイアログで走者選択確定
  const handleAddOutConfirm = () => {
    if (!selectedOutRunner) return;
    
    const { runnerId, fromBase } = selectedOutRunner;
    const name = getRunnerName(runnerId) || '走者';
    
    const next = { ...runners, [fromBase]: null } as typeof runners;
    setPreviousRunners(next);

    setPendingOuts([{
      runnerId,
      runnerName: name,
      fromBase,
      outAtBase: fromBase,
    }]);
    
    setShowAddOutDialog(false);
    setSelectedOutRunner(null);
    setShowOutDialog(true);
  };

  // 追加: アウト追加ダイアログキャンセル
  const handleAddOutCancel = () => {
    setShowAddOutDialog(false);
    setSelectedOutRunner(null);
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

      {/* 追加: アウト追加ダイアログ */}
      {showAddOutDialog && (
        <>
          <div 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              background: 'rgba(0,0,0,0.5)', 
              zIndex: 999 
            }} 
            onClick={handleAddOutCancel} 
          />
          <div 
            style={styles.addOutDialog}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 'bold', marginBottom: 12, textAlign: 'center', fontSize: 16 }}>
              アウトになった走者を選択
            </div>
            <div style={{ maxHeight: 240, overflow: 'auto', borderTop: '1px solid #eee', paddingTop: 8 }}>
              {(['1', '2', '3'] as const).map(base => {
                const runnerId = runners[base];
                if (!runnerId) return null;
                const isSelected = selectedOutRunner?.runnerId === runnerId && selectedOutRunner?.fromBase === base;
                const name = getRunnerName(runnerId);
                return (
                  <div 
                    key={base} 
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: isSelected ? '#e74c3c' : '#fff',
                      color: isSelected ? '#fff' : '#212529',
                      border: `1px solid ${isSelected ? '#e74c3c' : '#dee2e6'}`,
                      marginBottom: 8,
                      transition: 'all 0.2s ease',
                      fontWeight: isSelected ? 600 : 400,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }} 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOutRunner({ runnerId, fromBase: base });
                    }}
                  >
                    <span>{baseLabel(base)}: {name}</span>
                    <div 
                      style={{ 
                        width: 18, 
                        height: 18, 
                        borderRadius: '50%',
                        border: `2px solid ${isSelected ? '#fff' : '#dee2e6'}`,
                        background: isSelected ? '#fff' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected && (
                        <div style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: '#e74c3c',
                        }} />
                      )}
                    </div>
                  </div>
                );
              })}
              {!runners['1'] && !runners['2'] && !runners['3'] && (
                <div style={{ color: '#999', textAlign: 'center', padding: 16 }}>走者がいません</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddOutConfirm();
                }}
                disabled={!selectedOutRunner}
                style={{
                  padding: '8px 16px', 
                  background: '#e74c3c',
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 6, 
                  cursor: selectedOutRunner ? 'pointer' : 'not-allowed', 
                  fontWeight: 'bold',
                  opacity: selectedOutRunner ? 1 : 0.5,
                }}
              >
                確定
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddOutCancel();
                }}
                style={{ 
                  padding: '8px 16px', 
                  background: '#6c757d', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 6, 
                  cursor: 'pointer', 
                  fontWeight: 'bold' 
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </>
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
                onBaseClick={handleBaseClick} 
              />
            </div>

            {/* 追加: アウトを追加ボタン */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12, marginBottom: 12 }}>
              <button
                type="button"
                onClick={handleAddOutClick}
                style={{
                  padding: '10px 20px',
                  background: '#e74c3c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: 14,
                }}
              >
                アウトを追加
              </button>
            </div>

            {/* 選手選択オーバーレイは新規登録用途のため表示しません（selectedBaseを設定しない） */}

            <div style={{ marginTop: 0, paddingLeft: 12, paddingRight: 12 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: 12, color: '#495057' }}>現在のランナー</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {(['1','2','3'] as const).map(b => {
                  const pid = runners[b];
                  // 名前は offensePlayers から自動で取得
                  const player = offensePlayers.find(p => p.playerId === pid);
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