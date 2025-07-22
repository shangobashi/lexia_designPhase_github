import { Message } from './message';
import { Document } from './document';

export type CaseStatus = 'active' | 'pending' | 'closed';

export interface Case {
  id: string;
  caseId: string;
  title: string;
  description: string;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  documents: Document[];
  userId: string;
}