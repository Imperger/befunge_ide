import { CPU } from '../CPU/CPU';

import { Instruction } from './Instruction';

export class InputInteger implements Instruction {
  get Code(): string {
    return '&';
  }

  Execute(cpu: CPU): void {
    cpu.StackPush(Number.parseInt(cpu.ReadIO()));
  }
}
