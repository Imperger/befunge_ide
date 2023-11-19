import { Observable } from "../Observable";
import { Vec2 } from "../Primitives";

export interface Dimension {
    width: number;
    height: number;
}

export interface UIComponent {
    Position: Vec2;
    AbsolutePosition: Vec2;
    Scale: number;
    Dimension: Dimension;
    Observable: Observable<UIComponent>;
}
