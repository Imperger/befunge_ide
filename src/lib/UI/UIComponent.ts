import { Observable } from "../Observable";
import { Vec2 } from "../Primitives";

export interface UIComponent {
    Position: Vec2;
    AbsolutePosition: Vec2;
    Observable: Observable<UIComponent>;
}
