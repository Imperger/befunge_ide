import { UIComponent } from "../UIComponent";
import { SymbolStyle } from "../UILabel/UILabel";

import { Vec2 } from "@/lib/Primitives";

export interface UITextList extends UIComponent {
    Position: Vec2;
    readonly AbsolutePosition: Vec2;
    ZIndex: number;
    Text: string;
    LineHeight: number;
    BorderWidth: number;
    ScrollToTop(): void;
    ScrollAligned(offset: number): void;
    StyleRange(begin: number, end: number, style: SymbolStyle): void;
    Visible: boolean;
}
