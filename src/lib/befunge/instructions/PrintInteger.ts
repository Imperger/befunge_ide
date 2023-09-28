import { CPU } from '../CPU/CPU';

import { Instruction } from './Instruction';

export class PrintInteger implements Instruction {
  get Code(): string {
    return '.';
  }

  Execute(cpu: CPU): void {
    cpu.WriteIO(cpu.StackPop().toString());
  }
}
