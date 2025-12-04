// import { HalfInning, Runners } from '../models/games';
import { PitchType } from '../components/play/common/PitchTypeSelector';

export type HalfInning = 'top' | 'bottom';

export interface Runners {
  '1': string | null;
  '2': string | null;
  '3': string | null;
}

export type AtBatType = 'bat' | 'steal' | 'substitution' | 'other';

export type BatterResultType =
  | 'single'
  | 'double'
  | 'triple'
  | 'homerun'
  | 'runninghomerun'
  | 'groundout'
  | 'flyout'
  | 'bunt_out'
  | 'strikeout_swinging'
  | 'strikeout_looking'
  | 'droppedthird'
  | 'walk'
  | 'deadball'
  | 'sac_bunt'
  | 'sac_fly'
  | 'interference'
  | 'error';

export interface AtBatResult {
  type: BatterResultType;
  fieldedBy?: string; // 守備位置 (1-9)
  rbi?: number;
}

export interface GameSnapshot {
  outs: number;
  runners: Runners;
  balls: number;
  strikes: number;
}

export type PitchResult = 'swing' | 'looking' | 'ball' | 'inplay' | 'deadball' | 'foul';

export interface PitchRecord {
  seq: number;
  type: PitchType;
  course: number; // 1-25 (StrikeZoneGridのグリッド番号)
  x?: number; // 0-100% (左上が0,0)
  y?: number; // 0-100%
  result: PitchResult;
  velocity?: number | null;
}

export type RunnerEventType = 'passedball' | 'wildpitch' | 'steal' | 'pickoff' | 'balk' | 'advance' | 'scored' | 'out';

export type BaseType = '1' | '2' | '3' | 'home';

export interface RunnerEvent {
  id: string;
  pitchSeq: number; // どの投球後のイベントか
  type: RunnerEventType;
  runnerId: string;
  fromBase: BaseType;
  toBase: BaseType;
  isOut?: boolean;
  outDetail?: {
    base: BaseType;
    threwPosition?: string;
    caughtPosition?: string;
  };
}

export type BatType = 'ground' | 'fly' | 'liner' | 'bunt';

// 打球方向は既存の定義を維持しつつ、将来的にポジション番号も入れられるようにしておく
export type BatDirection = 'left' | 'center' | 'right' | 'infield' | string;

export interface FieldingAction {
  playerId?: string; // IDが不明な場合も許容
  position: string;
  action: 'fielded' | 'assist' | 'putout' | 'error'; // putout(刺殺)を追加
  quality: 'clean' | 'bobbled' | 'missed';
}

export interface PlayDetails {
  batType?: BatType;
  direction?: BatDirection;
  fielding?: FieldingAction[];
}

export interface AtBat {
  playId: string;
  matchId: string;
  index: number;
  inning: number;
  topOrBottom: HalfInning;
  type: AtBatType;

  // --- 打席基本情報 ---
  batterId: string;
  pitcherId: string;
  battingOrder: number;

  // --- 打席結果 ---
  result?: AtBatResult;

  // --- 状況スナップショット ---
  situationBefore: GameSnapshot;
  situationAtPitchResult?: GameSnapshot;
  situationAfter: GameSnapshot;

  // --- 得点した選手 ---
  scoredRunners: string[];

  // --- 投球記録 ---
  pitches: PitchRecord[];

  // --- ランナーイベント ---
  runnerEvents: RunnerEvent[];

  // --- プレー詳細 ---
  playDetails?: PlayDetails;

  // --- メタデータ ---
  timestamp: string;
  note?: string;
}


