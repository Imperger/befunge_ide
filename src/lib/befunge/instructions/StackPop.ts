import { CPU } from '../CPU/CPU';

import { Instruction } from './Instruction';

export class StackPop implements Instruction {
  get Code(): string {
    return '$';
  }

  Execute(cpu: CPU): void {
    cpu.StackPop();
  }
}
