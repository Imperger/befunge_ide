import { CPU, PCDirection } from './CPU/CPU';
import { Pointer } from './memory/Memory';

export type BreakpointReleaser = () => void;

export interface PcLocationCondition {
  Location: Pointer;
  Direction?: PCDirection;
}

interface StackCondition {
  Size?: ValueCondition;
  Value?: ValueCondition;
}

interface ValueCondition {
  Condition: ComparsionCondition;
  Value: number;
}

export enum ComparsionCondition {
  Less,
  LessEqual,
  Greater,
  GreaterEqual,
  Equal
}

export interface BreakpointCondition {
  PC?: PcLocationCondition;
  Stack?: StackCondition;
}

export class Debugger {
  private target: CPU | null = null;

  private pcLocationBrk = new Map<number, Map<number, BreakpointCondition[]>>();
  private stackBrk: BreakpointCondition[] = [];

  private noDebug = false;

  AttachCPU(cpu: CPU): void {
    this.target = cpu;
  }

  get IsHalted(): boolean {
    return this.target?.IsHalted ?? true;
  }

  RunNext(): BreakpointCondition[] {
    if (!this.target?.IsHalted) {
      if (this.noDebug) {
        this.noDebug = false;
      } else {
        const triggered = this.BreakpointsCheck();

        if (triggered.length > 0) {
          this.noDebug = true;
          return triggered;
        }
      }

      this.target?.ExecuteNext();
    }

    return [];
  }

  RunFor(timeout: number): BreakpointCondition[] | null {
    const startTime = Date.now();
    const instructionsSkipPerTimeoutCheck = 100000;

    let breakpoints: BreakpointCondition[] = [];

    for (let instructionsExecuted = 0;
      !this.target?.IsHalted &&
      breakpoints.length === 0 &&
      (instructionsExecuted % instructionsSkipPerTimeoutCheck !== 0 || Date.now() - startTime < timeout);
      ++instructionsExecuted) {
      breakpoints = this.RunNext();
    }

    return breakpoints.length > 0 ? breakpoints : null;
  }

  SetBreakpoint(brk: BreakpointCondition): BreakpointReleaser {
    if (brk.PC) {
      let column = this.pcLocationBrk.get(brk.PC.Location.x);

      if (!column) {
        column = new Map<number, BreakpointCondition[]>();
        column.set(brk.PC.Location.y, []);

        this.pcLocationBrk.set(brk.PC.Location.x, column);
      }

      let row = column.get(brk.PC.Location.y);

      if (row === undefined) {
        row = [];
        column.set(brk.PC.Location.y, row);
      }

      row.push(brk);
    }

    if (brk.Stack && (brk.Stack.Size || brk.Stack.Value)) {
      this.stackBrk.push(brk);
    }

    return () => this.BreakpointReleaser(brk);
  }

  get PCBreakpoints(): PcLocationCondition[] {
    return [...this.pcLocationBrk.values()]
      .flatMap(x => [...x.values()])
      .flatMap(x => [...x])
      .map(x => x.PC!);
  }

  get Stack(): number[] {
    return this.target?.Stack ?? [];
  }

  private BreakpointReleaser(brk: BreakpointCondition): void {
    if (brk.PC) {
      const column = this.pcLocationBrk.get(brk.PC.Location.x);
      const brks = column?.get(brk.PC.Location.y);

      if (brks) {
        if (brks.length === 1) {
          column?.delete(brk.PC.Location.y);
        } else {
          const toRemove = brks.indexOf(brk);

          if (toRemove >= 0) {
            brks.splice(toRemove, 1);
          }
        }
      }
    }

    if (brk.Stack) {
      const toRemove = this.stackBrk.indexOf(brk);

      if (toRemove >= 0) {
        this.stackBrk.splice(toRemove, 1);
      }
    }
  }

  private BreakpointsCheck(): BreakpointCondition[] {
    return [...this.BreakpointCheckPC(), ...this.BreakpointCheckStack()];
  }

  private BreakpointCheckPC(): BreakpointCondition[] {
    if (this.target === null) {
      return [];
    }

    const column = this.pcLocationBrk.get(this.target.PC.Location.x);

    if (!column) {
      return [];
    }

    const brks = column.get(this.target.PC.Location.y);

    return (
      brks?.filter(brk => {
        if (brk) {
          if (brk.PC?.Direction === undefined) {
            return true;
          } else {
            return brk.PC.Direction === this.target!.PC.Direction;
          }
        } else {
          return false;
        }
      }) ?? []
    );
  }

  private BreakpointCheckStack(): BreakpointCondition[] {
    if (this.target === null) {
      return [];
    }

    return this.stackBrk.filter(brk => {
      if (brk.Stack?.Size?.Value !== this.target?.Stack.length) {
        return false;
      }

      if (brk.Stack?.Value) {
        if (this.target?.Stack.length === 0) {
          return false;
        }

        const top = this.target!.Stack[this.target!.Stack.length - 1];

        switch (brk.Stack.Value.Condition) {
          case ComparsionCondition.Equal:
            return brk.Stack.Value.Value === top;
          case ComparsionCondition.Less:
            return brk.Stack.Value.Value < top;
          case ComparsionCondition.LessEqual:
            return brk.Stack.Value.Value <= top;
          case ComparsionCondition.Greater:
            return brk.Stack.Value.Value > top;
          case ComparsionCondition.GreaterEqual:
            return brk.Stack.Value.Value >= top;
        }
      }

      return true;
    });
  }
}
