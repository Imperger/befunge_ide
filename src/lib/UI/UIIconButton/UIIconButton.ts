import { UIComponent } from "../UIComponent";
import { UIIcon } from "../UIIcon";

import { Rgb, Vec2 } from "@/lib/Primitives";

export interface Dimension {
    width: number;
    height: number;
}

export interface UIButtonStyle {
    fillColor: Rgb;
    outlineColor: Rgb;
}

export interface UIIconStyle {
    icon: UIIcon;
    color: Rgb;
}

export interface UIIconButton extends UIComponent {
    Position: Vec2;
    readonly AbsolutePosition: Vec2;
    ZIndex: number;
    Dimension: Dimension;
    Icon: UIIconStyle;
    Style: UIButtonStyle;
    readonly Destroyed: boolean;
    Disable: boolean;

    Touch(): void;
    Destroy(): void;
}
