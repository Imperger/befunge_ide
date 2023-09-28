import { CPU, PCDirection } from '../CPU/CPU';

import { Instruction } from './Instruction';

export class PCDirectionRandom implements Instruction {
  get Code(): string {
    return '?';
  }

  Execute(cpu: CPU): void {
    cpu.PCDirection(
      Math.floor((Math.random() * Object.keys(PCDirection).length) >> 1)
    );
  }
}
