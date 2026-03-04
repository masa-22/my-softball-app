/**
 * ランナーの動き入力コンポーネント（レイアウト）
 * 状態・ロジックは useRunnerMovement に委譲
 */
import React from 'react';
import DiamondField from './runner/DiamondField';
import AdvanceReasonDialog from './runner/AdvanceReasonDialog';
import OutReasonDialog from './runner/OutReasonDialog';
import FinalConfirmDialog from './runner/FinalConfirmDialog';
import RunnerSelectDialog from './runner/RunnerSelectDialog.tsx';
import OutRunnersSelectionDialog from './runner/OutRunnersSelectionDialog';
import { useRunnerMovement } from '../../hooks/useRunnerMovement';
import type { RunnerMovementInputProps } from './RunnerMovementInput.types';

export type { RunnerMovementResult, AdvanceErrorDetail } from './RunnerMovementInput.types';

const styles = {
  container: {
    padding: 20,
    background: '#fff',
    border: '1px solid #dee2e6',
    borderRadius: 8,
    maxWidth: 980,
    margin: '0 auto' as const,
  },
  title: {
    marginBottom: 20,
    fontSize: 18,
    fontWeight: 600 as const,
    color: '#212529',
    textAlign: 'center' as const,
  },
  mainLayout: {
    display: 'flex' as const,
    gap: 24,
    marginBottom: 24,
  },
  fieldSection: { flex: 1 },
  fieldTitle: {
    fontSize: 14,
    fontWeight: 600 as const,
    marginBottom: 12,
    color: '#495057',
    textAlign: 'center' as const,
  },
  fieldWrapper: {
    width: '100%',
    maxWidth: 380,
    margin: '0 auto' as const,
    position: 'relative' as const,
  },
  fieldContainer: (isReadOnly: boolean) => ({
    border: `2px solid ${isReadOnly ? '#dee2e6' : '#4c6ef5'}`,
    borderRadius: 8,
    padding: 12,
    background: isReadOnly ? '#f8f9fa' : '#fff',
    opacity: isReadOnly ? 0.7 : 1,
  }),
  runnerList: { marginTop: 12, fontSize: 12 },
  runnerItem: {
    padding: '6px 8px',
    marginBottom: 4,
    background: '#e7f5ff',
    borderRadius: 4,
    display: 'flex' as const,
    justifyContent: 'space-between',
  },
  buttonContainer: { display: 'flex' as const, gap: 12, justifyContent: 'center' as const },
  button: (variant: 'cancel' | 'complete') => ({
    padding: '10px 24px',
    background: variant === 'cancel' ? '#e74c3c' : '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer' as const,
    fontWeight: 600 as const,
    fontSize: 14,
  }),
  outsSection: { marginBottom: 20, padding: 12, background: '#f8f9fa', borderRadius: 8, textAlign: 'center' as const },
  outsTitle: { fontSize: 14, fontWeight: 600 as const, marginBottom: 8, color: '#495057' },
  outsButtons: { display: 'flex' as const, gap: 8, justifyContent: 'center' as const },
  outButton: (isActive: boolean) => ({
    padding: '8px 16px',
    background: isActive ? '#e74c3c' : '#fff',
    color: isActive ? '#fff' : '#495057',
    border: `2px solid ${isActive ? '#e74c3c' : '#dee2e6'}`,
    borderRadius: 6,
    cursor: 'pointer' as const,
    fontWeight: 600 as const,
    fontSize: 14,
  }),
  scoreSection: { marginBottom: 20, padding: 12, background: '#e7f5ff', borderRadius: 8 },
  scoreTitle: { fontSize: 14, fontWeight: 600 as const, marginBottom: 8, color: '#1c7ed6' },
  scoreList: { display: 'flex' as const, flexDirection: 'column' as const, gap: 4 },
  scoreItem: { padding: '6px 8px', background: '#fff', borderRadius: 4, fontSize: 13 },
  outDetailSection: { marginBottom: 20, padding: 12, background: '#fff3cd', borderRadius: 8 },
  outDetailTitle: { fontSize: 14, fontWeight: 600 as const, marginBottom: 12, color: '#856404', textAlign: 'center' as const },
  confirmDialog: {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#fff',
    padding: 24,
    borderRadius: 12,
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
    zIndex: 1000,
    minWidth: 400,
  },
  confirmOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 999,
  },
  confirmTitle: { fontSize: 16, fontWeight: 600 as const, marginBottom: 16, color: '#212529' },
  confirmList: { marginBottom: 16, padding: 12, background: '#f8f9fa', borderRadius: 8 },
  confirmButtons: { display: 'flex' as const, gap: 12, justifyContent: 'center' as const },
};

