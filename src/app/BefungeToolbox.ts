import { Befunge } from "@/lib/befunge/Befunge";
import { Debugger } from "@/lib/befunge/Debugger";
import { Memory } from "@/lib/befunge/memory/Memory";
import { MemoryLimit } from "@/lib/befunge/memory/MemoryLimit";

export class BefungeToolbox {
    private interpreter!: Befunge;
    private debugger!: Debugger;

    get Interpreter(): Befunge {
        return this.interpreter;
    }

    get Debugger(): Debugger {
        return this.debugger;
    }

    Reset(memoryLimit: MemoryLimit, memory: Memory): void {
        this.interpreter = new Befunge(memoryLimit, memory);

        this.debugger = new Debugger();
        this.interpreter.AttachDebugger(this.debugger);
    }
}
