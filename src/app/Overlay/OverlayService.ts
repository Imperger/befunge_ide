import { mat4 } from "gl-matrix";

import { AppSettings } from "../AppSettings";

import { DebugControls } from "./DebugControls";
import { EditDirectionControls } from "./EditDirectionControls";
import { OutputControls } from "./OutputControls";

import { Inversify } from "@/Inversify";
import { UILabel } from "@/lib/UI/UILabel/UILabel";
import { UIRenderer } from "@/lib/UI/UIRednerer";

export class OverlayService {
    private settings: AppSettings;

    private uiRenderer!: UIRenderer;

    private stickyProjection!: mat4;

    private outputLabel!: UILabel;

    private editDirectionControls!: EditDirectionControls;

    private debugControls!: DebugControls;

    private outputControls!: OutputControls;

    static async Create(gl: WebGL2RenderingContext): Promise<OverlayService> {
        const instance = new OverlayService(gl);
        await instance.AsyncConstructor();

        return instance;
    }

    private constructor(
        private gl: WebGL2RenderingContext) {
        this.settings = Inversify.get(AppSettings);

        this.BuildStickyProjection();
    }

    private async AsyncConstructor(): Promise<void> {
        this.uiRenderer = await UIRenderer.Create(this.gl);

        this.editDirectionControls = new EditDirectionControls(this.uiRenderer);
        this.debugControls = new DebugControls(this.uiRenderer);
        this.outputControls = new OutputControls(this.uiRenderer);
    }

    get EditDirectionControls(): EditDirectionControls {
        return this.editDirectionControls;
    }

    get DebugControls(): DebugControls {
        return this.debugControls;
    }

    get OutputControls(): OutputControls {
        return this.outputControls;
    }

    Resize(): void {
        this.BuildStickyProjection();

        this.uiRenderer.ViewProjection = this.stickyProjection;

        this.editDirectionControls.Resize();
        this.debugControls.Resize();
    }

    Touch(e: MouseEvent): boolean {
        return this.uiRenderer.Touch(e);
    }

    Draw(): void {
        this.uiRenderer.Draw();
    }

    private BuildStickyProjection(): void {
        this.stickyProjection = mat4.ortho(
            mat4.create(),
            0, this.gl.canvas.width,
            0, this.gl.canvas.height,
            -this.settings.ZNear, -this.settings.ZFar);
    }
}
