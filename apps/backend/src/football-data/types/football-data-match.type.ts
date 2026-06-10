export type FootballDataTeam = {
  id: number | null;
  name: string | null;
  shortName?: string;
  tla?: string;
  crest?: string;
};

export type FootballDataMatch = {
  id: number | null;
  utcDate: string;
  status: string;
  stage?: string;
  group?: string | null;
  matchday?: number;
  homeTeam: FootballDataTeam;
  awayTeam: FootballDataTeam;
  score?: {
    fullTime?: {
      home?: number | null;
      away?: number | null;
    };
  };
};

export type FootballDataMatchesResponse = {
  matches: FootballDataMatch[];
};

export type FootballDataStandingEntry = {
  position: number;
  team: FootballDataTeam;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

export type FootballDataStanding = {
  stage: string;
  type: string;
  group: string;
  table: FootballDataStandingEntry[];
};

export type FootballDataStandingsResponse = {
  standings: FootballDataStanding[];
};
