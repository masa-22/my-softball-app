import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import MiniScoreBoard from './common/MiniScoreBoard';
import MiniDiamondField from './pitch/MiniDiamondField';
import PitchTypeSelector, { PitchType } from './common/PitchTypeSelector';
import StrikeZoneGrid from './pitch/StrikeZoneGrid';
import PitchResultSelector from './pitch/PitchResultSelector';

import { getMatches } from '../../services/matchService';
import { getTeams } from '../../services/teamService';
import { getPlays } from '../../services/playService';

// --- 型定義 ---
interface PitchData {
  id: number;
  x: number;
  y: number;
  type: PitchType;
  order: number;
  result: 'swing' | 'looking' | 'ball' | 'inplay' | 'deadball';
}

// スタイル変更（タイトル削除・任意座標プロット対応）
const styles = {
  container: {
    fontFamily: '"Hiragino Kaku Gothic ProN", "Meiryo", sans-serif',
    padding: '0',
    maxWidth: '980px',
    margin: '0 auto',
  },
  mainLayout: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    width: '220px',
  },
  rightColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    maxWidth: '308px',
  },
  runnerDisplayGrid: {
    backgroundColor: '#fff',
    border: '1px solid #dee2e6',
    padding: '12px',
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    position: 'relative' as const,
    minHeight: '180px',
  },
  runnerTitle: {
    fontWeight: 600,
    fontSize: '13px',
    marginBottom: 8,
    color: '#495057',
  },
};

interface PitchCourseInputProps {
  onInplayCommit?: () => void;
  onStrikeoutCommit?: (isSwinging: boolean) => void;
  onWalkCommit?: () => void; // 追加: フォアボール・デッドボール時のコールバック
}

const PitchCourseInput: React.FC<PitchCourseInputProps> = ({ onInplayCommit, onStrikeoutCommit, onWalkCommit }) => {
  const { matchId } = useParams<{ matchId: string }>();
  const match = useMemo(() => (matchId ? getMatches().find(m => m.id === matchId) : null), [matchId]);

  // スコアボードのチーム名は略称（teamAbbr）
  const teamNames = useMemo(() => {
    if (!match) return { home: '先攻', away: '後攻' };
    const teams = getTeams();
    const home = teams.find(t => String(t.id) === String(match.homeTeamId));
    const away = teams.find(t => String(t.id) === String(match.awayTeamId));
    return { home: home?.teamAbbr || '先攻', away: away?.teamAbbr || '後攻' };
  }, [match]);

  // 現在イニング（playsから推定）
  const currentInningInfo = useMemo(() => {
    if (!matchId) return { inning: 1, halfLabel: '表' };
    const plays = getPlays(matchId);
    if (!plays.length) return { inning: 1, halfLabel: '表' };
    const last = plays[plays.length - 1];
    return { inning: last.inning, halfLabel: last.topOrBottom === 'top' ? '表' : '裏' };
  }, [matchId]);

  const [pitches, setPitches] = useState<PitchData[]>([]);
  const [selectedPitchType, setSelectedPitchType] = useState<PitchType>('rise');
  const [bso, setBso] = useState({ b: 0, s: 0, o: 0 });
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);
  const [pendingResult, setPendingResult] = useState<'swing' | 'looking' | 'ball' | 'inplay' | 'deadball' | ''>('');
  const [runners, setRunners] = useState<{ '1': string | null; '2': string | null; '3': string | null }>({
    '1': null, '2': null, '3': null,
  });

  const handleZoneClick = (x: number, y: number) => {
    setPendingPoint({ x, y });
    setPendingResult('');
  };

  const commitPitch = () => {
    if (!pendingPoint || !pendingResult) return;
    const newPitch: PitchData = {
      id: Date.now(),
      x: pendingPoint.x,
      y: pendingPoint.y,
      type: selectedPitchType,
      order: pitches.length + 1,
      result: pendingResult,
    };
    setPitches([...pitches, newPitch]);

    // 現在のカウントを取得
    const currentBalls = bso.b;
    const currentStrikes = bso.s;

    setBso(prev => {
      let { b, s, o } = prev;
      if (pendingResult === 'ball') b = Math.min(3, b + 1);
      else if (pendingResult === 'swing' || pendingResult === 'looking') s = Math.min(2, s + 1);
      else if (pendingResult === 'inplay') o = Math.min(2, o + 1);
      else if (pendingResult === 'deadball') b = 3;
      
      // デッドボールは即座にランナー動き入力画面へ
      if (pendingResult === 'deadball') {
        setTimeout(() => {
          if (onWalkCommit) {
            onWalkCommit();
          }
        }, 0);
        setPendingPoint(null);
        setPendingResult('');
        return prev; // カウントリセット前に遷移
      }

      // 4ボール目（3→4になる時）はフォアボールでランナー動き入力画面へ
      if (currentBalls === 3 && pendingResult === 'ball') {
        setTimeout(() => {
          if (onWalkCommit) {
            onWalkCommit();
          }
        }, 0);
        setPendingPoint(null);
        setPendingResult('');
        return prev; // カウントリセット前に遷移
      }
      
      // 3ストライク目（2→3になる時）のみ三振画面へ遷移
      if (currentStrikes === 2 && (pendingResult === 'swing' || pendingResult === 'looking')) {
        const isSwinging = pendingResult === 'swing';
        setTimeout(() => {
          if (onStrikeoutCommit) {
            onStrikeoutCommit(isSwinging);
          }
        }, 0);
      }
      
      return { b, s, o };
    });

    setPendingPoint(null);
    setPendingResult('');

    if (pendingResult === 'inplay' && onInplayCommit) {
      onInplayCommit();
    }
  };

  const getPitchTypeName = (type: PitchType): string => {
    const pitchTypesList: { type: PitchType; label: string }[] = [
      { type: 'rise', label: 'ライズ' },
      { type: 'drop', label: 'ドロップ' },
      { type: 'cut', label: 'カット' },
      { type: 'changeup', label: 'チェンジアップ' },
      { type: 'chenrai', label: 'チェンライ' },
      { type: 'slider', label: 'スライダー' },
      { type: 'unknown', label: '不明' },
    ];
    return pitchTypesList.find(p => p.type === type)?.label || '不明';
  };

  return (
    <div style={styles.container}>
      <div style={styles.mainLayout}>
        <div style={styles.leftColumn}>
          <MiniScoreBoard bso={bso} />
          <div style={styles.runnerDisplayGrid}>
            <div style={styles.runnerTitle}>ランナー状況</div>
            <MiniDiamondField runners={runners} />
          </div>
        </div>

        <div style={styles.rightColumn}>
          <StrikeZoneGrid pitches={pitches} onClickZone={handleZoneClick}>
            {pendingPoint && (
              <PitchResultSelector
                selectedPitchType={selectedPitchType}
                pitchTypeName={getPitchTypeName(selectedPitchType)}
                selectedResult={pendingResult}
                onSelectResult={setPendingResult}
                onCommit={commitPitch}
                onCancel={() => { setPendingPoint(null); setPendingResult(''); }}
              />
            )}
          </StrikeZoneGrid>

          <PitchTypeSelector 
            selectedType={selectedPitchType} 
            onSelect={setSelectedPitchType} 
          />
        </div>
      </div>
    </div>
  );
};

export default PitchCourseInput;