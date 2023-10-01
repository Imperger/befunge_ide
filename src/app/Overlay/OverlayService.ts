import { mat4 } from "gl-matrix";

import { EditionDirection } from "../CodeEditor/CodeEditorService";

import { Observable, ObservableController } from "@/lib/Observable";
import { Rgb } from "@/lib/Primitives";
import { UIIcon } from "@/lib/UI/UIIcon";
import { UIIconButton } from "@/lib/UI/UIIconButton/UIIconButton";
import { UIObservablePositioningGroup } from "@/lib/UI/UIObservablePositioningGroup";
import { UIRenderer } from "@/lib/UI/UIRednerer";

interface EditDirection {
    group: UIObservablePositioningGroup;
    left: UIIconButton;
    up: UIIconButton;
    right: UIIconButton;
    down: UIIconButton;
}

export class OverlayService {
    private static IconColor: Rgb = [0.17254901960784313, 0.24313725490196078, 0.3137254901960784];
    private static CurrentDirrectionIconColor: Rgb = [0.1607843137254902, 0.5019607843137255, 0.7254901960784313];

    private uiRenderer!: UIRenderer;

    private stickyProjection!: mat4;

    private editDirectionControls!: EditDirection;

    private currentDirectionControl!: UIIconButton;

    private editDirectionObservable = new ObservableController<EditionDirection>();

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

        this.SetupEditDirectionGroup();
    }

    private SetupEditDirectionGroup(): void {
        const fillColor: Rgb = [0.9254901960784314, 0.9411764705882353, 0.9450980392156862];
        const outlineColor: Rgb = [0.4980392156862745, 0.5490196078431373, 0.5529411764705883];
        const group = new UIObservablePositioningGroup({ x: 10, y: 500 });

        this.editDirectionControls = {
            group,
            left: this.uiRenderer.CreateButton(
                { x: 0, y: 160 },
                { width: 150, height: 100 },
                1,
                { fillColor, outlineColor },
                { icon: UIIcon.ARROW_LEFT, color: OverlayService.IconColor },
                sender => this.UpdateEditDirection(sender, EditionDirection.Left),
                group),
            up: this.uiRenderer.CreateButton(
                { x: 105, y: 270 },
                { width: 100, height: 150 },
                1,
                { fillColor, outlineColor },
                { icon: UIIcon.ARROW_UP, color: OverlayService.IconColor },
                sender => this.UpdateEditDirection(sender, EditionDirection.Up),
                group),
            right: this.uiRenderer.CreateButton(
                { x: 160, y: 160 },
                { width: 150, height: 100 },
                1,
                { fillColor, outlineColor },
                { icon: UIIcon.ARROW_RIGHT, color: OverlayService.CurrentDirrectionIconColor },
                sender => this.UpdateEditDirection(sender, EditionDirection.Right),
                group),
            down: this.uiRenderer.CreateButton(
                { x: 105, y: 0 },
                { width: 100, height: 150 },
                1,
                { fillColor, outlineColor },
                { icon: UIIcon.ARROW_DOWN, color: OverlayService.IconColor },
                sender => this.UpdateEditDirection(sender, EditionDirection.Down),
                group)
        };

        this.currentDirectionControl = this.editDirectionControls.right;
    }

    ForceEditDirection(direction: EditionDirection): void {
        this.currentDirectionControl.Icon = {
            ...this.currentDirectionControl.Icon,
            color: OverlayService.IconColor
        };

        const control = direction === EditionDirection.Left ? this.editDirectionControls.left :
            direction === EditionDirection.Up ? this.editDirectionControls.up :
                direction === EditionDirection.Right ? this.editDirectionControls.right :
                    this.editDirectionControls.down;

        control.Icon = {
            ...control.Icon,
            color: OverlayService.CurrentDirrectionIconColor
        };

        this.currentDirectionControl = control;
    }

    private UpdateEditDirection(sender: UIIconButton, direction: EditionDirection): void {
        if (sender === this.currentDirectionControl) {
            return;
        }

        this.currentDirectionControl.Icon = {
            ...this.currentDirectionControl.Icon,
            color: OverlayService.IconColor
        };

        sender.Icon = {
            ...sender.Icon,
            color: OverlayService.CurrentDirrectionIconColor
        };

        this.currentDirectionControl = sender;
        this.editDirectionObservable.Notify(direction)
    }

    get EditDirectionObservable(): Observable<EditionDirection> {
        return this.editDirectionObservable;
    }

    Resize(): void {
        this.BuildStickyProjection();

        this.uiRenderer.ViewProjection = this.stickyProjection;
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
            -this.zNear, -this.zFar);
    }
}
