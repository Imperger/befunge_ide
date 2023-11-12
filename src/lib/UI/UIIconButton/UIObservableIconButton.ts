import { vec2 } from "gl-matrix";

import { UIComponent } from "../UIComponent";

import { Dimension, UIButtonStyle, UIIconStyle } from "./UIIconButton";
import { UIIconButton } from "./UIIconButton";

import { Observable, ObservableController } from "@/lib/Observable";
import { Vec2 } from "@/lib/Primitives";

export type TouchCallback = (sender: UIIconButton) => void;

export type UpdateCallback = (component: UIObservableIconButton) => void;

export type DeleterCallback = (component: UIObservableIconButton) => void;

export class UIObservableIconButton implements UIComponent, UIIconButton {
    private static UninitializedTag = -1;

    private observable = new ObservableController<UIObservableIconButton>();

    private scale = 1;

    private destroyed = false;

    constructor(
        private position: Vec2,
        private dimension: Dimension,
        private zIndex: number,
        private style: UIButtonStyle,
        private iconStyle: UIIconStyle,
        private touchCallback: TouchCallback,
        public Offset: number,
        private deleter: DeleterCallback,
        private parent: UIComponent | null = null) {
        parent?.Observable.Attach(() => this.observable.Notify(this));
    }

    get Observable(): Observable<UIObservableIconButton> {
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
            const absolutePosition = vec2.add(vec2.create(), parentPosition, [this.Position.x * this.Scale, this.Position.y * this.Scale]);

            return { x: absolutePosition[0], y: absolutePosition[1] };
        } else {
            return this.Position;
        }
    }

    get Dimension(): Dimension {
        return { width: this.dimension.width * this.Scale, height: this.dimension.height * this.Scale };
    }

    set Dimension(dimension: Dimension) {
        this.dimension = dimension;

        this.observable.Notify(this);
    }

    get ZIndex(): number {
        return this.zIndex;
    }

    set ZIndex(zIndex: number) {
        this.zIndex = zIndex;

        this.observable.Notify(this);
    }

    get Icon(): UIIconStyle {
        return this.iconStyle;
    }

    set Icon(style: UIIconStyle) {
        this.iconStyle = style;

        this.observable.Notify(this);
    }

    get Style(): UIButtonStyle {
        return this.style;
    }

    set Style(style: UIButtonStyle) {
        this.style = { ...style };

        this.observable.Notify(this);
    }

    get Scale(): number {
        return this.parent === null ? this.scale : this.scale * this.parent.Scale;
    }

    set Scale(scale: number) {
        this.scale = scale;

        this.observable.Notify(this);
    }

    get Destroyed(): boolean {
        return this.destroyed;
    }

    Touch(): void {
        this.touchCallback(this);
    }

    Destroy(): void {
        this.Uninitialize();

        this.deleter(this);

        this.Offset = UIObservableIconButton.UninitializedTag;
    }

    private Uninitialize(): void {
        this.position = { x: 0, y: 0 };
        this.dimension = { width: 0, height: 0 };
        this.destroyed = true;
    }
}
