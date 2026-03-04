import { AtBat, normalizeScoredRunners } from '../../types/AtBat';
import { BATTING_RESULTS } from '../../data/softball/battingResults';
import { POSITIONS } from '../../data/softball/positions';

/** 外野方向コード → リプレイ用表示（レフト・右中間・センター・左中間・ライト） */
const REPLAY_DIRECTION_LABELS: Record<string, string> = {
  left: 'レフト',
  'left-center': '左中間',
  center: 'センター',
  'right-center': '右中間',
  right: 'ライト',
  '7': 'レフト',
  '8': 'センター',
  '9': 'ライト',
};

/** タイムリー用の打撃結果短縮名 */
const TIMELY_HIT_SHORT_NAMES: Record<string, string> = {
  single: 'ヒット',
  double: 'ツーベース',
  triple: 'スリーベース',
  homerun: 'ホームラン',
  runninghomerun: 'ランニングホームラン',
};

const HIT_TYPES = new Set(['single', 'double', 'triple', 'homerun', 'runninghomerun']);
const SAC_FLY_TYPES = new Set(['sac_fly', 'sacrifice_fly']);
const FORCE_IN_TYPES = new Set(['walk', 'deadball']);

export const useReplayCardLogic = (atBat: AtBat) => {
  const resultDef = atBat.result?.type ? BATTING_RESULTS[atBat.result.type] : null;
  const resultName = resultDef ? resultDef.name : '不明';
  const isHit = resultDef?.stats.isHit || false;

  // Format inning
  const inningStr = `${atBat.inning}回${atBat.topOrBottom === 'top' ? '表' : '裏'}`;

  // Format count
  const { balls: b, strikes: s, outs: o } = atBat.situationBefore;

  // Pitch type name helper
  const getPitchTypeName = (type: string) => {
    const map: Record<string, string> = {
        rise: 'ライズ',
        drop: 'ドロップ',
        cut: 'カット',
        changeup: 'チェンジアップ',
        chenrai: 'チェンライ',
        slider: 'スライダー',
        unknown: '不明',
    };
    return map[type] || type;
  };

  /** 打球方向・守備位置の表示名を取得（外野はレフト/右中間/センター/左中間/ライトに統一） */
  const getDirectionLabel = (dirOrPos?: string) => {
    if (!dirOrPos) return '';
    if (REPLAY_DIRECTION_LABELS[dirOrPos]) return REPLAY_DIRECTION_LABELS[dirOrPos];
    const pos = POSITIONS[dirOrPos as keyof typeof POSITIONS];
    return pos ? pos.name : dirOrPos;
  };

  // 結果詳細文の生成
  const generateResultDescription = () => {
    if (!atBat.result?.type) return '';

    const directionLabel = getDirectionLabel(atBat.playDetails?.direction);
    const directionText = directionLabel ? `${directionLabel}への` : '';
    
    // 三振の場合
    if (atBat.result.type.startsWith('strikeout')) {
        const hasRunnerMovement = JSON.stringify(atBat.situationBefore.runners) !== JSON.stringify(atBat.situationAfter.runners);
        if (!hasRunnerMovement && normalizeScoredRunners(atBat.scoredRunners).length === 0) {
            return '';
        }
    }

    const scored = normalizeScoredRunners(atBat.scoredRunners);
    const rbiCount = scored.filter((e) => e.isRBI).length;
    const isForceIn = FORCE_IN_TYPES.has(atBat.result.type);
    const isSacFly = SAC_FLY_TYPES.has(atBat.result.type);
    const isTimelyHit = HIT_TYPES.has(atBat.result.type) && rbiCount > 0;
    const timelyShortName = atBat.result.type ? TIMELY_HIT_SHORT_NAMES[atBat.result.type] : '';

    // メインの結果テキスト（タイムリーの場合は専用表現）
    let mainResultText: string;
    if (isTimelyHit && timelyShortName) {
      mainResultText = `${rbiCount}点タイムリー${timelyShortName}`;
    } else {
      mainResultText = resultName;
    }

    let text = `${directionText}${mainResultText}`;

    // ランナーの動き（得点・進塁・アウト）
    const movements: string[] = [];
    let forceInAdded = false; // 押し出しは1回だけ表示
    (['1', '2', '3'] as const).forEach(base => {
        const runnerId = atBat.situationBefore.runners[base];
        if (runnerId) {
            const scoredEntry = scored.find((e) => e.runnerId === runnerId);
            if (scoredEntry) {
                if (isForceIn && !forceInAdded) {
                  movements.push('押し出しにより得点');
                  forceInAdded = true;
                } else if (isSacFly) {
                  movements.push(`${base}塁ランナーがタッチアップで生還`);
                } else if (!isTimelyHit) {
                  // タイムリーの場合は「○点タイムリー」で既に表しているので得点の羅列は省略
                  movements.push(`${base}塁ランナーが得点`);
                }
            } else {
                let destBase = '';
                if (atBat.situationAfter.runners['1'] === runnerId) destBase = '1塁';
                else if (atBat.situationAfter.runners['2'] === runnerId) destBase = '2塁';
                else if (atBat.situationAfter.runners['3'] === runnerId) destBase = '3塁';
                
                if (destBase && destBase !== `${base}塁`) {
                    movements.push(`${base}塁ランナーが${destBase}へ進塁`);
                } else if (!destBase) {
                    movements.push(`${base}塁ランナーがアウト`);
                }
            }
        }
    });

    // 打者走者の得点（ホームラン等）
    const batterId = atBat.batterId;
    if (batterId && scored.some((e) => e.runnerId === batterId) && !isForceIn && !isSacFly) {
      if (isTimelyHit) {
        // 打者も得点時は「○点タイムリー」に含まれるので省略
      } else {
        movements.push('打者走者が得点');
      }
    }

    // 併殺表現（アウトが2つ増えた場合、fieldingから守備位置の連鎖を取得）
    const outsBefore = atBat.situationBefore.outs ?? 0;
    const outsAfter = atBat.situationAfter.outs ?? 0;
    const isDoublePlay = outsAfter - outsBefore >= 2;
    let doublePlayText = '';
    if (isDoublePlay && atBat.playDetails?.fielding && atBat.playDetails.fielding.length >= 2) {
      const positions = atBat.playDetails.fielding
        .map((f) => f.position)
        .filter((p) => /^[1-9]$/.test(p));
      // 連続重複を除去（例: [6,4,4,3] → [6,4,3]）
      const chain = positions.filter((p, i) => p !== positions[i - 1]);
      if (chain.length >= 2) {
        doublePlayText = chain.join('-') + 'の併殺';
      }
    }

    const parts: string[] = [];
    if (doublePlayText) parts.push(doublePlayText);
    if (movements.length > 0) parts.push(movements.join('、'));

    if (parts.length > 0) {
      text += `で、${parts.join('、')}`;
    }

    return text;
  };

  const resultDescription = generateResultDescription();

  // Pitch result name helper
  const getPitchResultName = (result: string) => {
    const map: Record<string, string> = {
        swing: '空振り',
        looking: '見逃し',
        ball: 'ボール',
        inplay: 'インプレイ',
        deadball: 'デッドボール',
        foul: 'ファウル',
    };
    return map[result] || result;
  };

  const runCount = normalizeScoredRunners(atBat.scoredRunners).length;

  return {
    resultName,
    isHit,
    inningStr,
    count: { b, s, o },
    resultDescription,
    runCount,
    getPitchTypeName,
    getPitchResultName,
  };
};
