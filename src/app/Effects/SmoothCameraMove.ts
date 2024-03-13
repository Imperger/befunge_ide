import { vec2 } from "gl-matrix";

import { CameraService } from "../CameraService";

import { Effect } from "@/lib/effect/Effect";
import { Camera, Viewport } from "@/lib/renderer/Camera";

export class SmoothCameraMove implements Effect {
    private isDone = false;

    private progress = 0;

    private duration = 400;

    constructor(
        private camera: CameraService,
        private destination: vec2,
        private viewport: Viewport
    ) { }

    get IsDone(): boolean {
        return this.isDone;
    }

    Draw(elapsed: number): void {
        let fract = elapsed / this.duration;

        this.progress += fract;

        if (this.progress > 1) {
            fract -= this.progress - 1;
        }

        const movement = vec2.mul(vec2.create(), this.destination, vec2.fromValues(fract, fract));

        const delta = Camera.UnprojectMovement(
            { x: movement[0], y: -movement[1] },
            { a: 0, b: 0, c: 1, d: 0 },
            this.camera.ViewProjection,
            this.viewport);

        this.camera.Translate({
            x: delta.x,
            y: delta.y
        });

        if (this.progress >= 1) {
            this.isDone = true;
        }
    }
}
