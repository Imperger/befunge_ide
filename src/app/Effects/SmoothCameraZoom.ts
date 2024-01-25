import { mat4 } from "gl-matrix";

import { ZCameraBoundary } from "../AppSettings";

import { Effect } from "@/lib/effect/Effect";

export class SmoothCameraZoom implements Effect {
    private static last: SmoothCameraZoom | null = null;

    private progress = 0;

    private duration = 100;

    private distance = 50;

    private isDone = false;

    constructor(
        private direction: 'in' | 'out',
        private camera: mat4,
        private boundary: ZCameraBoundary) {
        SmoothCameraZoom.last = this;
    }

    get IsDone(): boolean {
        return this.isDone;
    }

    Draw(elapsed: number): void {
        if (SmoothCameraZoom.last !== this) {
            this.isDone = true;
            return;
        }

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
