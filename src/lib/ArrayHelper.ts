type Comparator<T> = (a: T, b: T) => boolean;

export interface ArrayLikeMut<T> {
    readonly length: number;
    [n: number]: T;
}

export class ArrayHelper {
    static Max<T>(array: T[], comparator: Comparator<T>): T {
        if (array.length === 1) {
            return array[0];
        }

        let max = array[0];
        for (let n = 1; n < array.length; ++n) {
            if (comparator(max, array[n])) {
                max = array[n];
            }
        }

        return max;
    }

    static Min<T>(array: T[], comparator: Comparator<T>): T {
        if (array.length === 1) {
            return array[0];
        }

        let min = array[0];
        for (let n = 1; n < array.length; ++n) {
            if (comparator(array[n], min)) {
                min = array[n];
            }
        }

        return min;
    }

    static Copy<T>(dest: ArrayLikeMut<T>, destStart: number, src: ArrayLikeMut<T>, srcStart: number, length: number): void {
        for (let n = 0; n < length; ++n) {
            dest[destStart + n] = src[srcStart + n];
        }
    }
}
