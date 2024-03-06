import { vec2 } from "gl-matrix";

import { UIComponent } from "../UIComponent";
import { UIIcon } from "../UIIcon";
import { UIIconButton } from "../UIIconButton/UIIconButton";
import { SymbolStyle, UILabel } from "../UILabel/UILabel";
import { UIObservablePositioningGroup } from "../UIObservablePositioningGroup";
import { UICreator } from "../UIRenderer";

import { Dimension, UIButtonStyle, UICaptionStyle, UITextButton } from "./UITextButton";

import { Observable, ObservableController, ObserverDetacher } from "@/lib/Observable";
import { Rgb, Vec2 } from "@/lib/Primitives";

export type TouchCallback = (sender: UITextButton) => void;

export type UpdateCallback = (component: UIObservableTextButton) => void;

export type DeleterCallback = (component: UIObservableTextButton) => void;

export class UIObservableTextButton implements UIComponent, UITextButton {
    private static readonly DisabledIconColor: Rgb = [0.47058823529411764, 0.5647058823529412, 0.611764705882353];

    private observable = new ObservableController<UIObservableTextButton>();

    private scale = 1;

    private destroyed = false;

    private disabled = false;

    private button: UIIconButton;

    private label: UILabel;

    private parentDetacher: ObserverDetacher | null = null;

    constructor(
        private position: Vec2,
        private dimension: Dimension,
        private zIndex: number,
        private style: UIButtonStyle,
        private caption: UICaptionStyle,
        private touchCallback: TouchCallback,
        uiRenderer: UICreator,
        private parent: UIObservablePositioningGroup | null = null) {

        this.button = uiRenderer.CreateIconButton(
            this.position,
            this.dimension,
            this.zIndex,
            this.style,
            { color: [0, 0, 0], icon: UIIcon.Empty },
            (sender: UIIconButton) => this.TouchAdapter(sender),
            this.parent);

        const aboveButton = 0.001;
        this.label = uiRenderer.CreateLabel(
            this.Position,
            zIndex + aboveButton,
            this.caption.text,
            this.caption.lineHeight,
            this.parent);
        this.label.StyleRange(0, this.label.Text.length, { color: this.caption.color });

        this.label.Position = this.CaptionPosition;

        this.parentDetacher = parent?.Observable.Attach(() => this.observable.Notify(this)) ?? null;
    }

    get Observable(): Observable<UIObservableTextButton> {
        return this.observable;
    }

    get Position(): Vec2 {
        return this.position;
    }

    set Position(position: Vec2) {
        this.position = position;

        this.button.Position = this.Position;
        this.label.Position = this.CaptionPosition;

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

        this.button.Dimension = dimension;
        this.label.Position = this.CaptionPosition;

        this.observable.Notify(this);
    }

    get ZIndex(): number {
        return this.zIndex;
    }

    set ZIndex(zIndex: number) {
        this.zIndex = zIndex;

        this.button.ZIndex = zIndex;

        const aboveButton = 0.001;
        this.label.ZIndex = zIndex + aboveButton;

        this.observable.Notify(this);
    }

    get Caption(): UICaptionStyle {
        return this.caption;
    }

    set Caption(style: UICaptionStyle) {
        this.caption = { ...style };

        this.label.Text = style.text;
        this.label.LineHeight = style.lineHeight;
        this.label.StyleRange(0, this.label.Text.length, { color: style.color });

        this.label.Position = this.CaptionPosition;

        this.observable.Notify(this);
    }

    get Style(): UIButtonStyle {
        return this.style;
    }

    set Style(style: UIButtonStyle) {
        this.style = { ...style };

        this.button.Style = { ...style };

        this.observable.Notify(this);
    }

    get Scale(): number {
        return this.parent === null ? this.scale : this.scale * this.parent.Scale;
    }

    set Scale(scale: number) {
        this.scale = scale;

        this.button.Scale = scale;
        this.label.Scale = scale;

        this.observable.Notify(this);
    }

    get Destroyed(): boolean {
        return this.destroyed;
    }

    get Disable(): boolean {
        return this.disabled;
    }

    set Disable(value: boolean) {
        if (value === this.disabled) {
            return;
        }

        this.disabled = value;
        this.button.Disable = value;

        this.observable.Notify(this);
    }

    private get CaptionPosition(): Vec2 {
        return {
            x: this.Position.x + (this.dimension.width - this.label.Dimension.width / this.label.Scale) / 2,
            y: this.Position.y + (this.dimension.height - this.label.Dimension.height / this.label.Scale) / 2
        }
    }

    private TouchAdapter(_sender: UIIconButton): void {
        this.touchCallback(this);
    }

    StyleCaptionRange(begin: number, end: number, style: SymbolStyle): void {
        this.label.StyleRange(begin, end, style);
    }

    Touch(): void {
        this.button.Touch();
    }

    Destroy(): void {
        this.label.Destroy();
        this.button.Destroy();

        this.parent?.RemoveChild(this);

        if (this.parentDetacher !== null) {
            this.parentDetacher();
        }
    }
}
