import { UIComponent } from "../UIComponent";
import { SymbolStyle } from "../UILabel/UILabel";

import { Rgb, Vec2 } from "@/lib/Primitives";

export interface Dimension {
    width: number;
    height: number;
}

export interface UIButtonStyle {
    fillColor: Rgb;
    outlineColor: Rgb;
}

export interface UICaptionStyle {
    text: string;
    lineHeight: number;
    color: Rgb;
}

export interface UITextButton extends UIComponent {
    Position: Vec2;
    readonly AbsolutePosition: Vec2;
    ZIndex: number;
    Dimension: Dimension;
    Caption: UICaptionStyle;
    Style: UIButtonStyle;
    readonly Destroyed: boolean;
    Disable: boolean;
    StyleCaptionRange(begin: number, end: number, style: SymbolStyle): void

    Touch(): void;
    Destroy(): void;
}
