import { CPU } from '../CPU/CPU';

import { Instruction } from './Instruction';

export class InputASCII implements Instruction {
  get Code(): string {
    return '~';
  }

  Execute(cpu: CPU): void {
    cpu.StackPush(cpu.ReadCharacter().charCodeAt(0));
  }
}
