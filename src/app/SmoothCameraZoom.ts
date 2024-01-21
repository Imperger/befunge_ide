import { mat4 } from "gl-matrix";

import { ZCameraBoundary } from "./AppSettings";

export class SmoothCameraZoom {
    private progress = 0;

    private duration = 100;

    private distance = 50;

    private source: mat4 = mat4.create();

    constructor(private direction: 'in' | 'out') { }

    Update(elapsed: number, camera: mat4, boundary: ZCameraBoundary): boolean {
        const fract = elapsed / this.duration;

        this.progress += fract;

        const delta = this.distance * fract * (this.direction === 'in' ? -1 : 1);

        const z = camera[14] + delta;

        if (z >= boundary.max || z <= boundary.min) {
            return true;
        }

        mat4.copy(this.source, camera);
        mat4.translate(
            camera,
            this.source,
            [0, 0, delta]);

        return this.progress >= 1;
    }
}
