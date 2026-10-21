import React, { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../common/Modal';
import {
  buildMidGameStartPatch,
  type MidGameSlot,
  type MidGameSituation,
  type MidGameStartPatch,
} from '../../utils/midGameStart';
import { TIEBREAK_START_INNING } from '../../utils/tiebreak';

interface Props {
  open: boolean;
  homeSlots: MidGameSlot[];
  awaySlots: MidGameSlot[];
  homeLabels: Record<string, string>;
  awayLabels: Record<string, string>;
  onClose: () => void;
  onApply: (patch: MidGameStartPatch) => Promise<void>;
}

const emptyRunners = { '1': null, '2': null, '3': null } as MidGameSituation['runnerIds'];

const initialSituation = (): MidGameSituation => ({
  inning: 1,
  half: 'top',
  topScore: 0,
  bottomScore: 0,
  runsAlreadyThisHalf: 0,
  topRunsThisInning: 0,
  balls: 0,
  strikes: 0,
  outs: 0,
  runnerIds: { ...emptyRunners },
  offenseBattingOrder: 1,
  defenseBattingOrder: 1,
  tiebreakOnSecond: false,
});

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 13,
};

const MidGameStartModal: React.FC<Props> = ({
  open,
  homeSlots,
  awaySlots,
  homeLabels,
  awayLabels,
  onClose,
  onApply,
}) => {
  const [situation, setSituation] = useState<MidGameSituation>(initialSituation);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const next = initialSituation();
      next.offenseBattingOrder = homeSlots[0]?.battingOrder ?? 1;
      next.defenseBattingOrder = awaySlots[0]?.battingOrder ?? 1;
      setSituation(next);
      setError(null);
      setSaving(false);
    }
    wasOpenRef.current = open;
  }, [open, homeSlots, awaySlots]);

  const offenseSlots = situation.half === 'top' ? homeSlots : awaySlots;
  const defenseSlots = situation.half === 'top' ? awaySlots : homeSlots;
  const offenseLabels = situation.half === 'top' ? homeLabels : awayLabels;
  const batter = offenseSlots.find((slot) => slot.battingOrder === situation.offenseBattingOrder);

  const patchResult = useMemo(
    () => buildMidGameStartPatch(situation, homeSlots, awaySlots),
    [situation, homeSlots, awaySlots]
  );

  const setHalf = (half: 'top' | 'bottom') => {
    const offense = half === 'top' ? homeSlots : awaySlots;
    const defense = half === 'top' ? awaySlots : homeSlots;
    setSituation((prev) => ({
      ...prev,
      half,
      runnerIds: { ...emptyRunners },
      tiebreakOnSecond: false,
      offenseBattingOrder: offense[0]?.battingOrder ?? 1,
      defenseBattingOrder: defense[0]?.battingOrder ?? 1,
    }));
  };

  const setRunner = (base: '1' | '2' | '3', playerId: string) => {
    setSituation((prev) => ({
      ...prev,
      runnerIds: { ...prev.runnerIds, [base]: playerId || null },
    }));
  };

  const handleApply = async () => {
    if (!patchResult.ok || saving) {
      if (!patchResult.ok) setError(patchResult.message);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onApply(patchResult.patch);
    } catch (err) {
      console.error('Error applying mid-game start:', err);
      setError('状況の反映に失敗しました。');
      setSaving(false);
    }
  };

  const orderOptions = (slots: MidGameSlot[], labels: Record<string, string>) =>
    slots.map((slot) => (
      <option key={slot.playerId} value={slot.battingOrder}>
        {slot.battingOrder}番 {labels[slot.playerId] || slot.playerId}
      </option>
    ));

  const runnerOptions = (base: '1' | '2' | '3') => {
    const taken = new Set(
      (['1', '2', '3'] as const)
        .filter((other) => other !== base)
        .map((other) => situation.runnerIds[other])
        .filter((id): id is string => !!id)
    );
    return offenseSlots
      .filter((slot) => slot.playerId !== batter?.playerId && !taken.has(slot.playerId))
      .map((slot) => (
        <option key={slot.playerId} value={slot.playerId}>
          {slot.battingOrder}番 {offenseLabels[slot.playerId] || slot.playerId}
        </option>
      ));
  };

  return (
    <Modal isOpen={open} onClose={onClose} zIndex={2100}>
      <div style={{ width: 'min(520px, 86vw)', maxHeight: '80vh', overflowY: 'auto', paddingRight: 8 }}>
        <h2 style={{ margin: '0 28px 8px 0', fontSize: 18 }}>途中から入力</h2>
        <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.6, color: '#495057' }}>
          映像が途中からしかない試合用です。指定した時点の回数、得点、カウント、走者、打順から記録を始めます。
          それより前の打席は残らないため、通算の個人成績にはなりません。合計得点は指定した値になり、それ以前の回の欄は「-」です。
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={fieldStyle}>
            回
            <input
              type="number"
              min={1}
              value={situation.inning}
              onChange={(e) => setSituation((prev) => ({ ...prev, inning: Number(e.target.value) }))}
            />
          </label>
          <label style={fieldStyle}>
            表裏
            <select value={situation.half} onChange={(e) => setHalf(e.target.value as 'top' | 'bottom')}>
              <option value="top">表（先攻の攻撃）</option>
              <option value="bottom">裏（後攻の攻撃）</option>
            </select>
          </label>
          <label style={fieldStyle}>
            先攻の合計得点
            <input
              type="number"
              min={0}
              value={situation.topScore}
              onChange={(e) => setSituation((prev) => ({ ...prev, topScore: Number(e.target.value) }))}
            />
          </label>
          <label style={fieldStyle}>
            後攻の合計得点
            <input
              type="number"
              min={0}
              value={situation.bottomScore}
              onChange={(e) => setSituation((prev) => ({ ...prev, bottomScore: Number(e.target.value) }))}
            />
          </label>
          <label style={fieldStyle}>
            {situation.half === 'top' ? 'この回の表ですでに入っている得点' : 'この回の裏ですでに入っている得点'}
            <input
              type="number"
              min={0}
              value={situation.runsAlreadyThisHalf}
              onChange={(e) => setSituation((prev) => ({ ...prev, runsAlreadyThisHalf: Number(e.target.value) }))}
            />
          </label>
          {situation.half === 'bottom' && (
            <label style={fieldStyle}>
              この回の表の先攻得点
              <input
                type="number"
                min={0}
                value={situation.topRunsThisInning}
                onChange={(e) => setSituation((prev) => ({ ...prev, topRunsThisInning: Number(e.target.value) }))}
              />
            </label>
          )}
          <label style={fieldStyle}>
            ボール
            <input
              type="number"
              min={0}
              max={3}
              value={situation.balls}
              onChange={(e) => setSituation((prev) => ({ ...prev, balls: Number(e.target.value) }))}
            />
          </label>
          <label style={fieldStyle}>
            ストライク
            <input
              type="number"
              min={0}
              max={2}
              value={situation.strikes}
              onChange={(e) => setSituation((prev) => ({ ...prev, strikes: Number(e.target.value) }))}
            />
          </label>
          <label style={fieldStyle}>
            アウト
            <input
              type="number"
              min={0}
              max={2}
              value={situation.outs}
              onChange={(e) => setSituation((prev) => ({ ...prev, outs: Number(e.target.value) }))}
            />
          </label>
          <label style={fieldStyle}>
            今の打者
            <select
              value={situation.offenseBattingOrder}
              onChange={(e) => setSituation((prev) => ({
                ...prev,
                offenseBattingOrder: Number(e.target.value),
                runnerIds: { ...emptyRunners },
              }))}
            >
              {orderOptions(offenseSlots, offenseLabels)}
            </select>
          </label>
          <label style={fieldStyle}>
            相手の次回の打者
            <select
              value={situation.defenseBattingOrder}
              onChange={(e) => setSituation((prev) => ({ ...prev, defenseBattingOrder: Number(e.target.value) }))}
            >
              {orderOptions(defenseSlots, situation.half === 'top' ? awayLabels : homeLabels)}
            </select>
          </label>
          {(['1', '2', '3'] as const).map((base) => (
            <label key={base} style={fieldStyle}>
              {base === '1' ? '一塁' : base === '2' ? '二塁' : '三塁'}
              <select value={situation.runnerIds[base] ?? ''} onChange={(e) => setRunner(base, e.target.value)}>
                <option value="">なし</option>
                {runnerOptions(base)}
              </select>
            </label>
          ))}
        </div>
        {situation.inning >= TIEBREAK_START_INNING && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={situation.tiebreakOnSecond}
              onChange={(e) => setSituation((prev) => ({ ...prev, tiebreakOnSecond: e.target.checked }))}
            />
            二塁の走者はタイブレークの走者
          </label>
        )}
        {(error || !patchResult.ok) && (
          <p style={{ color: '#c92a2a', fontSize: 13, margin: '12px 0 0' }}>
            {error || patchResult.message}
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button type="button" onClick={onClose} disabled={saving}>閉じる</button>
          <button type="button" onClick={handleApply} disabled={saving || !patchResult.ok}>
            {saving ? '反映中...' : 'この状況から始める'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default MidGameStartModal;
