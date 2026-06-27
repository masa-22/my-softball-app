import { PitchType } from './PitchType';

export interface PitchData {
  id: number;
  x: number;
  y: number;
  type: PitchType;
  order: number;
  result: 'swing' | 'looking' | 'ball' | 'inplay' | 'deadball' | 'foul';
  /** 簡易入力（コース・球種なし）で追加した球 */
  simpleInput?: boolean;
}















