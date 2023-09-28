import { CPU } from '../CPU/CPU';

import { Instruction } from './Instruction';

export class EndProgramm implements Instruction {
  get Code(): string {
    return '@';
  }

  Execute(cpu: CPU): void {
    cpu.Halt();
  }
}
