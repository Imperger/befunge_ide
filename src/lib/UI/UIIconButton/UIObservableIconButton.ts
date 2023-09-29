import { vec2 } from "gl-matrix";

import { UIComponent } from "../UIComponent";

import { Dimension, UIButtonStyle, UIIconStyle } from "./UIIconButton";
import { UIIconButton } from "./UIIconButton";

import { Vec2 } from "@/lib/Primitives";

export type TouchCallback = (sender: UIIconButton) => void;

export type UpdateCallback = (component: UIObservableIconButton) => void;

export class UIObservableIconButton implements UIComponent, UIIconButton {
    constructor(
        private position: Vec2,
        private dimension: Dimension,
        private zIndex: number,
        private style: UIButtonStyle,
        private iconStyle: UIIconStyle,
        private touchCallback: TouchCallback,
        public Offset: number,
        private updater: UpdateCallback,
        private parent: UIComponent | null = null) { }

    get Position(): Vec2 {
        return this.position;
    }

    set Position(position: Vec2) {
        this.position = position;

        this.updater(this);
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

    get Dimension(): Dimension {
        return this.dimension;
    }

    set Dimension(dimension: Dimension) {
        this.dimension = dimension;

        this.updater(this);
    }

    get ZIndex(): number {
        return this.zIndex;
    }

    set ZIndex(zIndex: number) {
        this.zIndex = zIndex;
    }

    get Icon(): UIIconStyle {
        return this.iconStyle;
    }

    set Icon(style: UIIconStyle) {
        this.iconStyle = style;

        this.updater(this);
    }

    get Style(): UIButtonStyle {
        return this.style;
    }

    set Style(style: UIButtonStyle) {
        this.style = { ...style };

        this.updater(this);
    }

    Touch(): void {
        this.touchCallback(this);
    }
}
