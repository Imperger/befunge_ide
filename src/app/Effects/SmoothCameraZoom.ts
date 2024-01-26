import { mat4 } from "gl-matrix";

import { ZCameraBoundary } from "../AppSettings";

import { Effect } from "@/lib/effect/Effect";

export class SmoothCameraZoom implements Effect {
    private progress = 0;

    private duration = 100;

    private distance = 50;

    private isDone = false;

    constructor(
        private direction: 'in' | 'out',
        private camera: mat4,
        private boundary: ZCameraBoundary) {
    }

    get IsDone(): boolean {
        return this.isDone;
    }

    Draw(elapsed: number): void {
        const fract = elapsed / this.duration;

        this.progress += fract;

        const delta = this.distance * fract * (this.direction === 'in' ? -1 : 1);

        const z = this.camera[14] + delta;

        if (z >= this.boundary.max || z <= this.boundary.min) {
            this.isDone = true;
            return;
        }

        mat4.translate(
            this.camera,
            this.camera,
            [0, 0, delta]);

        if (this.progress >= 1) {
            this.isDone = true;
        }
    }
}
