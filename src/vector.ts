/**
 * Vector Operations
 * 
 * Utilities for vector normalization, similarity, and serialization
 */

/**
 * Normalize a vector to unit length
 */
export function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map((val) => val / magnitude);
}

/**
 * Compute dot product of two vectors
 */
export function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

/**
 * Convert vector to binary blob for storage
 */
export function vectorToBlob(vector: number[]): Buffer {
  const buffer = Buffer.allocUnsafe(vector.length * 4);
  vector.forEach((val, i) => buffer.writeFloatLE(val, i * 4));
  return buffer;
}

/**
 * Convert binary blob back to vector
 */
export function blobToVector(blob: Buffer): number[] {
  const vector: number[] = [];
  for (let i = 0; i < blob.length; i += 4) {
    vector.push(blob.readFloatLE(i));
  }
  return vector;
}

