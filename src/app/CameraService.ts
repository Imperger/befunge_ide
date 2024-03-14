import { mat4, vec3 } from "gl-matrix";
import { inject, injectable } from "inversify";

import { AppSettings } from "./AppSettings";
import { CodeEditorRenderer } from "./CodeEditor/CodeEditorRenderer";

import { Inversify } from "@/Inversify";
import { Intersection } from "@/lib/math/Intersection";
import { Vec3 } from "@/lib/Primitives";

type CameraBackup = [number, number, number, number];

@injectable()
export class CameraService {
    private camera: mat4 = mat4.create();
    private projection: mat4 = mat4.create();
    private viewProjection: mat4 = mat4.create();

    constructor(
        @inject(AppSettings) private settings: AppSettings,
        @inject(CodeEditorRenderer) private codeEditorRenderer: CodeEditorRenderer) {
        this.UpdateProjection();
        this.UpdateViewProjection();
    }

    MoveTo(position: Partial<Vec3>): void {
        const cameraBackup: CameraBackup = [this.camera[12], this.camera[13], this.camera[14], this.camera[15]];

        position.x !== undefined && (this.camera[12] = position.x);
        position.y !== undefined && (this.camera[13] = position.y);
        position.z !== undefined && (this.camera[14] = position.z);

        this.UpdateViewProjection();

        if (!this.IsCodeEditorVisible) {
            this.RestoreCamera(cameraBackup);
        }
    }

    Translate(delta: Partial<Vec3>): void {
        const cameraBackup: CameraBackup = [this.camera[12], this.camera[13], this.camera[14], this.camera[15]];

        mat4.translate(
            this.camera,
            this.camera,
            [
                delta.x ?? 0,
                delta.y ?? 0,
                delta.z ?? 0
            ]);

        this.UpdateViewProjection();

        if (!this.IsCodeEditorVisible) {
            this.RestoreCamera(cameraBackup);
        }
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
        mat4.mul(this.viewProjection, this.projection, view);
    }

    private get IsCodeEditorVisible(): boolean {
        const cellSize = this.codeEditorRenderer.CellSize;

        const lbNDC = vec3.transformMat4(vec3.create(), [cellSize, cellSize, 0], this.viewProjection);

        const rtNDC = vec3.transformMat4(
            vec3.create(),
            [
                (this.settings.MemoryLimit.Width - 1) * cellSize,
                (this.settings.MemoryLimit.Height - 1) * cellSize,
                0
            ],
            this.viewProjection);

        return Intersection.RectangleRectangle(
            { x: lbNDC[0], y: lbNDC[1], width: rtNDC[0] - lbNDC[0], height: rtNDC[1] - lbNDC[1] },
            { x: -1, y: -1, width: 2, height: 2 });
    }

    private RestoreCamera(backup: CameraBackup): void {
        this.camera[12] = backup[0];
        this.camera[13] = backup[1];
        this.camera[14] = backup[2];
        this.camera[15] = backup[3];

        this.UpdateViewProjection();
    }
}

Inversify.bind(CameraService).toSelf().inSingletonScope();
