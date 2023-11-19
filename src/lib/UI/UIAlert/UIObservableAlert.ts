import { vec2 } from "gl-matrix";

import { UIComponent } from "../UIComponent";

import { Dimension, UIAlert, UIAlertIconStyle, UIAlertStyle, UIAlertText } from "./UIAlert";

import { Observable, ObservableController } from "@/lib/Observable";
import { Vec2 } from "@/lib/Primitives";

export type DeleterCallback = (component: UIObservableAlert) => void;

export class UIObservableAlert implements UIComponent, UIAlert {
    private static UninitializedTag = -1;

    private observable = new ObservableController<UIObservableAlert>();

    private scale = 1;


    constructor(
        private position: Vec2,
        private dimension: Dimension,
        private zIndex: number,
        private icon: UIAlertIconStyle,
        private text: UIAlertText,
        private style: UIAlertStyle,
        public Offset: number,
        private deleter: DeleterCallback,
        private parent: UIComponent | null = null) {
        parent?.Observable.Attach(() => this.observable.Notify(this));
    }

    Destroy(): void {
        this.Uninitialize();

        this.deleter(this);
    }

    get Observable(): Observable<UIObservableAlert> {
        return this.observable;
    }

    get Position(): Vec2 {
        return this.position;
    }

    set Position(position: Vec2) {
        this.position = position;

        this.observable.Notify(this);
    }

    get Dimension(): Dimension {
        return this.dimension;
    }

    set Dimension(dimension: Dimension) {
        this.dimension = dimension;

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

    get ZIndex(): number {
        return this.zIndex;
    }

    set ZIndex(zIndex: number) {
        this.zIndex = zIndex;

        this.observable.Notify(this);
    }

    get Scale(): number {
        return this.parent === null ? this.scale : this.scale * this.parent.Scale;
    }

    set Scale(scale: number) {
        this.scale = scale;

        this.observable.Notify(this);
    }

    get Icon(): UIAlertIconStyle {
        return this.icon;
    }

    set Icon(style: UIAlertIconStyle) {
        this.icon = { ...style };

        this.observable.Notify(this);
    }

    get Text(): UIAlertText {
        return this.text;
    }

    set Text(text: UIAlertText) {
        this.text = { ...text };

        this.observable.Notify(this);
    }

    get Style(): UIAlertStyle {
        return this.style;
    }

    set Style(style: UIAlertStyle) {
        this.style = { ...style };

        this.observable.Notify(this);
    }

    private Uninitialize(): void {
        this.position = { x: 0, y: 0 };
        this.dimension = { width: 0, height: 0 };
    }
}
