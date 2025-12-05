/**
 * 1プレーの結果入力・表示用コンポーネント。
 * - 子コンポーネントとして親からのデータを表示し、操作時は親コールバックを呼ぶのみ
 */
import React, { useState, useMemo } from 'react';
import SafetyBuntDialog from './playresult/SafetyBuntDialog';
import PlayResultConfirmDialog from './playresult/PlayResultConfirmDialog';
import PlayResultForm from './playresult/PlayResultForm.tsx';
import GroundoutOutsDialog from './playresult/GroundoutOutsDialog';
import { POSITIONS } from '../../data/softball/positions';

import FirstBaseTouchDialog from './playresult/FirstBaseTouchDialog';
import PutoutPlayerDialog from './playresult/PutoutPlayerDialog';

interface PlayResultPanelProps {
  onComplete?: () => void;
  strikeoutType?: 'swinging' | 'looking' | null;
  // positionだけでなく詳細オブジェクトを渡すように変更
  onRunnerMovement?: (
    battingResult: string,
    details: { 
      position: string; 
      batType: string; 
      outfieldDirection: string;
      fieldingOptions?: {
        putoutPosition?: string;
        assistPosition?: string;
      };
    },
    outsAfterOverride?: number,
  ) => void;
  currentRunners?: { '1': string | null; '2': string | null; '3': string | null };
  currentOuts?: number;
}

type BattingResult =
  | 'single'
  | 'double'
  | 'triple'
  | 'homerun'
  | 'runninghomerun'
  | 'groundout'
  | 'flyout'
  | 'strikeout_swinging'
  | 'strikeout_looking'
  | 'droppedthird'
  | 'error'
  | 'sacrifice_bunt'
  | 'sacrifice_fly'
  | 'bunt_out'
  | '';

type FieldPosition = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '';
type OutfieldDirection = 'left' | 'left-center' | 'center' | 'right-center' | 'right' | '';

