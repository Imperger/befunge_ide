import { mat4 } from "gl-matrix";
import { inject, injectable } from "inversify";

import { AppSettings } from "../AppSettings";
import { InjectionToken } from "../InjectionToken";

import { DebugControls } from "./DebugControls";
import { EditDirectionControls } from "./EditDirectionControls";
import { FileControls } from "./FileControls";
import { InputControls } from "./InputControls";
import { OutputControls } from "./OutputControls";
import { SnackbarControls } from "./SnackbarControls";
import { StackControls } from "./StackControls";

import { Inversify } from "@/Inversify";
import { AsyncConstructable, AsyncConstructorActivator } from "@/lib/DI/AsyncConstructorActivator";
import { InputReceiver } from "@/lib/UI/InputReceiver";
import { UIRenderer } from "@/lib/UI/UIRenderer";

@injectable()
export class OverlayService implements AsyncConstructable {
    private settings: AppSettings;

    private stickyProjection!: mat4;

    private editDirectionControls!: EditDirectionControls;

    private debugControls!: DebugControls;

    private inputControls!: InputControls;

    private fileControls!: FileControls;

    private stackControls!: StackControls;

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) private gl: WebGL2RenderingContext,
        @inject(UIRenderer) private uiRenderer: UIRenderer,
        @inject(SnackbarControls) private snackbarControls: SnackbarControls,
        @inject(OutputControls) private outputControls: OutputControls) {
        this.settings = Inversify.get(AppSettings);

        this.BuildStickyProjection();
    }


    async AsyncConstructor(): Promise<void> {
        this.editDirectionControls = new EditDirectionControls(this.uiRenderer);
        this.debugControls = new DebugControls(this.uiRenderer);
        this.inputControls = new InputControls(this.uiRenderer);
        this.fileControls = new FileControls(this.uiRenderer);
        this.stackControls = new StackControls(this.uiRenderer);
    }

    get EditDirectionControls(): EditDirectionControls {
        return this.editDirectionControls;
    }

    get DebugControls(): DebugControls {
        return this.debugControls;
    }

    get InputControls(): InputControls {
        return this.inputControls;
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

    get StackControls(): StackControls {
        return this.stackControls;
    }

    Resize(): void {
        this.BuildStickyProjection();

        this.uiRenderer.ViewProjection = this.stickyProjection;

        this.editDirectionControls.Resize();
        this.debugControls.Resize();
        this.fileControls.Resize();
        this.stackControls.Resize();
        this.inputControls.Resize();
        this.outputControls.Resize();
    }

    Touch(e: MouseEvent): InputReceiver | boolean {
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
