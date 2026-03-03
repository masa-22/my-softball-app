import { AtBat } from '../../types/AtBat';
import { BATTING_RESULTS } from '../../data/softball/battingResults';
import { POSITIONS } from '../../data/softball/positions';

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

  // ポジション名取得
  const getPositionName = (posCode?: string) => {
    if (!posCode) return '';
    const pos = POSITIONS[posCode as keyof typeof POSITIONS];
    return pos ? pos.name : posCode; // フルネームを使用（例：遊撃手）
  };

  // 結果詳細文の生成
  const generateResultDescription = () => {
    if (!atBat.result?.type) return '';

    const posName = getPositionName(atBat.playDetails?.direction);
    const directionText = posName ? `${posName}への` : '';
    
    // 三振の場合
    if (atBat.result.type.startsWith('strikeout')) {
        // 振り逃げなどでランナーが動いた場合のみ記述する？
        const hasRunnerMovement = JSON.stringify(atBat.situationBefore.runners) !== JSON.stringify(atBat.situationAfter.runners);
        if (!hasRunnerMovement && atBat.scoredRunners.length === 0) {
            return '';
        }
    }

    let text = `${directionText}${resultName}`;

    // ランナーの動き
    const movements: string[] = [];
    (['1', '2', '3'] as const).forEach(base => {
        const runnerId = atBat.situationBefore.runners[base];
        if (runnerId) {
            // 得点したか？
            if (atBat.scoredRunners.includes(runnerId)) {
                movements.push(`${base}塁ランナーが得点`);
            } else {
                // 移動したか？
                let destBase = '';
                if (atBat.situationAfter.runners['1'] === runnerId) destBase = '1塁';
                else if (atBat.situationAfter.runners['2'] === runnerId) destBase = '2塁';
                else if (atBat.situationAfter.runners['3'] === runnerId) destBase = '3塁';
                
                if (destBase && destBase !== `${base}塁`) {
                    movements.push(`${base}塁ランナーが${destBase}へ進塁`);
                } else if (!destBase) {
                    // アウトになった（盤面にも得点にもいない）
                    movements.push(`${base}塁ランナーがアウト`);
                }
            }
        }
    });

    if (movements.length > 0) {
        text += `で、${movements.join('、')}`;
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

  return {
    resultName,
    isHit,
    inningStr,
    count: { b, s, o },
    resultDescription,
    getPitchTypeName,
    getPitchResultName,
  };
};
