import { vec2 } from "gl-matrix";

import { Observable, ObservableController } from "../Observable";
import { Vec2 } from "../Primitives";

import { UIComponent } from "./UIComponent";

export class UIObservablePositioningGroup implements UIComponent {
    private observable = new ObservableController<UIObservablePositioningGroup>();

    constructor(
        private position: Vec2,
        private parent: UIComponent | null = null) { }

    get Observable(): Observable<UIComponent> {
        return this.observable;
    }

    get Position(): Vec2 {
        return this.position;
    }

    set Position(position: Vec2) {
        this.position = position;

        this.observable.Notify(this);
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
}
