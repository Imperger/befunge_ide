import { UIComponent } from "../UIComponent";

import { Rgb, Vec2 } from "@/lib/Primitives";

export interface SymbolStyle {
    color: Rgb;
}

export interface UILabel extends UIComponent {
    Position: Vec2;
    readonly AbsolutePosition: Vec2;
    ZIndex: number;
    Text: string;
    get Style(): SymbolStyle[];
    LineHeight: number;
    StyleRange(begin: number, end: number, style: SymbolStyle): void;
    Destroy(): void;
}
