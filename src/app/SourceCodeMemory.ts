import { injectable } from "inversify";

import { Inversify } from "@/Inversify";
import { Memory, Pointer } from "@/lib/befunge/memory/Memory";
import { MemoryLimit } from "@/lib/befunge/memory/MemoryLimit";
import { PointerArithmetics } from "@/lib/befunge/memory/PointerArithmetics";

@injectable()
export class SourceCodeMemory implements Memory {
    private nonEmptyCells = 0;

    private target!: Memory;

    Initialize<T extends new (...args: any[]) => Memory>(ctr: T, ...args: ConstructorParameters<T>): void {
        this.nonEmptyCells = 0;
        this.target = new ctr(...args);
    }

    Read(ptr: Pointer): number {
        return this.target.Read(ptr);
    }

    Write(ptr: Pointer, value: number): void {
        const emptyValue = ' '.charCodeAt(0);
        const actual = this.target.Read(ptr);

        if (actual !== value) {
            if (actual === emptyValue) {
                ++this.nonEmptyCells;
            } else if (value === emptyValue) {
                --this.nonEmptyCells;
            }
        }

        this.target.Write(ptr, value);
    }

    Resize(limit: MemoryLimit): void {
        this.target.Resize(limit);
    }

    Clone(): Memory {
        return this.target.Clone();
    }

    get Empty(): boolean {
        return this.nonEmptyCells === 0;
    }

    get PointerArithmetics(): PointerArithmetics {
        return this.target.PointerArithmetics;
    }

    get Target(): Memory {
        return this.target;
    }
}

Inversify.bind(SourceCodeMemory).toSelf().inSingletonScope();
