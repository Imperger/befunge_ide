import { CPU } from '../CPU/CPU';

export interface Instruction {
  get Code(): string;
  Execute(cpu: CPU): void;
}
