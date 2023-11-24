import { mat4 } from "gl-matrix";
import { inject, injectable } from "inversify";

import { AppSettings } from "../AppSettings";
import { InjectionToken } from "../InjectionToken";

import { DebugControls } from "./DebugControls";
import { EditDirectionControls } from "./EditDirectionControls";
import { FileControls } from "./FileControls";
import { OutputControls } from "./OutputControls";
import { SnackbarControls } from "./SnackbarControls";

import { Inversify } from "@/Inversify";
import { AsyncConstructable, AsyncConstructorActivator } from "@/lib/DI/AsyncConstructorActivator";
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

    private fileControls!: FileControls;

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) private gl: WebGL2RenderingContext,
        @inject(UIRenderer) private uiRenderer: UIRenderer,
        @inject(SnackbarControls) private snackbarControls: SnackbarControls) {
        this.settings = Inversify.get(AppSettings);

        this.BuildStickyProjection();
    }


    async AsyncConstructor(): Promise<void> {
        this.editDirectionControls = new EditDirectionControls(this.uiRenderer);
        this.debugControls = new DebugControls(this.uiRenderer);
        this.outputControls = new OutputControls(this.uiRenderer);
        this.fileControls = new FileControls(this.uiRenderer);
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

    get Snackbar(): SnackbarControls {
        return this.snackbarControls;
    }

    get FileControls(): FileControls {
        return this.fileControls;
    }

    Resize(): void {
        this.BuildStickyProjection();

        this.uiRenderer.ViewProjection = this.stickyProjection;

        this.editDirectionControls.Resize();
        this.debugControls.Resize();
        this.fileControls.Resize();
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