const PlayResultPanel: React.FC<PlayResultPanelProps> = ({ 
  onComplete, 
  strikeoutType, 
  onRunnerMovement,
  currentRunners = { '1': null, '2': null, '3': null },
  currentOuts = 0,
}) => {
  const [result, setResult] = useState<BattingResult>('');
  const [position, setPosition] = useState<FieldPosition>('');
  const [outfieldDirection, setOutfieldDirection] = useState<OutfieldDirection>('');
  const [batType, setBatType] = useState<string>('ground'); // 追加
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSafetyBuntDialog, setShowSafetyBuntDialog] = useState(false);
  const [isSafetyBunt, setIsSafetyBunt] = useState(false);
  const [showGroundoutOutsDialog, setShowGroundoutOutsDialog] = useState(false);
  
  // 追加: ファーストゴロ用ダイアログ状態
  const [showFirstBaseTouchDialog, setShowFirstBaseTouchDialog] = useState(false);
  const [showPutoutPlayerDialog, setShowPutoutPlayerDialog] = useState(false);
  const [pendingFieldingOptions, setPendingFieldingOptions] = useState<{ putoutPosition?: string; assistPosition?: string } | undefined>(undefined);

  const handleResultChange = (value: BattingResult) => {
    setResult(value);
    if (value === 'groundout') {
      setBatType('ground');
    } else if (value === 'flyout' || value === 'sacrifice_fly') {
      setBatType('fly');
    }
  };

  React.useEffect(() => {
    if (strikeoutType === 'swinging') {
      setResult('strikeout_swinging');
    } else if (strikeoutType === 'looking') {
      setResult('strikeout_looking');
    }
  }, [strikeoutType]);

  const canSelectSacrificeBunt = useMemo(() => {
    const hasRunnerNot3rd = currentRunners['1'] || currentRunners['2'];
    const isLessThan2Outs = currentOuts < 2;
    return hasRunnerNot3rd && isLessThan2Outs;
  }, [currentRunners, currentOuts]);

  const canSelectSacrificeFly = useMemo(() => {
    const hasRunner3rd = !!currentRunners['3'];
    const isLessThan2Outs = currentOuts < 2;
    return hasRunner3rd && isLessThan2Outs;
  }, [currentRunners, currentOuts]);

  const resultOptions: { value: BattingResult; label: string; disabled?: boolean }[] = strikeoutType
    ? [
        { value: strikeoutType === 'swinging' ? 'strikeout_swinging' : 'strikeout_looking', label: strikeoutType === 'swinging' ? '空振り三振' : '見逃し三振' },
        { value: 'droppedthird', label: '振り逃げ' },
      ]
    : [
        { value: 'single', label: 'ヒット（シングル）' },
        { value: 'double', label: 'ツーベースヒット' },
        { value: 'triple', label: 'スリーベースヒット' },
        { value: 'homerun', label: 'ホームラン' },
        { value: 'runninghomerun', label: 'ランニングホームラン' },
        { value: 'groundout', label: 'ゴロアウト' },
        { value: 'flyout', label: 'フライアウト' },
        { value: 'bunt_out', label: 'バント失敗' },
        { value: 'sacrifice_bunt', label: '犠打（バント）', disabled: !canSelectSacrificeBunt },
        { value: 'sacrifice_fly', label: '犠牲フライ', disabled: !canSelectSacrificeFly },
        { value: 'error', label: 'エラー' },
      ];

  const batTypeOptions = [
    { value: 'ground', label: 'ゴロ' },
    { value: 'fly', label: 'フライ/ライナー' },
    { value: 'bunt', label: 'バント' },
  ];

  const positionOptions = [
    { value: '1', label: '投手（P）' },
    { value: '2', label: '捕手（C）' },
    { value: '3', label: '一塁手（1B）' },
    { value: '4', label: '二塁手（2B）' },
    { value: '5', label: '三塁手（3B）' },
    { value: '6', label: '遊撃手（SS）' },
    { value: '7', label: '左翼手（LF）' },
    { value: '8', label: '中堅手（CF）' },
    { value: '9', label: '右翼手（RF）' },
  ];

  const outfieldDirectionOptions = [
    { value: 'left', label: 'レフト' },
    { value: 'left-center', label: '左中間' },
    { value: 'center', label: 'センター' },
    { value: 'right-center', label: '右中間' },
    { value: 'right', label: 'ライト' },
  ];

  const needsPosition = ['single', 'double', 'triple', 'groundout', 'flyout', 'droppedthird', 'error', 'sacrifice_bunt', 'sacrifice_fly', 'bunt_out'].includes(result);
  const needsOutfieldDirection = ['triple', 'homerun', 'runninghomerun', 'sacrifice_fly'].includes(result);
  const needsBatType = ['single', 'double', 'triple', 'error', 'sacrifice_bunt', 'bunt_out'].includes(result);

  const triggerRunnerMovement = (outsOverride?: number, fieldingOptionsOverride?: { putoutPosition?: string; assistPosition?: string }) => {
    if (!onRunnerMovement) return;
    onRunnerMovement(
      result,
      {
        position,
        batType,
        outfieldDirection,
        fieldingOptions: fieldingOptionsOverride || pendingFieldingOptions,
      },
      outsOverride,
    );
  };

  const handleSubmit = () => {
    if (!result) return;
    if (needsPosition && !position) return;
    if (needsOutfieldDirection && !outfieldDirection) return;
    if (needsBatType && !batType) return;

    if (result === 'single' && ['1', '2', '3', '5'].includes(position)) {
      setShowSafetyBuntDialog(true);
      return;
    }

    setShowConfirm(true);
  };

  const handleSafetyBuntResponse = (isBunt: boolean) => {
    setIsSafetyBunt(isBunt);
    setShowSafetyBuntDialog(false);
    setShowConfirm(true);
  };

  // ランナーチェック以降の処理を共通化
  const proceedWithRunnerCheck = (fieldingOptions?: { putoutPosition?: string; assistPosition?: string }) => {
    const isOutResult = result === 'groundout' || result === 'flyout' || result === 'bunt_out';
    const hasRunners = !!(currentRunners['1'] || currentRunners['2'] || currentRunners['3']);

    if (isOutResult && !hasRunners) {
      triggerRunnerMovement(undefined, fieldingOptions);
      return;
    }

    if (result === 'groundout' && hasRunners) {
      // fieldingOptionsがある場合はStateに保存しておく（ダイアログ後のcallbackで参照するため）
      if (fieldingOptions) {
        setPendingFieldingOptions(fieldingOptions);
      }
      setShowGroundoutOutsDialog(true);
      return;
    }

    triggerRunnerMovement(undefined, fieldingOptions);
  };

  const handleConfirm = () => {
    setShowConfirm(false);

    const isStrikeout = result === 'strikeout_swinging' || result === 'strikeout_looking';
    
    if (isStrikeout) {
      triggerRunnerMovement();
      return;
    }

    // ファーストゴロの場合の特別フロー (ランナーなしの場合のみ)
    // ランナーがいる場合は GroundoutOutsDialog が優先され、そちらで結果を扱う必要があるが、
    // 現状はランナーなしの打者アウト詳細として扱う。
    const hasRunners = !!(currentRunners['1'] || currentRunners['2'] || currentRunners['3']);
    if (result === 'groundout' && position === '3' && !hasRunners) {
      setShowFirstBaseTouchDialog(true);
      return;
    }

    proceedWithRunnerCheck();
  };

  // ファーストゴロ特別フローのハンドラ
  const handleFirstBaseTouchResponse = (touched: boolean) => {
    setShowFirstBaseTouchDialog(false);
    if (touched) {
      // ファーストが踏んだ -> 刺殺のみ
      proceedWithRunnerCheck({ putoutPosition: '3' });
    } else {
      // 踏んでない -> 誰が捕ったか聞く
      setShowPutoutPlayerDialog(true);
    }
  };

  const handlePutoutPlayerSelect = (selectedPosition: string) => {
    setShowPutoutPlayerDialog(false);
    // 刺殺: 選択された選手, 補殺: ファースト('3')
    proceedWithRunnerCheck({ putoutPosition: selectedPosition, assistPosition: '3' });
  };
  
  const handlePutoutPlayerCancel = () => {
    setShowPutoutPlayerDialog(false);
    // キャンセル時はとりあえずデフォルト挙動に戻すか、処理を中断するか。
    // ここでは中断せず、デフォルト（補殺なしなど）で進めるか、再選択を促すか。
    // とりあえずキャンセル＝完了とみなして、オプションなしで進める（既存挙動と同じになる）
    proceedWithRunnerCheck();
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
  };

  const getResultLabel = () => {
    const option = resultOptions.find(opt => opt.value === result);
    let label = option ? option.label : '';
    if (result === 'single' && isSafetyBunt) label += '（セーフティバント）';
    if (['groundout', 'flyout'].includes(result) && position) {
      const short = POSITIONS[position]?.shortName || getPositionLabel();
      if (short) {
        label = `${short}${result === 'groundout' ? 'ゴロ' : '飛'}`;
      }
    }
    return label;
  };

  const getPositionLabel = () => {
    if (!position) return '';
    const option = positionOptions.find(opt => opt.value === position);
    return option ? option.label : '';
  };

  const getOutfieldDirectionLabel = () => {
    if (!outfieldDirection) return '';
    const option = outfieldDirectionOptions.find(opt => opt.value === outfieldDirection);
    return option ? option.label : '';
  };

  const isFormValid = result && (!needsPosition || position) && (!needsOutfieldDirection || outfieldDirection) && (!needsBatType || batType);

  // セーフティバント確認ダイアログ
  if (showSafetyBuntDialog) {
    return (
      <SafetyBuntDialog
        positionLabel={getPositionLabel()}
        onResponse={handleSafetyBuntResponse}
      />
    );
  }
  if (showGroundoutOutsDialog) {
    return (
      <GroundoutOutsDialog
        initialOuts={currentOuts}
        onConfirm={(outs) => {
          setShowGroundoutOutsDialog(false);
          triggerRunnerMovement(outs);
        }}
        onCancel={() => {
          setShowGroundoutOutsDialog(false);
        }}
      />
    );
  }

  if (showFirstBaseTouchDialog) {
    return (
      <FirstBaseTouchDialog
        onResponse={handleFirstBaseTouchResponse}
      />
    );
  }

  if (showPutoutPlayerDialog) {
    return (
      <PutoutPlayerDialog
        onSelect={handlePutoutPlayerSelect}
        onCancel={handlePutoutPlayerCancel}
      />
    );
  }

  // 確認画面表示
  if (showConfirm) {
    return (
      <PlayResultConfirmDialog
        strikeoutType={strikeoutType}
        resultLabel={getResultLabel()}
        positionLabel={getPositionLabel()}
        outfieldDirectionLabel={getOutfieldDirectionLabel()}
        needsPosition={needsPosition}
        needsOutfieldDirection={needsOutfieldDirection}
        onCancel={handleCancelConfirm}
        onConfirm={handleConfirm}
      />
    );
  }

  return (
    <PlayResultForm
      strikeoutType={strikeoutType}
      result={result}
      setResult={(v: string) => handleResultChange(v as BattingResult)}
      resultOptions={resultOptions}
      position={position}
      setPosition={(v: string) => setPosition(v as FieldPosition)}
      positionOptions={positionOptions}
      outfieldDirection={outfieldDirection}
      setOutfieldDirection={(v: string) => setOutfieldDirection(v as OutfieldDirection)}
      outfieldDirectionOptions={outfieldDirectionOptions}
      batType={batType}
      setBatType={setBatType}
      batTypeOptions={batTypeOptions}
      needsPosition={needsPosition}
      needsOutfieldDirection={needsOutfieldDirection}
      needsBatType={needsBatType}
      isFormValid={!!isFormValid}
      onSubmit={handleSubmit}
      onCancel={onComplete}
    />
  );
};

export default PlayResultPanel;
