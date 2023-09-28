import { CPU, PCDirection } from '../CPU/CPU';

import { Instruction } from './Instruction';

export class PCDirectionUp implements Instruction {
  get Code(): string {
    return '^';
  }

  Execute(cpu: CPU): void {
    cpu.PCDirection(PCDirection.Up);
  }
}
