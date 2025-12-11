import React, { useState, useEffect, useMemo } from 'react';
import { getPitchersForSelection } from '../../../hooks/usePitcherStatsData';
import { getAtBats } from '../../../services/atBatService';
import { AtBat, PitchRecord } from '../../../types/AtBat';
import { PitchData } from '../../../types/PitchData';
import PitchChartView from './PitchChartView';
import { Player } from '../../../types/Player';

interface PitchChartModalProps {
  open: boolean;
  onClose: () => void;
  matchId: string;
}

const PitchChartModal: React.FC<PitchChartModalProps> = ({ open, onClose, matchId }) => {
  const [selectedPitcherId, setSelectedPitcherId] = useState<string | null>(null);
  const [pitchers, setPitchers] = useState<Array<{ playerId: string; player: Player | undefined }>>([]);
  const [atBats, setAtBats] = useState<AtBat[]>([]);
  const [loading, setLoading] = useState(false);

  // 登板した投手のリストを取得
  useEffect(() => {
    if (!open || !matchId) return;

    const loadPitchers = async () => {
      setLoading(true);
      try {
        const homePitchers = await getPitchersForSelection(matchId, 'home');
        const awayPitchers = await getPitchersForSelection(matchId, 'away');
        const allPitchers = [...homePitchers, ...awayPitchers];
        setPitchers(allPitchers);
        
        // 最初の投手を選択
        if (allPitchers.length > 0 && !selectedPitcherId) {
          setSelectedPitcherId(allPitchers[0].playerId);
        }
      } catch (error) {
        console.error('Error loading pitchers:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPitchers();
  }, [open, matchId]);

  // 投球データを取得
  useEffect(() => {
    if (!open || !matchId) return;

    const loadAtBats = async () => {
      try {
        const data = await getAtBats(matchId);
        setAtBats(data);
      } catch (error) {
        console.error('Error loading atBats:', error);
      }
    };

    loadAtBats();
  }, [open, matchId]);

  // 選択した投手の投球データを抽出
  const pitcherPitchData = useMemo(() => {
    if (!selectedPitcherId) return [];

    const pitcherAtBats = atBats.filter(
      (atBat) => atBat.type === 'bat' && atBat.pitcherId === selectedPitcherId
    );

    const pitchDataList: PitchData[] = [];
    let order = 1;

    pitcherAtBats.forEach((atBat) => {
      atBat.pitches.forEach((pitch: PitchRecord) => {
        // course (1-25) または x, y 座標から x, y を計算
        let x: number;
        let y: number;

        if (pitch.x !== undefined && pitch.y !== undefined) {
          // x, y が 0-100% で保存されている場合
          x = (pitch.x / 100) * 260; // BASE_WIDTH = 260
          y = (pitch.y / 100) * 325; // BASE_HEIGHT = 325
        } else if (pitch.course) {
          // course (1-25) から x, y を計算
          const course = pitch.course - 1; // 0-24に変換
          const row = Math.floor(course / 5);
          const col = course % 5;
          // セルの中心座標
          x = ((col + 0.5) / 5) * 260;
          y = ((row + 0.5) / 5) * 325;
        } else {
          // 座標が不明な場合はスキップ
          return;
        }

        pitchDataList.push({
          id: pitch.seq || order,
          x,
          y,
          type: pitch.type,
          order: order++,
          result: pitch.result,
        });
      });
    });

    return pitchDataList;
  }, [selectedPitcherId, atBats]);

  const selectedPitcher = pitchers.find((p) => p.playerId === selectedPitcherId);

  if (!open) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 2100,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '60px 16px',
    boxSizing: 'border-box',
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: '24px 24px 16px',
    maxWidth: 960,
    width: '100%',
    maxHeight: '100%',
    overflowY: 'auto',
    boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
  };

  const handleOverlayClick = () => onClose();
  const handleModalClick: React.MouseEventHandler<HTMLDivElement> = (e) => e.stopPropagation();

  return (
    <div style={overlayStyle} onClick={handleOverlayClick}>
      <div style={modalStyle} onClick={handleModalClick}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>投球チャート</div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: '#e9ecef',
              borderRadius: 20,
              padding: '6px 14px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            閉じる
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#495057' }}>読み込み中...</div>
        ) : (
          <>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14, color: '#495057' }}>
                投手を選択
              </label>
              <select
                value={selectedPitcherId || ''}
                onChange={(e) => setSelectedPitcherId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #dee2e6',
                  borderRadius: 8,
                  fontSize: 14,
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                }}
              >
                {pitchers.map((pitcher) => {
                  const name = pitcher.player
                    ? `${pitcher.player.familyName || ''} ${pitcher.player.givenName || ''}`.trim()
                    : '未登録';
                  return (
                    <option key={pitcher.playerId} value={pitcher.playerId}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedPitcherId && pitcherPitchData.length > 0 ? (
              <PitchChartView pitches={pitcherPitchData} />
            ) : selectedPitcherId ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#868e96' }}>
                この投手の投球データがありません。
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default PitchChartModal;

