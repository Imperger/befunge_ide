import { mat4 } from "gl-matrix";
import { inject, injectable } from "inversify";

import { AppSettings } from "./AppSettings";

import { Inversify } from "@/Inversify";
import { Vec3 } from "@/lib/Primitives";

@injectable()
export class CameraService {
    private camera: mat4 = mat4.create();
    private projection: mat4 = mat4.create();
    private viewProjection: mat4 = mat4.create();

    constructor(@inject(AppSettings) private settings: AppSettings) {
        this.UpdateProjection();
        this.UpdateViewProjection();
    }

    MoveTo(position: Partial<Vec3>): void {
        position.x !== undefined && (this.camera[12] = position.x);
        position.y !== undefined && (this.camera[13] = position.y);
        position.z !== undefined && (this.camera[14] = position.z);

        this.UpdateViewProjection();
    }

    Translate(delta: Partial<Vec3>): void {
        mat4.translate(
            this.camera,
            this.camera,
            [
                delta.x ?? 0,
                delta.y ?? 0,
                delta.z ?? 0
            ]);

        this.UpdateViewProjection();
    }

    get Position(): Vec3 {
        return {
            x: this.camera[12],
            y: this.camera[13],
            z: this.camera[14]
        };
    }

    get ViewProjection(): mat4 {
        return this.viewProjection;
    }

    Resize(): void {
        this.UpdateProjection();
        this.UpdateViewProjection();
    }

    private UpdateProjection(): void {
        mat4.perspective(
            this.projection,
            this.settings.Fovy,
            this.settings.AspectRatio,
            this.settings.ZNear,
            this.settings.ZFar);
    }

    private UpdateViewProjection(): void {
        const view = mat4.invert(mat4.create(), this.camera);
        this.viewProjection = mat4.mul(mat4.create(), this.projection, view);
    }
}

Inversify.bind(CameraService).toSelf().inSingletonScope();
