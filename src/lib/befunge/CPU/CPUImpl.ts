import { Instruction } from '../instructions/Instruction';
import { IOPort } from '../IOPort';
import { Memory, Pointer } from '../memory/Memory';

import { CPU, IllegalInstructionException, PCDirection } from './CPU';

export class CPUImpl implements CPU {
  private pcDirection = PCDirection.Right;
  private pcLocation: Pointer = { x: 0, y: 0 };
  private stack: number[] = [];
  private isStringMode = false;
  private isHalted = false;

  private instructionSet: Instruction[] = Array.from({ length: 128 });

  constructor(
    private memory: Memory,
    private io: IOPort,
    instructions: Instruction[]
  ) {
    instructions.forEach(
      inst => (this.instructionSet[inst.Code.charCodeAt(0)] = inst)
    );
  }

  get Stack(): number[] {
    return this.stack;
  }

  get PC(): { Location: Pointer; Direction: PCDirection } {
    return { Location: this.pcLocation, Direction: this.pcDirection };
  }

  get NextInstructionCode(): string {
    return String.fromCharCode(this.memory.Read(this.pcLocation));
  }

  StackPush(value: number): void {
    this.stack.push(value);
  }

  StackPop(): number {
    if (this.stack.length === 0) {
      return 0;
    } else {
      const ret = this.stack[this.stack.length - 1];

      this.stack.pop();

      return ret;
    }
  }

  StackDuplicate(): void {
    if (this.stack.length >= 1) {
      this.stack.push(this.stack[this.stack.length - 1]);
    } else {
      this.stack.push(0, 0);
    }
  }

  StackSwap(): void {
    if (this.stack.length >= 2) {
      const last = this.stack[this.stack.length - 1];
      this.stack[this.stack.length - 1] = this.stack[this.stack.length - 2];
      this.stack[this.stack.length - 2] = last;
    } else {
      this.stack.push(
        ...Array.from({ length: 2 - this.stack.length }, () => 0)
      );
    }
  }

  PCDirection(dir: PCDirection): void {
    this.pcDirection = dir;
  }

  ExecuteNext(): void {
    const instruction = this.memory.Read(this.pcLocation);

    if (this.isStringMode && instruction !== '"'.charCodeAt(0)) {
      this.stack.push(instruction);
    } else if (this.KnownInstruction(instruction)) {
      this.instructionSet[instruction].Execute(this);
    } else {
      throw new IllegalInstructionException(this.pcLocation, instruction, String.fromCharCode(instruction))
    }

    this.SkipNext();
  }

  SkipNext(): void {
    this.pcLocation = this.memory.PointerArithmetics.Move(
      this.pcLocation,
      this.pcDirection
    );
  }

  StringModeToggle(): void {
    this.isStringMode = !this.isStringMode;
  }

  ReadMemory(ptr: Pointer): number {
    return this.memory.Read(ptr);
  }

  WriteMemory(ptr: Pointer, value: number): void {
    this.memory.Write(ptr, value);
  }

  WriteIO(symbol: string): void {
    this.io.OutputWrite(symbol);
  }

  ReadIO(): string {
    return this.io.InputRead();
  }

  Halt(): void {
    this.isHalted = true;
  }

  get IsHalted(): boolean {
    return this.isHalted;
  }

  private KnownInstruction(instruction: number): boolean {
    return this.instructionSet[instruction] !== undefined;
  }
}
