type Callable = (...args: any[]) => any;

class CatchBlock<TTry extends Callable> {
    constructor(private fn: TTry, private args: Parameters<TTry>) { }

    CatchFn<TCatch extends Callable>(fn: TCatch, ...args: Parameters<TCatch>): ReturnType<TTry> | ReturnType<TCatch> {
        try {
            return this.fn(...this.args);
        } catch (e) {
            return fn(...args);
        }
    }

    CatchValue<T>(value: T): ReturnType<TTry> | T {
        try {
            return this.fn(...this.args);
        } catch (e) {
            return value;
        }
    }
}

export class ExceptionTrap {
    static Try<T extends Callable>(fn: T, ...args: Parameters<T>) {
        return new CatchBlock(fn, args);
    }
}
