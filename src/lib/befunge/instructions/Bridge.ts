import { CPU } from '../CPU/CPU';

import { Instruction } from './Instruction';

export class Bridge implements Instruction {
  get Code(): string {
    return '#';
  }

  Execute(cpu: CPU): void {
    cpu.SkipNext();
  }
}
