import { Array2D, Index2D } from "../containers/Array2D";
import { EnumSize } from "../EnumSize";

import { CPU, PCDirection } from "./CPU/CPU";
import { MemoryLimit } from "./memory/MemoryLimit";

export class CellHitsFlow {
    private stats: Array2D<number>;

    constructor() {
        const directionsCount = EnumSize(PCDirection);
        this.stats = Array2D.WithProvider(directionsCount, directionsCount, () => 0);
    }

    Update(index: Index2D, updater: (value: number) => number): void {
        this.stats.Update(index, updater);
    }

    get Total(): number {
        let totalHits = 0;
        this.stats.ForEach(x => totalHits += x);

        return totalHits;
    }

    get Normalized(): number[] {
        const total = this.Total;

        return this.stats.Map(x => x / total).RawRef;
    }
}

export class Profiler {
    private target: CPU | null = null;

    constructor(private memoryLimit: MemoryLimit) { }

    AttachCPU(cpu: CPU): void {
        this.target = cpu;
    }

    CellHeatmapFor(timeout: number): Array2D<CellHitsFlow> | null {
        if (this.target === null) {
            throw new Error('Attempting to gather heatmap without attached any cpu. Call AttachCPU first.');
        }

        const startTime = Date.now();
        const instructionsSkipPerTimeoutCheck = 100000;

        const heatmap = Array2D.WithProvider(
            this.memoryLimit.Width,
            this.memoryLimit.Height,
            () => new CellHitsFlow());

        for (let instructionsExecuted = 0;
            !this.target.IsHalted && (instructionsExecuted % instructionsSkipPerTimeoutCheck !== 0 || Date.now() - startTime < timeout);
            ++instructionsExecuted) {

            const hitsFlow = heatmap.Get({
                column: this.target.PC.Location.x,
                row: this.target.PC.Location.y
            });

            const from = this.target.PC.Direction;

            this.target.ExecuteNext();

            const to = this.target.PC.Direction;

            hitsFlow.Update({
                column: from,
                row: to
            }, x => x + 1);
        }


        return this.target.IsHalted ? heatmap : null;
    }
}
