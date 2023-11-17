import { mat4 } from "gl-matrix";
import { inject, injectable } from "inversify";

import { AppSettings } from "../AppSettings";
import { InjectionToken } from "../InjectionToken";

import { DebugControls } from "./DebugControls";
import { EditDirectionControls } from "./EditDirectionControls";
import { OutputControls } from "./OutputControls";

import { Inversify } from "@/Inversify";
import { AsyncConstructable, AsyncConstructorActivator } from "@/lib/DI/AsyncConstructorActivator";
import { UIIcon } from "@/lib/UI/UIIcon";
import { UILabel } from "@/lib/UI/UILabel/UILabel";
import { UIRenderer } from "@/lib/UI/UIRednerer";

@injectable()
export class OverlayService implements AsyncConstructable {
    private settings: AppSettings;

    private stickyProjection!: mat4;

    private outputLabel!: UILabel;

    private editDirectionControls!: EditDirectionControls;

    private debugControls!: DebugControls;

    private outputControls!: OutputControls;

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) private gl: WebGL2RenderingContext,
        @inject(UIRenderer) private uiRenderer: UIRenderer) {
        this.settings = Inversify.get(AppSettings);

        this.BuildStickyProjection();
    }


    async AsyncConstructor(): Promise<void> {
        this.editDirectionControls = new EditDirectionControls(this.uiRenderer);
        this.debugControls = new DebugControls(this.uiRenderer);
        this.outputControls = new OutputControls(this.uiRenderer);

        const alert = this.uiRenderer.CreateAlert(
            { x: 400, y: 400 },
            { width: 300, height: 100 },
            1,
            { icon: UIIcon.Play, color: [1, 0, 0] },
            { text: 'I\'m alert', lineHeight: 16 },
            { fillColor: [0, 1, 0] });
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


Inversify.bind(OverlayService).toSelf().inSingletonScope().onActivation(AsyncConstructorActivator);