/**
 * Type Definitions
 */

export interface Memory {
  id: string;
  contextId: string;
  text: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  version: number;
  directAccessOnly: boolean;
}

export interface Fact {
  id: string;
  memoryId: string;
  text: string;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface FactWithScore extends Fact {
  score: number;
  memory?: Memory;
}

