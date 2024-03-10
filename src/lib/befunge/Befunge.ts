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
import { Instruction } from './instructions/Instruction';
import { IOPort } from './IOPort';
import { Memory, Pointer } from './memory/Memory';
import { MemoryLimit } from './memory/MemoryLimit';
import { Profiler } from './Profiler';

export type MemoryWriteInterceptor = (ptr: Pointer, value: number) => void;
export type MemoryInterceptorReleaser = () => void;

class MemoryWriteInstructionInterceptor implements Instruction {
  constructor(
    private origin: MemoryWrite,
    private interceptor: MemoryWriteInterceptor) { }

  get Code(): string {
    return this.origin.Code;
  }

  Execute(cpu: CPU): void {
    const [value, x, y] = cpu.Stack.slice(-3);

    this.interceptor({ x: x, y: y }, value);

    this.origin.Execute(cpu);
  }
}

export class Befunge {
  private io: IOPort;

  private cpu: CPU;

  private instructionsExecuted = 0;

  private memoryWriteInterceptors: MemoryWriteInterceptor[] = [];

  constructor(private memoryLimit: MemoryLimit, private memory: Memory) {
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
      new MemoryWriteInstructionInterceptor(
        new MemoryWrite(),
        (ptr: Pointer, value: number) => this.OnMemoryWrite(ptr, value)),
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

    const ptr: Pointer = { x: 0, y: 0 };

    for (const symbol of code) {
      if (symbol === '\n') {
        ptr.x = 0;
        ++ptr.y;
      } else {
        this.memory.Write(ptr, symbol.charCodeAt(0));
        ++ptr.x;
      }
    }
  }

  SetInput(input: string): void {
    this.io.InputWrite(input);
  }

  /**
   * Execute code loaded by `LoadExecutable`.
   * Second call to `Run` or `RunFor` with same instance is forbidden, you should create new instance to each execution
   */
  Run(): void {
    while (!this.cpu.IsHalted) {
      this.cpu.ExecuteNext();
    }
  }

  /**
   * Execute code loaded by `LoadExecutable` until end or timeout.
   * Second call to `Run` or `RunFor` with same instance is forbidden, you should create new instance to each execution
   * @param timeout timeout
   * @returns true if the program successfully finished, false if it terminated due to the timeout
   */
  RunFor(timeout: number): boolean {
    const startTime = Date.now();
    const instructionsSkipPerTimeoutCheck = 100000;

    for (this.instructionsExecuted = 0;
      !this.cpu.IsHalted && (this.instructionsExecuted % instructionsSkipPerTimeoutCheck !== 0 || Date.now() - startTime < timeout);
      ++this.instructionsExecuted) {
      this.cpu.ExecuteNext();
    }

    return this.IsHalted;
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

  CollectOutputUntil(maxLength: number): string {
    let output = '';

    for (let readed = 0; this.io.HasOutput && readed < maxLength; ++readed) {
      output += this.io.OutputRead();
    }

    return output;
  }

  AttachDebugger(d: Debugger): void {
    d.AttachCPU(this.cpu);
  }

  AttachProfiler(profiler: Profiler): void {
    profiler.AttachCPU(this.cpu);
  }

  AddMemoryWriteInterceptor(interceptor: MemoryWriteInterceptor): MemoryInterceptorReleaser {
    this.memoryWriteInterceptors.push(interceptor);

    return () => {
      const rmIdx = this.memoryWriteInterceptors.indexOf(interceptor);

      if (rmIdx !== -1) {
        this.memoryWriteInterceptors.splice(rmIdx, 1);
      }
    };
  }

  private OnMemoryWrite(ptr: Pointer, value: number): void {
    this.memoryWriteInterceptors.forEach(fn => fn(ptr, value));
  }

  get NextInstruction() {
    return this.cpu.NextInstructionCode;
  }

  get IsHalted(): boolean {
    return this.cpu.IsHalted;
  }

  get InstructionsExecuted(): number {
    return this.instructionsExecuted;
  }

  get IP(): Pointer {
    return this.cpu.PC.Location;
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
