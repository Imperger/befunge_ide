export interface Index2D {
    column: number;
    row: number;
}

export class Array2D<T> {
    private data!: T[];

    private constructor(
        private readonly width: number,
        private readonly height: number,
        private provider?: () => T) {
        if (provider) {
            this.Initialize();
        }
    }

    static WithConstructor<T>(width: number, height: number, constructor: new () => T): Array2D<T> {
        return new Array2D<T>(width, height, () => new constructor());
    }

    static WithProvider<T>(width: number, height: number, provider: () => T): Array2D<T> {
        return new Array2D<T>(width, height, provider);
    }

    Get(pos: Index2D): T {
        return this.data[this.CoordsToIndex(pos)];
    }

    Set(pos: Index2D, value: T): void {
        this.data[this.CoordsToIndex(pos)] = value;
    }

    Update(pos: Index2D, updater: (value: T) => T): void {
        const idx = this.CoordsToIndex(pos);

        this.data[idx] = updater(this.data[idx]);
    }

    Map<TRet>(fn: (value: T, idx: Index2D, arr: Array2D<T>) => TRet): Array2D<TRet> {
        const mapped = new Array2D<TRet>(this.width, this.height);

        mapped.data = this.data.map((value: T, idx: number) => fn(value, this.IndexToCoord(idx), this));

        return mapped;
    }

    ForEach(fn: (value: T, idx: Index2D, arr: Array2D<T>) => void): void {
        this.data.forEach((value: T, idx: number) => fn(value, this.IndexToCoord(idx), this));
    }

    Every(fn: (value: T, idx: Index2D, arr: Array2D<T>) => boolean): boolean {
        return this.data.every((value: T, idx: number) => fn(value, this.IndexToCoord(idx), this))
    }

    Equals(arr: Array2D<T>): boolean {
        if (arr.width !== this.width || arr.height !== this.height) {
            return false;
        }

        return this.Every((value, index) => value === arr.Get(index));
    }

    get RawRef(): T[] {
        return this.data;
    }

    private Initialize(): void {
        this.data = Array.from({ length: this.width * this.height }, () => this.provider!());
    }

    private CoordsToIndex(pos: Index2D): number {
        return pos.row * this.width + pos.column;
    }

    private IndexToCoord(index: number): Index2D {
        const row = Math.floor(index / this.width);
        const column = index - row * this.width;

        return { column, row };
    }
}
