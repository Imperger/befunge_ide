import { UIComponent } from "../UIComponent";
import { SymbolStyle } from "../UILabel/UILabel";

import { Rgba, Vec2 } from "@/lib/Primitives";

export interface ContainerStyle {
    borderWidth: number;
    fillColor: Rgba;
}

export interface UITextList extends UIComponent {
    Position: Vec2;
    readonly AbsolutePosition: Vec2;
    ZIndex: number;
    Text: string;
    LineHeight: number;
    ContainerStyle: ContainerStyle;
    ScrollToTop(): void;
    ScrollAligned(offset: number): void;
    StyleRange(begin: number, end: number, style: SymbolStyle): void;
    Visible: boolean;
}
