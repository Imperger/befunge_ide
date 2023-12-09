import { inject, injectable } from "inversify";

import { AppSettings } from "./AppSettings";

import { Inversify } from "@/Inversify";
import { Befunge } from "@/lib/befunge/Befunge";
import { Debugger } from "@/lib/befunge/Debugger";
import { Memory } from "@/lib/befunge/memory/Memory";
import { MemoryLimit } from "@/lib/befunge/memory/MemoryLimit";
import { Profiler } from "@/lib/befunge/Profiler";

@injectable()
export class BefungeToolbox {
    private interpreter!: Befunge;
    private debugger!: Debugger;
    private profiler!: Profiler;

    constructor(@inject(AppSettings) private settings: AppSettings) { }

    get Interpreter(): Befunge {
        return this.interpreter;
    }

    get Debugger(): Debugger {
        return this.debugger;
    }

    get Profiler(): Profiler {
        return this.profiler;
    }

    Reset(memoryLimit: MemoryLimit, memory: Memory): void {
        this.interpreter = new Befunge(memoryLimit, memory);

        this.debugger = new Debugger();
        this.interpreter.AttachDebugger(this.debugger);

        this.profiler = new Profiler(this.settings.MemoryLimit);
        this.interpreter.AttachProfiler(this.profiler);
    }
}

Inversify.bind(BefungeToolbox).toSelf().inSingletonScope();
