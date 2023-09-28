import { CPU, PCDirection } from '../CPU/CPU';

import { Instruction } from './Instruction';

export class VerticalIf implements Instruction {
  get Code(): string {
    return '|';
  }

  Execute(cpu: CPU): void {
    cpu.PCDirection(cpu.StackPop() === 0 ? PCDirection.Down : PCDirection.Up);
  }
}
