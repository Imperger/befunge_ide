import { PCDirection } from '../CPU/CPU';

import { Pointer } from './Memory';
import { MemoryLimit } from './MemoryLimit';
import { PointerArithmetics } from './PointerArithmetics';

export class ModuloPointerArithmetics implements PointerArithmetics {
  constructor(private memoryLimit: MemoryLimit) {}

  Move(ptr: Pointer, dir: PCDirection): Pointer {
    switch (dir) {
      case PCDirection.Right:
        return { X: (ptr.X + 1) % this.memoryLimit.Width, Y: ptr.Y };
      case PCDirection.Left:
        return {
          X: ptr.X === 0 ? this.memoryLimit.Width - 1 : ptr.X - 1,
          Y: ptr.Y
        };
      case PCDirection.Down:
        return { X: ptr.X, Y: (ptr.Y + 1) % this.memoryLimit.Height };
      case PCDirection.Up:
        return {
          X: ptr.X,
          Y: ptr.Y === 0 ? this.memoryLimit.Height - 1 : ptr.Y - 1
        };
    }
  }
}
