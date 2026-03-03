import { GameSnapshot, Runners } from '../types/AtBat';

// 打撃結果から進塁数を取得
export const getAdvanceDistance = (result: string): number => {
    switch (result) {
      case 'single':
      case 'droppedthird':
      case 'error':
      case 'walk':
      case 'deadball':
      case 'interference':
        return 1;
      case 'double':
        return 2;
      case 'triple':
        return 3;
      case 'homerun':
      case 'runninghomerun':
        return 4;
      default:
        return 0;
    }
};

// 押し出し進塁
const advanceRunnersForce = (before: Runners, batterId: string) => {
    const next: Runners = { '1': null, '2': null, '3': null };
    const pushed: string[] = [];
    
    if (before['1']) {
        next['2'] = before['1'];
        if (before['2']) {
            next['3'] = before['2'];
            if (before['3']) {
                pushed.push(before['3']);
            }
        } else {
            next['3'] = before['3'];
        }
    } else {
        next['2'] = before['2'];
        next['3'] = before['3'];
    }
    next['1'] = batterId;
    
    return { after: next, scored: pushed };
};

// N塁進塁
const advanceRunnersBy = (before: Runners, batterId: string, n: number) => {
    const after: Runners = { '1': null, '2': null, '3': null };
    const scored: string[] = [];

    const bases = ['1', '2', '3'] as const;
    for (let i = bases.length - 1; i >= 0; i--) {
      const base = bases[i];
      const runner = before[base];
      if (!runner) continue;
      const startIndex = i + 1;
      const targetIndex = startIndex + n;
      if (targetIndex >= 4) {
        scored.push(runner);
      } else {
        const targetBase = String(targetIndex) as '1' | '2' | '3';
        after[targetBase] = runner;
      }
    }

    if (batterId) {
      const batterTarget = n;
      if (batterTarget >= 4) {
        scored.push(batterId);
      } else if (batterTarget > 0) {
        const targetBase = String(batterTarget) as '1' | '2' | '3';
        after[targetBase] = batterId;
      }
    }

    return { after, scored };
};

// プレイのシミュレーション
export const simulatePlay = (before: GameSnapshot, resultType: string, batterId: string): { snapshot: GameSnapshot, scoredRunners: string[] } => {
    const next: GameSnapshot = {
        ...before,
        balls: 0,
        strikes: 0,
    };
    let scored: string[] = [];
    
    const isOut = ['groundout', 'flyout', 'strikeout_swinging', 'strikeout_looking', 'bunt_out', 'sacrifice_fly', 'sacrifice_bunt'].includes(resultType);
    
    if (isOut) {
        next.outs = Math.min(3, before.outs + 1);
        if ((resultType === 'sacrifice_fly' || resultType === 'sacrifice_bunt') && before.runners['3']) {
            scored.push(before.runners['3']);
            next.runners['3'] = null;
        }
    } else {
        const n = getAdvanceDistance(resultType);
        
        if (resultType === 'walk' || resultType === 'deadball' || resultType === 'interference') {
            const { after, scored: s } = advanceRunnersForce(before.runners, batterId);
            next.runners = after;
            scored = s;
        } else if (n > 0) {
            const { after, scored: s } = advanceRunnersBy(before.runners, batterId, n);
            next.runners = after;
            scored = s;
        }
    }
    
    return { snapshot: next, scoredRunners: scored };
};
