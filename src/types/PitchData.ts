import { PitchType } from './PitchType';

export interface PitchData {
  id: number;
  x: number;
  y: number;
  type: PitchType;
  order: number;
  result: 'swing' | 'looking' | 'ball' | 'inplay' | 'deadball' | 'foul';
}



