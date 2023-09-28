import { CPU } from '../CPU/CPU';

import { Instruction } from './Instruction';

export class NoOperation implements Instruction {
  get Code(): string {
    return ' ';
  }
  Execute(_cpu: CPU): void {}
}
