import { vec2, vec3, vec4, mat4 } from 'gl-matrix';

import { Intersection, Plane } from '../math/Intersection';
import { Vec2 } from '../Primitives';

export interface WndCoord {
    x: number;
    y: number;
    z: number;
}

export interface Viewport {
    width: number;
    height: number;
}

export class Camera {
    static Unproject(position: WndCoord, viewProjection: mat4, viewport: Viewport): vec4 {
        const vec = vec3.fromValues(position.x, position.y, position.z);

        const v = vec4.fromValues(
            2 * vec[0] / viewport.width - 1,
            1 - 2 * vec[1] / viewport.height,
            2 * vec[2] - 1,
            1
        );

        const invertViewProj = mat4.invert(mat4.create(), viewProjection);

        const pos = vec4.transformMat4(vec4.create(), v, invertViewProj);

        pos[3] = 1 / pos[3];
        pos[0] *= pos[3];
        pos[1] *= pos[3];
        pos[2] *= pos[3];

        return pos;
    }

    static UnprojectMovement(movement: Vec2, plane: Plane, viewProjection: mat4, viewport: Viewport): Vec2 {
        const posNear0 = Camera.Unproject({ x: 0, y: 0, z: 0 }, viewProjection, viewport);
        const posFar0 = Camera.Unproject({ x: 0, y: 0, z: 1 }, viewProjection, viewport);

        const intersection0 = Intersection.PlaneLine(
            plane,
            { a: [posNear0[0], posNear0[1], posNear0[2]], b: [posFar0[0], posFar0[1], posFar0[2]] });

        const posNear1 = Camera.Unproject({ x: movement.x, y: movement.y, z: 0 }, viewProjection, viewport);
        const posFar1 = Camera.Unproject({ x: movement.x, y: movement.y, z: 1 }, viewProjection, viewport);

        const intersection1 = Intersection.PlaneLine(
            plane,
            { a: [posNear1[0], posNear1[1], posNear1[2]], b: [posFar1[0], posFar1[1], posFar1[2]] });

        const delta = vec2.sub(
            vec2.create(),
            vec2.fromValues(intersection0[0], intersection0[1]),
            vec2.fromValues(intersection1[0], intersection1[1]));

        return { x: delta[0], y: delta[1] };
    }
}
