import { CPU } from './CPU/CPU';
import { CPUImpl } from './CPU/CPUImpl';
import { Debugger } from './Debugger';
import {
  Add,
  Bridge,
  Divide,
  EndProgramm,
  GreatherThan,
  HoriontalIf,
  InputASCII,
  InputInteger,
  MemoryWrite,
  Modulo,
  Multiply,
  Negation,
  PCDirectionDown,
  PCDirectionLeft,
  PCDirectionRandom,
  PCDirectionRight,
  PCDirectionUp,
  PrintASCII,
  PrintInteger,
  StackDuplicate,
  StackPop,
  StackPushDigit,
  StackSwap,
  Subtract,
  ToggleStringMode,
  VerticalIf,
  MemoryRead,
  NoOperation
} from './instructions';
import { IOPort } from './IOPort';
import { ArrayMemory } from './memory/ArrayMemory';
import { Memory, Pointer } from './memory/Memory';
import { MemoryLimit } from './memory/MemoryLimit';

export class Befunge {
  private memory: Memory;

  private io: IOPort;

  private cpu: CPU;

  constructor(private memoryLimit: MemoryLimit) {
    this.memory = new ArrayMemory(memoryLimit);
    this.io = new IOPort();
    this.cpu = new CPUImpl(this.memory, this.io, [
      new Add(),
      new Subtract(),
      new Multiply(),
      new Divide(),
      new Modulo(),
      new Negation(),
      new GreatherThan(),
      new PCDirectionRight(),
      new PCDirectionLeft(),
      new PCDirectionDown(),
      new PCDirectionUp(),
      new PCDirectionRandom(),
      new HoriontalIf(),
      new VerticalIf(),
      new ToggleStringMode(),
      new StackDuplicate(),
      new StackSwap(),
      new StackPop(),
      new PrintInteger(),
      new PrintASCII(),
      new Bridge(),
      new MemoryWrite(),
      new MemoryRead(),
      new InputInteger(),
      new InputASCII(),
      new EndProgramm(),
      new NoOperation(),
      ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => new StackPushDigit(d))
    ]);
  }

  LoadExecutable(code: string): void {
    if (this.IsMemoryLimitDynamic) {
      const memoryRequirements = Befunge.ExecutableMemoryLimit(code);

      if (
        memoryRequirements.Width > this.memoryLimit.Width ||
        memoryRequirements.Height > this.memoryLimit.Height
      ) {
        this.memory.Resize(memoryRequirements);
      }
    }

    const ptr: Pointer = { X: 0, Y: 0 };

    for (const symbol of code) {
      if (symbol === '\n') {
        ptr.X = 0;
        ++ptr.Y;
      } else {
        this.memory.Write(ptr, symbol.charCodeAt(0));
        ++ptr.X;
      }
    }
  }

  SetInput(input: string): void {
    this.io.InputWrite(input);
  }

  Run(): void {
    while (!this.cpu.IsHalted) {
      this.cpu.ExecuteNext();
    }
  }

  RunNext(): void {
    this.cpu.ExecuteNext();
  }

  CollectOutput(): string {
    let output = '';

    while (this.io.HasOutput) {
      output += this.io.OutputRead();
    }

    return output;
  }

  AttachDebugger(d: Debugger): void {
    d.AttachCPU(this.cpu);
  }

  get NextInstruction() {
    return this.cpu.NextInstructionCode;
  }

  get IsHalted(): boolean {
    return this.cpu.IsHalted;
  }

  private get IsMemoryLimitDynamic(): boolean {
    return (
      this.memoryLimit.Width === Number.POSITIVE_INFINITY ||
      this.memoryLimit.Height === Number.POSITIVE_INFINITY
    );
  }

  private static ExecutableMemoryLimit(code: string): MemoryLimit {
    let maxRowLength = 0;
    let maxColumnLength = 0;
    let rowLength = 0;

    for (const instruction of code) {
      if (instruction === '\n') {
        if (maxRowLength < rowLength) {
          maxRowLength = rowLength;
        }

        rowLength = 0;
        ++maxColumnLength;
      } else {
        ++rowLength;
      }
    }

    return { Width: maxRowLength, Height: maxColumnLength };
  }
}
