import { CPU } from '../CPU/CPU';

import { Instruction } from './Instruction';

export class MemoryWrite implements Instruction {
  get Code(): string {
    return 'p';
  }

  Execute(cpu: CPU): void {
    const y = cpu.StackPop();
    const x = cpu.StackPop();
    const value = cpu.StackPop();

    cpu.WriteMemory({ x, y }, value);
  }
}
