export interface Team {
  id: number;
  teamName: string;
  teamAbbr: string;
  prefecture: string;
  affiliation: string;
  createdAt?: string;
}

export interface TeamData {
  teamName: string;
  teamAbbr: string;
  prefecture: string;
  affiliation: string;
}

export interface TeamSearchParams {
  name?: string;
  prefecture?: string;
  affiliation?: string;
}






