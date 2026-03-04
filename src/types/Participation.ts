export type ParticipationStatus = 'starter' | 'pinch_hitter' | 'pinch_runner' | 'reentry' | 'substituted' | 'finished' | 'position_change' | 'temporary_runner';

export type ParticipationEntry = {
  playerId: string;
  side: 'home' | 'away';
  battingOrder: number; // 打順 (1〜9)
  status: ParticipationStatus;
  startInning: number | null;
  endInning: number | null;
  positionAtStart?: string | null;
  note?: string;
};

export type ParticipationTable = {
  home: ParticipationEntry[];
  away: ParticipationEntry[];
};






