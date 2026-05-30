export interface Member {
  id: string;
  name: string;
  role: string;
  company: string;
  email?: string;
  website?: string;
  phone?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  bio?: string;
  image?: string;
  type: string; // support attendee, speaker, panelist, mc, etc.
}

export interface Speaker extends Member {
  sessions: string[];
}

export interface Session {
  id: string;
  title: string;
  time: string;
  room: string;
  track: string;
  description: string;
  speakers: string[];
  sponsor?: string;
}

export interface DaySchedule {
  day: number;
  date: string;
  agenda: Session[];
}

export interface Sponsor {
  id: string;
  name: string;
  tier: "Platinum" | "Gold" | "Silver" | "Bronze";
  logo: string;
  description: string;
  website: string;
  booth?: string;
  socials?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };
}

export interface Course {
  id: string;
  name: string;
  url: string;
  image: string;
  comingSoon?: boolean;
}

export interface Exhibitor {
  id: string;
  name: string;
  booth: string;
  category: string;
  description: string;
  website: string;
}

export interface ScanRecord {
  id: string;
  memberId: string;
  name: string;
  type: string; // support attendee, speaker, panelist, mc, etc.
  timestamp: number;
  notes: string;
  favorite: boolean;
  role?: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
}
