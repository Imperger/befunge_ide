import { CPU } from '../CPU/CPU';

import { Instruction } from './Instruction';

export class Divide implements Instruction {
  get Code(): string {
    return '/';
  }

  Execute(cpu: CPU): void {
    const a = cpu.StackPop();
    const b = cpu.StackPop();

    cpu.StackPush(Math.trunc(b / a));
  }
}
