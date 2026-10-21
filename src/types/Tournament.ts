export interface Tournament {
  id: string;
  year: string;
  name: string;
  type: 'トーナメント' | 'リーグ' | string;
  /** true のとき、選手マスタなしの打順枠で試合を進める */
  skipPlayerRegistration?: boolean;
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
  skipPlayerRegistration?: boolean;
}















