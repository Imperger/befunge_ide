export class MathUtil {
    static Clamp(value: number, min: number, max: number): number {
        return Math.max(Math.min(value, max), min);
    }

    static Between(value: number, min: number, max: number): boolean {
        return value >= min && value <= max;
    }

    static Equal(x: number, y: number, tolerance = Number.EPSILON) {
        return Math.abs(x - y) < tolerance;
    }
}
