import { AtBat } from '../types/AtBat';
import { POSITIONS } from '../data/softball/positions';

// 座標計算用定数（StrikeZoneGridのサイズに合わせる）
export const ZONE_WIDTH = 260;
export const ZONE_HEIGHT = 325;

export const FIELDER_LABELS: Record<string, string> = Object.keys(POSITIONS).reduce((acc, key) => {
  const def = POSITIONS[key];
  if (def?.shortName) {
    acc[key] = def.shortName;
  }
  return acc;
}, {} as Record<string, string>);

export const OUTFIELD_DIRECTION_LABELS: Record<string, string> = {
  left: '左',
  'left-center': '左中',
  center: '中',
  'right-center': '右中',
  right: '右',
  infield: '内',
};

export const getFielderLabel = (position?: string) => (position ? (FIELDER_LABELS[position] || '') : '');

export const getDirectionLabel = (direction?: string) => {
  if (!direction) return '';
  if (OUTFIELD_DIRECTION_LABELS[direction]) {
    return OUTFIELD_DIRECTION_LABELS[direction];
  }
  return getFielderLabel(direction);
};

export const formatAtBatSummary = (atBat: AtBat): string => {
  const type = atBat.result?.type;
  if (!type) return '';

  const beforeOuts = atBat.situationBefore?.outs ?? 0;
  const afterOuts = atBat.situationAfter?.outs ?? beforeOuts;
  const outsDiff = Math.max(0, afterOuts - beforeOuts);

  const rawDirection = atBat.playDetails?.direction;
  const directionLabel = getDirectionLabel(rawDirection);
  const fieldedBy =
    atBat.result?.fieldedBy ||
    atBat.playDetails?.fielding?.[0]?.position ||
    (rawDirection && /^[1-9]$/.test(rawDirection) ? rawDirection : '');
  const fielderLabel = getFielderLabel(fieldedBy);
  const labelForHit = fielderLabel || directionLabel;

  switch (type) {
    case 'single':
      return labelForHit ? `${labelForHit}安` : '安';
    case 'double':
      return labelForHit ? `${labelForHit}2` : '2';
    case 'triple':
      return (directionLabel || fielderLabel || '') ? `${directionLabel || fielderLabel}3` : '3';
    case 'homerun':
      return `${directionLabel || fielderLabel || '中'}本`;
    case 'runninghomerun':
      return `${directionLabel || fielderLabel || '中'}走本`;
    case 'groundout':
      if (outsDiff >= 2) {
        return fielderLabel ? `${fielderLabel}併殺` : '併殺';
      }
      return fielderLabel ? `${fielderLabel}ゴロ` : 'ゴロ';
    case 'flyout':
      return fielderLabel ? `${fielderLabel}飛` : '飛';
    case 'bunt_out':
      return fielderLabel ? `${fielderLabel}バ失` : 'バ失';
    case 'strikeout_swinging':
      return '空三振';
    case 'strikeout_looking':
      return '見三振';
    case 'droppedthird':
      return '振逃';
    case 'walk':
      return '四球';
    case 'deadball':
      return '死球';
    case 'sac_bunt':
    case 'sacrifice_bunt':
      return '犠打';
    case 'sac_fly':
    case 'sacrifice_fly':
      return '犠飛';
    case 'error':
      return fielderLabel ? `${fielderLabel}失` : '失';
    case 'interference':
      return '干渉';
    default:
      return '他';
  }
};

export const calculateCourse = (x: number, y: number): number => {
  const col = Math.min(4, Math.max(0, Math.floor((x / ZONE_WIDTH) * 5)));
  const row = Math.min(4, Math.max(0, Math.floor((y / ZONE_HEIGHT) * 5)));
  return row * 5 + col + 1;
};

export const toPercentage = (val: number, max: number): number => {
  return parseFloat(((val / max) * 100).toFixed(1));
};



