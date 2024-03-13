import { ZCameraBoundary } from "../AppSettings";
import { CameraService } from "../CameraService";

import { Effect } from "@/lib/effect/Effect";

export class SmoothCameraZoom implements Effect {
    private progress = 0;

    private duration = 100;

    private distance = 50;

    private isDone = false;

    constructor(
        private direction: 'in' | 'out',
        private camera: CameraService,
        private boundary: ZCameraBoundary) {
    }

    get IsDone(): boolean {
        return this.isDone;
    }

    Draw(elapsed: number): void {
        const fract = elapsed / this.duration;

        this.progress += fract;

        const delta = this.distance * fract * (this.direction === 'in' ? -1 : 1);

        const z = this.camera.Position.z + delta;

        if (z >= this.boundary.max || z <= this.boundary.min) {
            this.isDone = true;
            return;
        }

        this.camera.Translate({ z: delta });

        if (this.progress >= 1) {
            this.isDone = true;
        }
    }
}
