export type Model = string;

export type AgentIntermediateState = {
  type: string;
  content: string;
  blocks?: AgentIntermediateBlock[];
};

export type AgentIntermediateBlock = {
  id: string;
  type: string;
  title: string;
  content: string;
};
