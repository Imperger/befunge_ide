import { CPU } from '../CPU/CPU';

import { Instruction } from './Instruction';

export class MemoryRead implements Instruction {
  get Code(): string {
    return 'g';
  }

  Execute(cpu: CPU): void {
    const y = cpu.StackPop();
    const x = cpu.StackPop();

    cpu.StackPush(cpu.ReadMemory({ x: x, y: y }));
  }
}
