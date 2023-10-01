import { mat4, vec2 } from "gl-matrix";

import { EditionDirection } from "../CodeEditor/CodeEditorService";

import { Observable, ObservableController } from "@/lib/Observable";
import { Rgb, Vec2 } from "@/lib/Primitives";
import { UIComponent } from "@/lib/UI/UIComponent";
import { UIIcon } from "@/lib/UI/UIIcon";
import { UIIconButton } from "@/lib/UI/UIIconButton/UIIconButton";
import { UIRenderer } from "@/lib/UI/UIRednerer";

class ObservablePositioningGroup implements UIComponent {
    private observable = new ObservableController<ObservablePositioningGroup>();

    constructor(
        private position: Vec2,
        private parent: UIComponent | null = null) { }

    get Observable(): Observable<UIComponent> {
        return this.observable;
    }

    get Position(): Vec2 {
        return this.position;
    }

    set Position(position: Vec2) {
        this.position = position;

        this.observable.Notify(this);
    }

    get AbsolutePosition(): Vec2 {
        if (this.parent) {
            const parentPosition = [this.parent.AbsolutePosition.x, this.parent.AbsolutePosition.y] as const;
            const absolutePosition = vec2.add(vec2.create(), parentPosition, [this.Position.x, this.Position.y]);

            return { x: absolutePosition[0], y: absolutePosition[1] };
        } else {
            return this.Position;
        }
    }
}

interface EditDirection {
    group: ObservablePositioningGroup;
    left: UIIconButton;
    up: UIIconButton;
    right: UIIconButton;
    down: UIIconButton;
}

export class OverlayService {
    private uiRenderer!: UIRenderer;

    private stickyProjection!: mat4;

    private editDirectionControls!: EditDirection;

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
        const iconColor: Rgb = [0.17254901960784313, 0.24313725490196078, 0.3137254901960784];
        const group = new ObservablePositioningGroup({ x: 10, y: 500 });

        this.editDirectionControls = {
            group,
            left: this.uiRenderer.CreateButton(
                { x: 0, y: 160 },
                { width: 150, height: 100 },
                1,
                { fillColor, outlineColor },
                { icon: UIIcon.ARROW_LEFT, color: iconColor },
                () => this.editDirectionObservable.Notify(EditionDirection.Left),
                group),
            up: this.uiRenderer.CreateButton(
                { x: 105, y: 270 },
                { width: 100, height: 150 },
                1,
                { fillColor, outlineColor },
                { icon: UIIcon.ARROW_UP, color: iconColor },
                () => this.editDirectionObservable.Notify(EditionDirection.Up),
                group),
            right: this.uiRenderer.CreateButton(
                { x: 160, y: 160 },
                { width: 150, height: 100 },
                1,
                { fillColor, outlineColor },
                { icon: UIIcon.ARROW_RIGHT, color: iconColor },
                () => this.editDirectionObservable.Notify(EditionDirection.Right),
                group),
            down: this.uiRenderer.CreateButton(
                { x: 105, y: 0 },
                { width: 100, height: 150 },
                1,
                { fillColor, outlineColor },
                { icon: UIIcon.ARROW_DOWN, color: iconColor },
                () => this.editDirectionObservable.Notify(EditionDirection.Down),
                group)
        };
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
