export type Team = {
  id: string;
  name: string;
  shortName?: string | null;
  crestUrl?: string | null;
};

export type MatchStatus =
  | 'SCHEDULED'
  | 'LIVE'
  | 'FINISHED'
  | 'POSTPONED'
  | 'CANCELLED';

export type Match = {
  id: string;
  utcDate: string;
  status: MatchStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  homeTeam: Team;
  awayTeam: Team;
};

export type Room = {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  code: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  _count?: {
    members: number;
    predictions?: number;
    invitations?: number;
  };
};

export type RoomMember = {
  id: string;
  roomId: string;
  userId: string;
  role: 'OWNER' | 'MEMBER';
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'USER' | 'ADMIN';
    status?: string;
  };
};

export type Invitation = {
  id: string;
  code: string;
  status: 'PENDING' | 'USED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  createdAt: string;
};

export type Score = {
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  reason?: string | null;
};

export type Prediction = {
  id: string;
  predictionType: 'EXACT_SCORE' | 'WINNER' | 'GOAL_DIFFERENCE';
  predictedWinner?: 'HOME' | 'DRAW' | 'AWAY' | null;
  goalDifference?: number | null;
  homeScore?: number | null;
  awayScore?: number | null;
  submittedAt: string;
  match: Match;
  room?: Pick<Room, 'id' | 'name' | 'color'> | null;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
  score?: Score | null;
};

export type RankingEntry = {
  position: number;
  userId: string;
  name: string;
  email: string;
  totalPoints: number;
  predictionsCount: number;
};

export type CarouselSlide = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
};

export type ExternalTeam = {
  id: number;
  name?: string | null;
  shortName?: string | null;
  tla?: string | null;
  crest?: string | null;
};

export type GroupStandingEntry = {
  position: number;
  team: ExternalTeam;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

export type GroupStanding = {
  group: string;
  table: GroupStandingEntry[];
};

export type KnockoutMatch = {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  homeTeam?: ExternalTeam | null;
  awayTeam?: ExternalTeam | null;
  score?: {
    fullTime?: {
      home?: number | null;
      away?: number | null;
    };
  };
};
