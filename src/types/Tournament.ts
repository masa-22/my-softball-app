export interface Tournament {
  id: string;
  year: string;
  name: string;
  type: 'トーナメント' | 'リーグ' | string;
  createdAt?: string;
}

export interface TournamentSearchParams {
  year?: string;
  name?: string;
}

export interface TournamentRegisterData {
  year: string;
  name: string;
  type: Tournament['type'];
}


