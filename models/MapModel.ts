export interface Configurations {
  columns: number;
  minNodes: number;
  maxNodes: number;
  minConnection: number;
  maxConnection: number;
}

export interface Column {
  noOfNodes: number;
  nodes: Node[];
}

export interface Node {
  id: number;
  columnBasedId: string;
  type: string;
  encounterId?: number;
  noOfConnections: number;
  exit_nodes?: ExitNode[];
}

export interface ExitNode {
  exit_nodeid: number;
}
