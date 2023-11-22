import { Pointer } from '../memory/Memory';

export class IllegalInstructionException extends Error {
  constructor(
    public readonly Where: Pointer,
    public readonly Opcode: number,
    public readonly Symbol: string) {
    super(`An illegal instruction was executed.\nWith opcode ${Opcode}(${Symbol}) at location ${Where.x}:${Where.y}`);
  }
}

export enum PCDirection {
  Right,
  Down,
  Left,
  Up
}

export interface CPU {
  StackPush(value: number): void;
  StackPop(): number;
  StackDuplicate(): void;
  StackSwap(): void;

  PCDirection(dir: PCDirection): void;
  ExecuteNext(): void;
  SkipNext(): void;

  StringModeToggle(): void;

  ReadMemory(ptr: Pointer): number;
  WriteMemory(ptr: Pointer, value: number): void;

  WriteIO(symbol: string): void;
  ReadIO(): string;

  Halt(): void;

  get IsHalted(): boolean;

  get NextInstructionCode(): string;

  get PC(): { Location: Pointer; Direction: PCDirection };

  get Stack(): number[];
}
