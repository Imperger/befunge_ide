import { CPU } from '../CPU/CPU';

import { Instruction } from './Instruction';

export class PrintASCII implements Instruction {
  get Code(): string {
    return ',';
  }

  Execute(cpu: CPU): void {
    cpu.WriteIO(String.fromCharCode(cpu.StackPop()));
  }
}
