import { Operator } from '../const';

export interface RouterState {
  operator: Operator;
  sessionId: string;
  isFree?: boolean;
}
