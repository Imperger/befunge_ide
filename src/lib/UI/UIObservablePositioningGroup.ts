import { Observable, ObservableController } from "../Observable";
import { Vec2 } from "../Primitives";

import { UIComponent } from "./UIComponent";

import { AppSettings } from "@/app/AppSettings";
import { Inversify } from "@/Inversify";

export enum HorizontalAnchor { Left, Right };

export enum VerticalAnchor { Bottom, Top };

export interface Anchor {
    horizontal?: HorizontalAnchor;
    vertical?: VerticalAnchor;
}

export class UIObservablePositioningGroup implements UIComponent {
    private observable = new ObservableController<UIObservablePositioningGroup>();

    private scale = 1;

    constructor(
        private position: Vec2,
        private anchor: Anchor = { vertical: VerticalAnchor.Bottom, horizontal: HorizontalAnchor.Left }) {
    }

    public Resize(): void {
        this.observable.Notify(this);
    }

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
        const dimension = Inversify.get(AppSettings).ViewDimension;

        return {
            x: this.HorizontalPositionRespectAnchor(dimension.Width),
            y: this.VerticalPositionRespectAnchor(dimension.Height)
        };
    }

    get Scale(): number {
        return this.scale;
    }

    set Scale(scale: number) {
        this.scale = scale;

        this.observable.Notify(this);
    }

    private HorizontalPositionRespectAnchor(viewWidth: number): number {
        switch (this.anchor.horizontal) {
            default:
            case HorizontalAnchor.Left:
                return this.position.x;
            case HorizontalAnchor.Right:
                return viewWidth - this.position.x;
        }
    }

    private VerticalPositionRespectAnchor(viewHeight: number): number {
        switch (this.anchor.vertical) {
            default:
            case VerticalAnchor.Bottom:
                return this.position.y;
            case VerticalAnchor.Top:
                return viewHeight - this.position.y;
        }
    }
}
