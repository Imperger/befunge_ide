import { PCDirection } from '../CPU/CPU';

import { Pointer } from './Memory';
import { MemoryLimit } from './MemoryLimit';
import { PointerArithmetics } from './PointerArithmetics';

export class ModuloPointerArithmetics implements PointerArithmetics {
  constructor(private memoryLimit: MemoryLimit) {}

  Move(ptr: Pointer, dir: PCDirection): Pointer {
    switch (dir) {
      case PCDirection.Right:
        return { x: (ptr.x + 1) % this.memoryLimit.Width, y: ptr.y };
      case PCDirection.Left:
        return {
          x: ptr.x === 0 ? this.memoryLimit.Width - 1 : ptr.x - 1,
          y: ptr.y
        };
      case PCDirection.Down:
        return { x: ptr.x, y: (ptr.y + 1) % this.memoryLimit.Height };
      case PCDirection.Up:
        return {
          x: ptr.x,
          y: ptr.y === 0 ? this.memoryLimit.Height - 1 : ptr.y - 1
        };
    }
  }
}
