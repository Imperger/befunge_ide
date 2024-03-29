import { Memory, Pointer } from './Memory';
import { MemoryLimit } from './MemoryLimit';
import { ModuloPointerArithmetics } from './ModuloPointerArithmetics';
import { PointerArithmetics } from './PointerArithmetics';

export class ArrayMemory implements Memory {
  private pointerArithmetics: PointerArithmetics;
  private memory: Uint8Array;

  constructor(private limit: MemoryLimit) {
    this.pointerArithmetics = new ModuloPointerArithmetics(limit);
    this.memory = new Uint8Array(limit.Width * limit.Height);

    const emptyValue = ' '.charCodeAt(0);

    for (let n = 0; n < this.memory.length; ++n) {
      this.memory[n] = emptyValue;
    }
  }

  get PointerArithmetics(): PointerArithmetics {
    return this.pointerArithmetics;
  }

  Read(ptr: Pointer): number {
    if (this.IsPointerOutOfBound(ptr)) {
      return 0;
    }

    return this.memory[this.PointerToIndex(ptr)];
  }

  Write(ptr: Pointer, value: number): void {
    if (this.IsPointerOutOfBound(ptr)) {
      return;
    }

    this.memory[this.PointerToIndex(ptr)] = value;
  }

  Resize(limit: MemoryLimit): void {
    const resized = new ArrayMemory(limit);

    this.CopyMemoryTo(resized);

    this.memory = resized.memory;
    this.limit = limit;
  }

  Clone(): Memory {
    const copy = new ArrayMemory(this.limit);

    copy.memory.set(this.memory);

    return copy;
  }

  private PointerToIndex(ptr: Pointer): number {
    return ptr.y * this.limit.Width + ptr.x;
  }

  private IsPointerOutOfBound(ptr: Pointer): boolean {
    return ptr.x >= this.limit.Width || ptr.y >= this.limit.Height;
  }

  private CopyMemoryTo(dst: ArrayMemory): void {
    const copyingWidth = Math.min(this.limit.Width, dst.limit.Width);
    const copyingHeight = Math.min(this.limit.Height, dst.limit.Height);

    for (let x = 0; x < copyingWidth; ++x) {
      for (let y = 0; y < copyingHeight; ++y) {
        const ptr: Pointer = { x: x, y: y };

        dst.Write(ptr, this.Read(ptr));
      }
    }
  }
}
