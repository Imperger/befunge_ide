import { Observable, ObservableController } from "../Observable";
import { Vec2 } from "../Primitives";

import { Dimension, UIComponent } from "./UIComponent";

import { AppSettings } from "@/app/AppSettings";
import { Inversify } from "@/Inversify";

export enum HorizontalAnchor { Left, Right, Middle };

export enum VerticalAnchor { Bottom, Top };

export interface Anchor {
    horizontal?: HorizontalAnchor;
    vertical?: VerticalAnchor;
}

export class UIObservablePositioningGroup implements UIComponent {
    private observable = new ObservableController<UIObservablePositioningGroup>();

    private scale = 1;

    private childs: UIComponent[] = [];


    constructor(
        private position: Vec2,
        private anchor: Anchor = { vertical: VerticalAnchor.Bottom, horizontal: HorizontalAnchor.Left }) {
    }

    public Resize(): void {
        this.observable.Notify(this);
    }

    AppendChild(component: UIComponent): void {
        this.childs.push(component);
    }

    RemoveChild(component: UIComponent): void {
        const removeIdx = this.childs.indexOf(component);

        if (removeIdx !== -1) {
            this.childs.splice(removeIdx, 1);
        }
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

    get Dimension(): Dimension {
        const min = { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY };
        const max = { x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY };

        for (const component of this.childs) {
            UIObservablePositioningGroup.MaintainExtremum(component.Position, { min, max });

            const rightTop = {
                x: component.Position.x + component.Dimension.width,
                y: component.Position.y + component.Dimension.height
            };

            UIObservablePositioningGroup.MaintainExtremum(rightTop, { min, max });
        }
        return { width: max.x - min.x, height: max.y - min.y };
    }

    private static MaintainExtremum(point: Vec2, extremum: { min: Vec2, max: Vec2 }): void {
        if (point.x < extremum.min.x) {
            extremum.min.x = point.x;
        }

        if (point.x > extremum.max.x) {
            extremum.max.x = point.x;
        }

        if (point.y < extremum.min.y) {
            extremum.min.y = point.y;
        }

        if (point.y > extremum.max.y) {
            extremum.max.y = point.y;
        }
    }

    private HorizontalPositionRespectAnchor(viewWidth: number): number {
        switch (this.anchor.horizontal) {
            default:
            case HorizontalAnchor.Left:
                return this.position.x;
            case HorizontalAnchor.Right:
                return viewWidth - this.position.x;
            case HorizontalAnchor.Middle:
                return (viewWidth - this.Dimension.width) / 2;
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
