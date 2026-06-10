export type JobStatus =
  | "Haven't Applied"
  | 'Applied'
  | 'Awaiting Interview'
  | 'Assessment/Test'
  | 'Interviewing'
  | 'Offer Negotiation'
  | 'Offered'
  | 'Rejected'
  | 'No Longer Interested'
  | 'Ghosted (> 2 Weeks)';

export function normalizeStatus(status: string): JobStatus {
  if (status === 'Have Not Applied' || status === 'Planned' || status === "Planned Project") {
    return "Haven't Applied";
  }
  if (status === 'No Interest') {
    return 'No Longer Interested';
  }
  return status as JobStatus;
}

export type WorkArrangement = 'Remote' | 'Hybrid' | 'Onsite' | 'Unknown';

export type EmploymentType =
  | 'Full-Time'
  | 'Part-Time'
  | 'Contract'
  | 'Casual'
  | 'Freelance'
  | 'Internship'
  | 'Other';

export interface JobApplication {
  id: string;
  userId: string;
  title: string;
  company: string;
  url: string;
  applicationDate: string; // YYYY-MM-DD
  status: JobStatus;
  workArrangement: WorkArrangement;
  employmentType?: EmploymentType;
  officeLocation: string;
  salaryInformation: string;
  targetSalary?: string;
  interviewMethod?: string;
  interviewRound?: string;
  notes: string;
  jobDescription?: string;
  createdAt: number;
  updatedAt: number;
  resumeId?: string;
  requirementsMetaJson?: string;
  interviewDate?: string;
  followUpDate?: string;
  interviewDates?: (string | AdditionalDate)[];
}

export interface AdditionalDate {
  date: string;
  title?: string;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: 'Applied' | 'Interview' | 'Follow Up' | 'Additional Round' | 'Custom';
  notes?: string;
  createdAt: number;
}

export interface Resume {
  id: string;
  userId: string;
  name: string;
  type: string;
  size: number;
  fileData: string; // Base64 encoding
  createdAt: number;
  displayName?: string;
  tags?: string[];
  notes?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

export type AuthMode = 'firebase' | 'guest' | 'loading';
