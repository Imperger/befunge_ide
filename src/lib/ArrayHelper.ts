type Comparator<T> = (a: T, b: T) => boolean;

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
}
