import { Array2D } from "../containers/Array2D";

import { CPU } from "./CPU/CPU";
import { MemoryLimit } from "./memory/MemoryLimit";

export class Profiler {
    private target: CPU | null = null;

    constructor(private memoryLimit: MemoryLimit) { }

    AttachCPU(cpu: CPU): void {
        this.target = cpu;
    }

    CellHeatmapFor(timeout: number): Array2D<number> | null {
        if (this.target === null) {
            throw new Error('Attempting to gather heatmap without attached any cpu. Call AttachCPU first.');
        }

        const startTime = Date.now();
        const instructionsSkipPerTimeoutCheck = 100000;

        const heatmap = Array2D.WithProvider(
            this.memoryLimit.Width,
            this.memoryLimit.Height,
            () => 0);

        for (let instructionsExecuted = 0;
            !this.target.IsHalted && (instructionsExecuted % instructionsSkipPerTimeoutCheck !== 0 || Date.now() - startTime < timeout);
            ++instructionsExecuted) {
            heatmap.Update({
                column: this.target.PC.Location.x,
                row: this.target.PC.Location.y
            },
                x => x + 1);

            this.target.ExecuteNext();
        }


        return this.target.IsHalted ? heatmap : null;
    }
}
