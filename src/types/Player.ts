export interface Player {
  playerId: string;
  teamId: string | number;
  familyName: string;
  givenName: string;
  throwing: string;
  batting: string;
  entryYear: string | null;
  createdAt: string;
}

export interface PlayerData {
  teamId: string | number;
  familyName: string;
  givenName: string;
  throwing: string;
  batting: string;
  entryYear?: string | null;
}

