import { CPU } from '../CPU/CPU';

import { Instruction } from './Instruction';

export class GreatherThan implements Instruction {
  get Code(): string {
    return '`';
  }

  Execute(cpu: CPU): void {
    cpu.StackPush(+(cpu.StackPop() < cpu.StackPop()));
  }
}
