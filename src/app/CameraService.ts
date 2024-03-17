import { mat4, vec3 } from "gl-matrix";
import { inject, injectable } from "inversify";

import { AppSettings } from "./AppSettings";
import { CodeEditorRenderer } from "./CodeEditor/CodeEditorRenderer";

import { Inversify } from "@/Inversify";
import { Transformation } from "@/lib/math/Transformation";
import { Vec3 } from "@/lib/Primitives";
import { Camera } from "@/lib/renderer/Camera";

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
        position.x !== undefined && (this.camera[12] = position.x);
        position.y !== undefined && (this.camera[13] = position.y);
        position.z !== undefined && (this.camera[14] = position.z);

        this.UpdateViewProjection();
        this.MaintainCodeEditorVisible();
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
        this.MaintainCodeEditorVisible();
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

    private MaintainCodeEditorVisible(): void {
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

        const ndcCompensation = Transformation.ShortestMoveForIntersection(
            { lb: { x: lbNDC[0], y: lbNDC[1] }, rt: { x: rtNDC[0], y: rtNDC[1] } },
            { lb: { x: -1, y: -1 }, rt: { x: 1, y: 1 } });

        if (ndcCompensation.x === 0 && ndcCompensation.y === 0) {
            return;
        }

        const screenCompensation = {
            x: ndcCompensation.x * this.settings.ViewDimension.Width / 2,
            y: ndcCompensation.y * this.settings.ViewDimension.Height / 2
        };

        const worldCompensation = Camera.UnprojectMovement(
            { x: screenCompensation.x, y: -screenCompensation.y },
            { a: 0, b: 0, c: 1, d: 0 },
            this.ViewProjection,
            {
                width: this.settings.ViewDimension.Width,
                height: this.settings.ViewDimension.Height
            });

        mat4.translate(
            this.camera,
            this.camera,
            [
                worldCompensation.x,
                worldCompensation.y,
                0
            ]);

        this.UpdateViewProjection();
    }
}

Inversify.bind(CameraService).toSelf().inSingletonScope();
