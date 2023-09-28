import { CPU, PCDirection } from '../CPU/CPU';

import { Instruction } from './Instruction';

export class PCDirectionDown implements Instruction {
  get Code(): string {
    return 'v';
  }

  Execute(cpu: CPU): void {
    cpu.PCDirection(PCDirection.Down);
  }
}
