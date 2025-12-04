import { PitchResult } from '../../types/AtBat';

// 投球結果 (Pitch Results)
export interface PitchResultDef {
  code: PitchResult;
  name: string;
  counts: {
    ball: number;   // ボールカウント増分
    strike: number; // ストライクカウント増分
  };
}

export const PITCH_RESULTS: Record<PitchResult, PitchResultDef> = {
  ball: { 
    code: 'ball', 
    name: 'ボール', 
    counts: { ball: 1, strike: 0 } 
  },
  looking: { 
    code: 'looking', 
    name: '見逃し', 
    counts: { ball: 0, strike: 1 } 
  },
  swing: { 
    code: 'swing', 
    name: '空振り', 
    counts: { ball: 0, strike: 1 } 
  },
  foul: { 
    code: 'foul', 
    name: 'ファウル', 
    counts: { ball: 0, strike: 1 } // ※2ストライク後は増えないロジックは別途必要
  },
  inplay: { 
    code: 'inplay', 
    name: 'インプレー', 
    counts: { ball: 0, strike: 0 } 
  },
  deadball: { 
    code: 'deadball', 
    name: 'デッドボール', 
    counts: { ball: 0, strike: 0 } // カウントは増えず出塁
  }
} as const;

