import { MemoryLimit } from './MemoryLimit';
import { PointerArithmetics } from './PointerArithmetics';

export interface Pointer {
  x: number;
  y: number;
}

export interface Memory {
  Read(ptr: Pointer): number;
  Write(ptr: Pointer, value: number): void;
  Resize(limit: MemoryLimit): void;
  Clone(): Memory;
  get PointerArithmetics(): PointerArithmetics;
}
