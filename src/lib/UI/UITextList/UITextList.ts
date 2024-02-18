import { UIComponent } from "../UIComponent";

import { Vec2 } from "@/lib/Primitives";

export interface UITextList extends UIComponent {
    Position: Vec2;
    readonly AbsolutePosition: Vec2;
    ZIndex: number;
    Text: string;
    LineHeight: number;
    BorderWidth: number;
    ScrollToTop(): void;
    Visible: boolean;
}
