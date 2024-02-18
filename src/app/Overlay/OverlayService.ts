import { mat4 } from "gl-matrix";
import { inject, injectable } from "inversify";

import { AppSettings } from "../AppSettings";
import { InjectionToken } from "../InjectionToken";

import { DebugControls } from "./DebugControls";
import { EditControls } from "./EditControls";
import { EditDirectionControls } from "./EditDirectionControls";
import { FileControls } from "./FileControls";
import { HistoryControls } from "./HistoryControls";
import { IOControls } from "./IOControls";
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

    private fileControls!: FileControls;

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) private gl: WebGL2RenderingContext,
        @inject(UIRenderer) private uiRenderer: UIRenderer,
        @inject(SnackbarControls) private snackbarControls: SnackbarControls,
        @inject(HistoryControls) private historyControls: HistoryControls,
        @inject(EditControls) private editControls: EditControls,
        @inject(DebugControls) private debugControls: DebugControls,
        @inject(StackControls) private stackControls: StackControls,
        @inject(IOControls) private ioControls: IOControls) {
        this.settings = Inversify.get(AppSettings);

        this.BuildStickyProjection();
    }

    async AsyncConstructor(): Promise<void> {
        this.editDirectionControls = new EditDirectionControls(this.uiRenderer);
        this.fileControls = new FileControls(this.uiRenderer);
    }

    get EditDirectionControls(): EditDirectionControls {
        return this.editDirectionControls;
    }

    get DebugControls(): DebugControls {
        return this.debugControls;
    }

    get IOControls(): IOControls {
        return this.ioControls;
    }

    get Snackbar(): SnackbarControls {
        return this.snackbarControls;
    }

    get FileControls(): FileControls {
        return this.fileControls;
    }

    get HistoryControls(): HistoryControls {
        return this.historyControls;
    }

    get EditControls(): EditControls {
        return this.editControls;
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
        this.historyControls.Resize();
        this.editControls.Resize();
        this.stackControls.Resize();
        this.ioControls.Resize();
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
