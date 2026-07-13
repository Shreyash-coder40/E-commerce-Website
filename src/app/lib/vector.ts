/**
 * Vector similarity math helpers for in-memory re-ranking.
 */

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0.0;
  }

  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0.0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
