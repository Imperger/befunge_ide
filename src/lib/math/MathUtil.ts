import { Vec2 } from "../Primitives";

interface ExtremumResult {
    min: Vec2;
    max: Vec2;
}

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

    static Extremum(points: Vec2[]): ExtremumResult {
        if (points.length === 0) {
            throw new Error('Empty points array');
        }

        const min = { ...points[0] };
        const max = { ...points[0] };

        for (let n = 1; n < points.length; ++n) {
            const p = points[n];

            if (p.x < min.x) {
                min.x = p.x;
            }

            if (p.x > max.x) {
                max.x = p.x;
            }

            if (p.y < min.y) {
                min.y = p.y;
            }

            if (p.y > max.y) {
                max.y = p.y;
            }
        }

        return { min, max };
    }
}
