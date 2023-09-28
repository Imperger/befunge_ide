import { PCDirection } from '../CPU/CPU';

import { Pointer } from './Memory';

export interface PointerArithmetics {
  Move(ptr: Pointer, dir: PCDirection): Pointer;
}
