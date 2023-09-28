import { CPU } from '../CPU/CPU';

import { Instruction } from './Instruction';

export class Multiply implements Instruction {
  get Code(): string {
    return '*';
  }

  Execute(cpu: CPU): void {
    cpu.StackPush(cpu.StackPop() * cpu.StackPop());
  }
}