const RunnerMovementInput: React.FC<RunnerMovementInputProps> = (props) => {
  const hook = useRunnerMovement(props);
  const {
    beforeRunners,
    afterRunners,
    initialOuts,
    outsAfter,
    setOutsAfter,
    scoredRunners,
    outDetails,
    needOutDetails,
    outsIncreased,
    outDetailsLocked,
    selectedOutRunners,
    showFinalConfirm,
    showRunnerSelectDialog,
    selectedTargetBase,
    candidateRunners,
    selectedRunnerId,
    setSelectedRunnerId,
    showAdvanceDialog,
    pendingAdvancements,
    showOutDialog,
    pendingOuts,
    showOutRunnerDialog,
    showScoreConfirm,
    pendingScores,
    battingResult,
    battingResultLabel,
    positionOptions,
    baseOptions,
    outDetailMap,
    outRunnerPresetSelections,
    possibleOutRunners,
    getPlayerName,
    getRunnerDisplayName,
    getPositionLabelByValue,
    handleAfterBaseClick,
    handleCompleteClick,
    handleFinalConfirm,
    handleFinalCancel,
    handleAdvanceConfirm,
    handleOutConfirm,
    handleDialogCancel,
    handleConfirmScores,
    handleCancelScores,
    handleOpenOutSelection,
    handleOutRunnerDialogCancel,
    handleOutRunnerDialogConfirm,
    handleRunnerSelectConfirm,
    handleRunnerSelectCancel,
    onCancel,
  } = hook;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>ランナーの動き入力</h3>

      {showFinalConfirm && (
        <>
          <FinalConfirmDialog
            initialOuts={initialOuts}
            outsAfter={outsAfter}
            scoredRunners={scoredRunners}
            beforeRunners={beforeRunners}
            afterRunners={afterRunners}
            getPlayerName={getPlayerName}
            needOutDetails={needOutDetails}
            outDetails={outDetails}
            positionOptions={positionOptions}
            baseOptions={baseOptions}
            battingResult={battingResult}
            onCancel={handleFinalCancel}
            onConfirm={handleFinalConfirm}
          />
        </>
      )}

      {showRunnerSelectDialog && (
        <RunnerSelectDialog
          selectedTargetBase={selectedTargetBase}
          candidates={candidateRunners}
          selectedRunnerId={selectedRunnerId}
          setSelectedRunnerId={setSelectedRunnerId}
          onCancel={handleRunnerSelectCancel}
          onConfirm={handleRunnerSelectConfirm}
        />
      )}

      {showAdvanceDialog && (
        <AdvanceReasonDialog
          advancements={pendingAdvancements}
          context="batting"
          onConfirm={handleAdvanceConfirm}
          onCancel={handleDialogCancel}
        />
      )}

      {showOutDialog && (
        <OutReasonDialog outs={pendingOuts} context="batting" onConfirm={handleOutConfirm} onCancel={handleDialogCancel} />
      )}

      {showOutRunnerDialog && needOutDetails && (
        <OutRunnersSelectionDialog
          outsNeeded={outsIncreased}
          candidates={possibleOutRunners}
          baseOptions={baseOptions}
          positionOptions={positionOptions}
          battingResultLabel={battingResultLabel}
          presetSelections={outRunnerPresetSelections}
          onConfirm={handleOutRunnerDialogConfirm}
          onCancel={handleOutRunnerDialogCancel}
        />
      )}

      {showScoreConfirm && (
        <>
          <div style={styles.confirmOverlay} onClick={handleCancelScores} />
          <div style={styles.confirmDialog}>
            <div style={styles.confirmTitle}>以下のランナーの得点を記録しますか？</div>
            <div style={styles.confirmList}>
              {pendingScores.map((playerId, idx) => (
                <div
                  key={idx}
                  style={{ padding: '6px 0', borderBottom: idx < pendingScores.length - 1 ? '1px solid #dee2e6' : 'none' }}
                >
                  {getPlayerName(playerId)}
                </div>
              ))}
            </div>
            <div style={styles.confirmButtons}>
              <button type="button" onClick={handleCancelScores} style={{ ...styles.button('cancel'), padding: '8px 20px' }}>
                いいえ
              </button>
              <button type="button" onClick={handleConfirmScores} style={{ ...styles.button('complete'), padding: '8px 20px' }}>
                はい
              </button>
            </div>
          </div>
        </>
      )}

      <div style={styles.outsSection}>
        <div style={styles.outsTitle}>アウトカウント（イベント後）</div>
        <div style={styles.outsButtons}>
          {[0, 1, 2, 3].map((count) => {
            const isDisabled = count < initialOuts;
            return (
              <button
                key={count}
                type="button"
                onClick={() => !isDisabled && setOutsAfter(count)}
                disabled={isDisabled}
                style={{
                  ...styles.outButton(outsAfter === count),
                  opacity: isDisabled ? 0.4 : 1,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                }}
              >
                {count}アウト
              </button>
            );
          })}
        </div>
      </div>

      {scoredRunners.length > 0 && (
        <div style={styles.scoreSection}>
          <div style={styles.scoreTitle}>得点 ({scoredRunners.length}点)</div>
          <div style={styles.scoreList}>
            {scoredRunners.map((e, idx) => (
              <div key={idx} style={styles.scoreItem}>
                {getPlayerName(e.runnerId)}
              </div>
            ))}
          </div>
        </div>
      )}

      {needOutDetails && (
        <div style={styles.outDetailSection}>
          <div style={styles.outDetailTitle}>アウト詳細を入力 ({outsIncreased}個のアウト)</div>
          <div style={{ fontSize: 13, color: '#495057', marginBottom: 8 }}>打撃結果: {battingResultLabel}</div>
          {outDetailsLocked ? (
            <>
              {selectedOutRunners.map((selection, idx) => {
                const detail = outDetailMap[selection.runnerId];
                return (
                  <div
                    key={`${selection.runnerId}-${idx}`}
                    style={{ marginBottom: 12, padding: 12, border: '1px solid #ffe8a1', borderRadius: 8, background: '#fff8e1' }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      アウト {idx + 1}: {getRunnerDisplayName(selection.runnerId)} （
                      {selection.fromBase === 'home' ? '打者' : baseOptions.find((b) => b.value === selection.fromBase)?.label} →{' '}
                      {baseOptions.find((b) => b.value === selection.outAtBase)?.label}）
                    </div>
                    <div style={{ fontSize: 13, color: '#495057' }}>
                      {detail?.threwPosition ? <>送球: {getPositionLabelByValue(detail.threwPosition)} / </> : null}
                      捕球: {getPositionLabelByValue(detail?.caughtPosition || '')}
                      {!detail?.threwPosition && ' （刺殺のみ）'}
                    </div>
                  </div>
                );
              })}
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <button type="button" onClick={handleOpenOutSelection} style={{ ...styles.button('complete'), background: '#4c6ef5' }}>
                  アウト詳細を再入力
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: 12, background: '#f8f9fa', borderRadius: 8, fontSize: 13, color: '#495057' }}>
              アウト数を増やすと、アウトになった走者と理由を入力するダイアログが開きます。
            </div>
          )}
        </div>
      )}

      <div style={styles.mainLayout}>
        <div style={styles.fieldSection}>
          <div style={styles.fieldTitle}>プレー前（{initialOuts}アウト）</div>
          <div style={styles.fieldWrapper}>
            <div style={styles.fieldContainer(true)}>
              <DiamondField runners={beforeRunners} selectedBase={null} onBaseClick={() => {}} />
            </div>
            <div style={styles.runnerList}>
              {(['1', '2', '3'] as const).map((base) => {
                const playerId = beforeRunners[base];
                if (!playerId) return null;
                return (
                  <div key={base} style={styles.runnerItem}>
                    <span>{base === '1' ? '一塁' : base === '2' ? '二塁' : '三塁'}</span>
                    <span>{getPlayerName(playerId)}</span>
                  </div>
                );
              })}
              {!beforeRunners['1'] && !beforeRunners['2'] && !beforeRunners['3'] && (
                <div style={{ textAlign: 'center', color: '#6c757d', padding: 8 }}>ランナーなし</div>
              )}
            </div>
          </div>
        </div>

        <div style={styles.fieldSection}>
          <div style={styles.fieldTitle}>プレー後</div>
          <div style={styles.fieldWrapper}>
            <div style={styles.fieldContainer(false)}>
              <DiamondField runners={afterRunners} selectedBase={hook.selectedBase} onBaseClick={handleAfterBaseClick} />
            </div>
            <div style={styles.runnerList}>
              {scoredRunners.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#1c7ed6', marginBottom: 4 }}>
                    得点 ({scoredRunners.length})
                  </div>
                  {scoredRunners.map((e, idx) => (
                    <div key={`score-${idx}`} style={{ ...styles.runnerItem, background: '#d1ecf1' }}>
                      <span>ホーム</span>
                      <span>{getPlayerName(e.runnerId)}</span>
                    </div>
                  ))}
                </div>
              )}
              {(['1', '2', '3'] as const).map((base) => {
                const playerId = afterRunners[base];
                if (!playerId) return null;
                return (
                  <div key={base} style={styles.runnerItem}>
                    <span>{base === '1' ? '一塁' : base === '2' ? '二塁' : '三塁'}</span>
                    <span>{getPlayerName(playerId)}</span>
                  </div>
                );
              })}
              {!afterRunners['1'] && !afterRunners['2'] && !afterRunners['3'] && scoredRunners.length === 0 && (
                <div style={{ textAlign: 'center', color: '#6c757d', padding: 8 }}>ランナーなし</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.buttonContainer}>
        <button type="button" onClick={() => onCancel?.()} style={styles.button('cancel')}>
          キャンセル
        </button>
        <button type="button" onClick={handleCompleteClick} style={styles.button('complete')}>
          完了
        </button>
      </div>
    </div>
  );
};

export default RunnerMovementInput;
