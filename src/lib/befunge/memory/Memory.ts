import { MemoryLimit } from './MemoryLimit';
import { PointerArithmetics } from './PointerArithmetics';

export interface Pointer {
  X: number;
  Y: number;
}

export interface Memory {
  Read(ptr: Pointer): number;
  Write(ptr: Pointer, value: number): void;
  Resize(limit: MemoryLimit): void;
  get PointerArithmetics(): PointerArithmetics;
}
