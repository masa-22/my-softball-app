import { AtBatResult, BatType, FieldingAction, RunnerEvent, BaseType } from '../types/AtBat';

/**
 * 守備記録（刺殺・捕殺）を計算する
 * 
 * @param result 打席結果 (single, double, groundout, etc.)
 * @param batType 打球タイプ (ground, fly, bunt)
 * @param fieldedBy 打球処理選手 (1-9)
 * @param runnerOuts ランナーアウト情報
 */
export const calculateFieldingActions = (
  result: string,
  batType: BatType | null,
  fieldedBy: string | undefined,
  runnerOuts: RunnerEvent[] = []
): FieldingAction[] => {
  const actions: FieldingAction[] = [];

  // 打球処理選手が指定されていない場合、三振や四死球以外では記録不能だが、
  // 一部のケース（ホームランなど）は守備機会なしとして扱う
  
  // 1. 三振: キャッチャーに刺殺
  if (result === 'strikeout_swinging' || result === 'strikeout_looking' || result === 'droppedthird') {
    // 振り逃げの場合も一旦キャッチャー刺殺で記録（成立時のみ）
    // ※振り逃げ成功時はoutにならず、失敗時はputoutになるが、
    //   この関数は「アウトになった場合」の処理を想定するか、あるいは「AtBatResult」全体から判断する必要がある。
    //   現状、result文字列が 'strikeout...' ならアウト扱いとする（振り逃げ出塁は別のresultになる想定、またはresultはstrikeoutだがRunnerEventでセーフ判定？）
    //   一旦、単純な三振としてキャッチャー刺殺を記録
    actions.push({
      playerId: '', // 呼び出し元で埋める必要があるが、ポジションで特定
      position: '2',
      action: 'putout',
      quality: 'clean'
    });
    return actions;
  }

  // 四死球は守備記録なし
  if (['walk', 'deadball'].includes(result)) {
    return [];
  }

  // 以下、インプレー打球

  // 2. 打球処理（fielded）
  if (fieldedBy) {
    actions.push({
      playerId: '', 
      position: fieldedBy,
      action: 'fielded',
      quality: 'clean'
    });
  }

  // 3. バッターアウトの処理
  // resultがアウト系の場合
  const isBatterOut = [
    'groundout', 'flyout', 'bunt_out', 'sac_bunt', 'sac_fly', 'interference'
  ].includes(result);

  if (isBatterOut && fieldedBy) {
    if (batType === 'fly') {
      // フライ/ライナー: 捕球した選手に刺殺
      actions.push({
        playerId: '',
        position: fieldedBy,
        action: 'putout',
        quality: 'clean'
      });
    } else if (batType === 'ground' || batType === 'bunt') {
      // ゴロ/バント: 捕球した選手に捕殺 -> 一塁手に刺殺
      // ただし、自らベースを踏んだ場合（fieldedBy === '3'）は刺殺のみ？
      // 一般的な「一塁送球」をデフォルトとする
      
      // 一塁手が自分で捕って自分で踏んだ場合(3-UA)
      if (fieldedBy === '3') {
        // 簡易的に刺殺のみ記録（詳細なタッチプレイなどは区別困難なため）
        actions.push({
          playerId: '',
          position: '3',
          action: 'putout',
          quality: 'clean'
        });
      } else {
        // 送球によるアウト (例: 6-3)
        actions.push({
          playerId: '',
          position: fieldedBy,
          action: 'assist',
          quality: 'clean'
        });
        actions.push({
          playerId: '',
          position: '3', // First Base
          action: 'putout',
          quality: 'clean'
        });
      }
    }
  }

  // 4. ランナーアウトの処理
  // runnerOutsには、そのプレーで発生したランナーのアウトイベントが含まれる
  // 各イベントの `outDetail` (送球者、捕球者) を見て記録する
  runnerOuts.forEach(event => {
    if (!event.isOut || !event.outDetail) return;
    
    const { threwPosition, caughtPosition } = event.outDetail;

    // 送球者がいれば捕殺
    if (threwPosition) {
      actions.push({
        playerId: '',
        position: threwPosition,
        action: 'assist',
        quality: 'clean'
      });
    }

    // 捕球者がいれば刺殺
    if (caughtPosition) {
      actions.push({
        playerId: '',
        position: caughtPosition,
        action: 'putout',
        quality: 'clean'
      });
    }
  });

  return actions;
};

