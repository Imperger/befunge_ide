import { CPU } from '../CPU/CPU';

import { Instruction } from './Instruction';

export class ToggleStringMode implements Instruction {
  get Code(): string {
    return '"';
  }

  Execute(cpu: CPU): void {
    cpu.StringModeToggle();
  }
}
