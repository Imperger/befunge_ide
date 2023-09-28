import { mat4 } from "gl-matrix";

import { UIIcon } from "@/lib/UI/UIIcon";
import { UIRenderer } from "@/lib/UI/UIRednerer";

export class OverlayService {
    private uiRenderer!: UIRenderer;

    private stickyProjection!: mat4;

    static async Create(gl: WebGL2RenderingContext, zNear: number, zFar: number): Promise<OverlayService> {
        const instance = new OverlayService(gl, zNear, zFar);
        await instance.AsyncConstructor();

        return instance;
    }

    private constructor(
        private gl: WebGL2RenderingContext,
        private zNear: number,
        private zFar: number) {
        this.BuildStickyProjection();
    }

    private async AsyncConstructor(): Promise<void> {
        this.uiRenderer = await UIRenderer.Create(this.gl, this.zFar);

        const blueButton = this.uiRenderer.CreateButton(
            { x: 10, y: 10 },
            { width: 300, height: 100 },
            0,
            { fillColor: [0, 0, 1], outlineColor: [0, 1, 0] },
            { icon: UIIcon.ARROW_UP, color: [0, 1, 0] });

        const redButton = this.uiRenderer.CreateButton(
            { x: 250, y: 50 },
            { width: 300, height: 100 },
            1,
            { fillColor: [1, 0, 0], outlineColor: [0, 1, 0] },
            { icon: UIIcon.SAVE, color: [0, 1, 0] });
    }

    Resize(): void {
        this.BuildStickyProjection();

        this.uiRenderer.ViewProjection = this.stickyProjection;
    }

    Draw(): void {
        this.uiRenderer.Draw();
    }

    private BuildStickyProjection(): void {
        this.stickyProjection = mat4.ortho(
            mat4.create(),
            0, this.gl.canvas.width,
            0, this.gl.canvas.height,
            -this.zNear, -this.zFar);
    }
}
