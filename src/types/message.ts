export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  caseId: string;
  files?: FileAttachment[];
}