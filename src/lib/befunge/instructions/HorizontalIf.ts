import { CPU, PCDirection } from '../CPU/CPU';

import { Instruction } from './Instruction';

export class HoriontalIf implements Instruction {
  get Code(): string {
    return '_';
  }

  Execute(cpu: CPU): void {
    cpu.PCDirection(
      cpu.StackPop() === 0 ? PCDirection.Right : PCDirection.Left
    );
  }
}
