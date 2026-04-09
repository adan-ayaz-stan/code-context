import { multiply, square } from './dep';
import * as fs from 'fs';  // node_modules import — should be excluded from deps

/**
 * Computes the area of a rectangle. Uses multiply from dep.ts.
 */
export function area(width: number, height: number): number {
  return multiply(width, height);
}

/**
 * Computes the area of a square. Uses square from dep.ts.
 */
export function squareArea(side: number): number {
  return square(side);
}

/**
 * Reads a file. Uses fs but NOT multiply or square.
 */
export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Does pure math with no external imports.
 */
export function addNumbers(a: number, b: number): number {
  return a + b;
}
