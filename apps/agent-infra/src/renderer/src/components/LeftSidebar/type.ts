export interface ChatSession {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  id: string;
  name: string;
  appId: string;
  messageCount: number;
  origin?: string;
  createdAt?: string;
  updatedAt?: string;
}
