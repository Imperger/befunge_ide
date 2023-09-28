import { vec3 } from 'gl-matrix';

export interface Plane {
    a: number;
    b: number;
    c: number;
    d: number
}

export type Vec3 = [number, number, number];

export interface Line {
    a: Vec3;
    b: Vec3;
}

export class Intersection {
    static PlaneLine(plane: Plane, line: Line): Vec3 {
        const d0 = vec3.dot([plane.a, plane.b, plane.c], line.a) + plane.d;
        const d1 = vec3.dot([plane.a, plane.b, plane.c], line.b) + plane.d;
        const t = -d0 / (d1 - d0);
        const intersection = vec3.add(vec3.create(), line.a, vec3.scale(vec3.create(), vec3.sub(vec3.create(), line.b, line.a), t));

        return [intersection[0], intersection[1], intersection[2]];
    }
}
