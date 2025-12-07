export type ParticipationStatus = 'starter' | 'pinch_hitter' | 'pinch_runner' | 'substituted' | 'finished';

export type ParticipationEntry = {
  playerId: string;
  side: 'home' | 'away';
  battingOrder: number; // 打順 (1〜9)
  status: ParticipationStatus;
  startInning: number | null;
  endInning: number | null;
  positionAtStart?: string | null;
  positionAtEnd?: string | null;
  note?: string;
};

export type ParticipationTable = {
  home: ParticipationEntry[];
  away: ParticipationEntry[];
};







