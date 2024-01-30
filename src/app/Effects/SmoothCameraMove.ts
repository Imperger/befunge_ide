import { mat4, vec2 } from "gl-matrix";

import { Effect } from "@/lib/effect/Effect";
import { Camera, Viewport } from "@/lib/renderer/Camera";

export type ViewProjectionFetcher = () => mat4;

export class SmoothCameraMove implements Effect {
    private isDone = false;

    private progress = 0;

    private duration = 200;

    constructor(
        private camera: mat4,
        private destination: vec2,
        private viewport: Viewport,
        private viewProjectionFetcher: ViewProjectionFetcher
    ) { }

    get IsDone(): boolean {
        return this.isDone;
    }

    Draw(elapsed: number): void {
        const fract = elapsed / this.duration;

        this.progress += fract;

        const movement = vec2.mul(vec2.create(), this.destination, vec2.fromValues(fract, fract));

        const delta = Camera.UnprojectMovement(
            { x: movement[0], y: -movement[1] },
            { a: 0, b: 0, c: 1, d: 0 },
            this.viewProjectionFetcher(),
            this.viewport);

        mat4.translate(
            this.camera,
            this.camera,
            [delta.x, delta.y, 0]);

        if (this.progress >= 1) {
            this.isDone = true;
        }
    }
}
