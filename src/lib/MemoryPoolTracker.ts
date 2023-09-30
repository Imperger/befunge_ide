export abstract class MemoryPoolTracker {
    private static readonly NoFree = -1;
    private static readonly InUse = -2;
    private static growthFactor = 2;
    private static shrinkFactor = 0.25;

    private pool: number[];
    private nextFree = MemoryPoolTracker.NoFree;
    private size = 0;

    constructor(
        capacity: number) {
        this.pool = Array.from({ length: capacity }, (_, n) => n + 1);

        if (capacity > 0) {
            this.pool[this.pool.length - 1] = MemoryPoolTracker.NoFree;

            this.nextFree = 0;
        }
    }

    Allocate(): number {
        ++this.size;

        if (this.HasFreeSlot) {
            const freeSlot = this.nextFree;

            this.nextFree = this.pool[this.nextFree];

            this.pool[freeSlot] = MemoryPoolTracker.InUse;

            return freeSlot;
        } else {
            const slot = this.pool.length;
            this.nextFree = this.pool.length + 1;

            this.pool = [
                ...this.pool,
                ...Array.from({ length: this.pool.length * MemoryPoolTracker.growthFactor - this.pool.length }, (_, n) => this.pool.length + n + 1)
            ];
            this.pool[this.pool.length - 1] = MemoryPoolTracker.NoFree;

            this.pool[slot] = MemoryPoolTracker.InUse;

            this.OnExtend(this.Capacity);

            return slot;
        }
    }

    Free(index: number): void {
        if (index >= this.pool.length || this.pool[index] !== MemoryPoolTracker.InUse) {
            return;
        }

        this.pool[index] = this.nextFree;

        this.nextFree = index;

        --this.size;

        if (this.size / this.Capacity <= MemoryPoolTracker.shrinkFactor) {
            this.OnShrink(this.GatherInUseIndices());

            this.Shrink();
        }
    }


    get Capacity(): number {
        return this.pool.length;
    }

    abstract OnShrink(inUseIndices: number[]): void;

    abstract OnExtend(extendedCapacity: number): void;

    private get HasFreeSlot(): boolean {
        return this.nextFree !== MemoryPoolTracker.NoFree;
    }

    private GatherInUseIndices(): number[] {
        const inUse: number[] = [];

        for (let n = 0; n < this.pool.length; ++n) {
            if (this.pool[n] === MemoryPoolTracker.InUse) {
                inUse.push(n);
            }
        }

        return inUse;
    }

    private Shrink(): void {
        this.pool.splice(this.size, this.pool.length - this.size);

        for (let n = 0; n < this.pool.length; ++n) {
            this.pool[n] = MemoryPoolTracker.InUse;
        }

        this.nextFree = MemoryPoolTracker.NoFree;
    }
}
