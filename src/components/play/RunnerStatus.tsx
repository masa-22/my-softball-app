/**
 * ランナー状況入力コンポーネント（子化）
 * - 親（PlayRegister）から状態とイベントを受け取り、UI表示と通知のみ行う
 */
import React from 'react';
import AdvanceReasonDialog, { RunnerAdvancement, AdvanceReasonResult } from './runner/AdvanceReasonDialog';
import OutReasonDialog, { RunnerOut, OutReasonResult } from './runner/OutReasonDialog';
import RunnerStatusSidebar from './runner/RunnerStatusSidebar';
import RunnerFieldPanel from './runner/RunnerFieldPanel';
import AddOutDialog from './runner/AddOutDialog.tsx';

type BaseKey = '1' | '2' | '3' | 'home';

interface RunnerStatusProps {
  // 表示用
  bso: { b: number; s: number; o: number };
  runners: { '1': string | null; '2': string | null; '3': string | null };
  offensePlayers: any[];

  // UIラベル/名前解決（親から提供）
  baseLabel: (b: BaseKey) => string;
  getRunnerName: (playerId: string | null) => string;

  // フィールド操作イベント（親へ通知）
  onBaseClick: (base: BaseKey) => void;
  onAddOutClick: () => void;

  // 進塁理由ダイアログ（親制御）
  showAdvanceDialog: boolean;
  pendingAdvancements: RunnerAdvancement[];
  onAdvanceConfirm: (results: AdvanceReasonResult[]) => void;

  // アウト理由ダイアログ（親制御）
  showOutDialog: boolean;
  pendingOuts: RunnerOut[];
  onOutConfirm: (results: OutReasonResult[]) => void;

  // ダイアログ共通キャンセル
  onDialogCancel: () => void;

  // アウト追加ダイアログ（親制御）
  showAddOutDialog: boolean;
  selectedOutRunner: { runnerId: string; fromBase: '1' | '2' | '3' } | null;
  onSelectOutRunner: (runnerId: string, fromBase: '1' | '2' | '3') => void;
  onAddOutConfirm: () => void;
  onAddOutCancel: () => void;
}

const styles = {
  container: {
    fontFamily: '"Hiragino Kaku Gothic ProN", "Meiryo", sans-serif',
    padding: '0',
    maxWidth: '980px',
    margin: '0 auto',
  },
  mainLayout: { display: 'flex', gap: '16px', alignItems: 'flex-start' },
  rightColumn: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' },
  fieldPanel: {
    width: '100%',
    maxWidth: '500px',
    minHeight: 'auto',
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #dee2e6',
    position: 'relative' as const,
    padding: '16px',
    paddingBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
};

const RunnerStatus: React.FC<RunnerStatusProps> = ({
  bso,
  runners,
  offensePlayers,
  baseLabel,
  getRunnerName,
  onBaseClick,
  onAddOutClick,
  showAdvanceDialog,
  pendingAdvancements,
  onAdvanceConfirm,
  showOutDialog,
  pendingOuts,
  onOutConfirm,
  onDialogCancel,
  showAddOutDialog,
  selectedOutRunner,
  onSelectOutRunner,
  onAddOutConfirm,
  onAddOutCancel,
}) => {
  return (
    <div style={styles.container}>
      {/* 進塁理由ダイアログ（親制御） */}
      {showAdvanceDialog && (
        <AdvanceReasonDialog
          advancements={pendingAdvancements}
          context="pitch"
          onConfirm={onAdvanceConfirm}
          onCancel={onDialogCancel}
        />
      )}

      {/* アウト理由ダイアログ（親制御） */}
      {showOutDialog && (
        <OutReasonDialog
          outs={pendingOuts}
          context="pitch"
          onConfirm={onOutConfirm}
          onCancel={onDialogCancel}
        />
      )}

      {/* アウト追加ダイアログ（親制御） */}
      {showAddOutDialog && (
        <AddOutDialog
          runners={runners}
          baseLabel={baseLabel}
          getRunnerName={getRunnerName}
          selected={selectedOutRunner}
          onSelect={onSelectOutRunner}
          onConfirm={onAddOutConfirm}
          onCancel={onAddOutCancel}
        />
      )}

      <div style={styles.mainLayout}>
        {/* 左カラム（サイドバー） */}
        <RunnerStatusSidebar bso={bso} />

        {/* 右カラム（フィールド＋ランナー一覧＋アウト追加ボタン） */}
        <div style={styles.rightColumn}>
          <RunnerFieldPanel
            styles={styles}
            runners={runners}
            offensePlayers={offensePlayers}
            onBaseClick={onBaseClick}
            onAddOutClick={onAddOutClick}
          />
        </div>
      </div>
    </div>
  );
};

export default RunnerStatus;