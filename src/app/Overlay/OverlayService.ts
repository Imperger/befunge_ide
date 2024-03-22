import { mat4 } from "gl-matrix";
import { inject, injectable } from "inversify";

import { MouseSelectEvent } from "../AppEventTransformer";
import { AppSettings } from "../AppSettings";
import { InjectionToken } from "../InjectionToken";

import { DebugControls } from "./DebugControls";
import { EditControls } from "./EditControls";
import { EditDirectionControls } from "./EditDirectionControls";
import { FileControls } from "./FileControls";
import { HistoryControls } from "./HistoryControls";
import { IOControls } from "./IOControls";
import { LanguageSyntaxHelpControls } from "./LanguageSyntaxHelpControls";
import { SnackbarControls } from "./SnackbarControls";
import { StackControls } from "./StackControls";
import { VirtualKeyboardControls } from "./VirtualKeyboardControls";

import { Inversify } from "@/Inversify";
import { Intersection } from "@/lib/math/Intersection";
import { InputReceiver } from "@/lib/UI/InputReceiver";
import { UIRenderer } from "@/lib/UI/UIRenderer";

export interface ScrollEvent {
    startX: number;
    startY: number;
    scroll: number;
    units: 'px' | 'row';
}

@injectable()
export class OverlayService {
    private settings: AppSettings;

    private stickyProjection!: mat4;

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) private gl: WebGL2RenderingContext,
        @inject(UIRenderer) private uiRenderer: UIRenderer,
        @inject(SnackbarControls) private snackbarControls: SnackbarControls,
        @inject(FileControls) private fileControls: FileControls,
        @inject(LanguageSyntaxHelpControls) private languageSyntaxHelpControls: LanguageSyntaxHelpControls,
        @inject(HistoryControls) private historyControls: HistoryControls,
        @inject(EditControls) private editControls: EditControls,
        @inject(EditDirectionControls) private editDirectionControls: EditDirectionControls,
        @inject(DebugControls) private debugControls: DebugControls,
        @inject(StackControls) private stackControls: StackControls,
        @inject(VirtualKeyboardControls) private virtualKeyboardControls: VirtualKeyboardControls,
        @inject(IOControls) private ioControls: IOControls) {
        this.settings = Inversify.get(AppSettings);

        this.BuildStickyProjection();
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

    get LanguageSyntaxHelpControls(): LanguageSyntaxHelpControls {
        return this.languageSyntaxHelpControls;
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

    get VirtualKeyboardControls(): VirtualKeyboardControls {
        return this.virtualKeyboardControls;
    }

    Resize(): void {
        this.BuildStickyProjection();

        this.uiRenderer.ViewProjection = this.stickyProjection;

        this.editDirectionControls.Resize();
        this.debugControls.Resize();
        this.fileControls.Resize();
        this.snackbarControls.Resize();
        this.historyControls.Resize();
        this.editControls.Resize();
        this.stackControls.Resize();
        this.virtualKeyboardControls.Resize();
        this.ioControls.Resize();
    }

    Touch(e: MouseSelectEvent): InputReceiver | boolean {
        const x = e.offsetX;
        const y = this.gl.canvas.height - e.offsetY;

        const isKeyboardTouched = Intersection.AABBRectanglePoint(
            {
                x: this.virtualKeyboardControls.AbsolutePosition.x,
                y: this.virtualKeyboardControls.AbsolutePosition.y,
                width: this.virtualKeyboardControls.Dimension.width,
                height: this.virtualKeyboardControls.Dimension.height
            },
            { x, y });

        return this.uiRenderer.Touch({ offsetX: x, offsetY: y }) || isKeyboardTouched;
    }

    Scroll(e: ScrollEvent): boolean {
        e.startY = this.gl.canvas.height - e.startY;

        const textList = this.uiRenderer.FindTextList(e.startX, e.startY);

        if (textList === null) {
            return false;
        }

        if (e.units === 'px') {
            textList.ScrollAligned(e.scroll);
        } else if (e.units === 'row') {
            textList.ScrollAligned(e.scroll * textList.LineHeight);
        }

        return true;
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

Inversify.bind(OverlayService).toSelf().inSingletonScope();
