import { CPU } from '../CPU/CPU';

import { Instruction } from './Instruction';

export class Unknown implements Instruction {
  get Code(): string {
    return '';
  }
  Execute(_cpu: CPU): void {
    console.warn('Unknown instruction');
  }
}
