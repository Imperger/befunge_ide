import { CPU } from '../CPU/CPU';

import { Instruction } from './Instruction';

export class StackPushDigit implements Instruction {
  constructor(private digit: number) {}

  get Code(): string {
    return this.digit.toString();
  }

  Execute(cpu: CPU): void {
    cpu.StackPush(this.digit);
  }
}
