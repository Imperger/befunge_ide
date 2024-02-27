import { inject, injectable } from "inversify";

import { AppSettings } from "@/app/AppSettings";
import { Inversify } from "@/Inversify";
import { MathUtil } from "@/lib/math/MathUtil";
import { Vec2 } from "@/lib/Primitives";
import { Dimension, UIComponent } from "@/lib/UI/UIComponent";

@injectable()
export class HeadlineControlsLayout {
    private skipUpdates = false;

    private components: UIComponent[] = [];

    private position: Vec2 = { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY };

    private absolutePosition: Vec2 = { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY };

    private dimension: Dimension = { width: 0, height: 0 };

    constructor(@inject(AppSettings) private settings: AppSettings) { }

    Watch(component: UIComponent): void {
        component.Observable.Attach(component => this.ComponentUpdated(component));

        this.components.push(component);
        this.ComponentUpdated(component);
    }

    get Position(): Vec2 {
        return this.position;
    }

    get AbsolutePosition(): Vec2 {
        return this.absolutePosition;
    }

    get Dimension(): Dimension {
        return this.dimension;
    }

    get Scale(): number {
        return this.settings.DevicePixelRatio;
    }

    private ComponentUpdated(component: UIComponent): void {
        if (!this.skipUpdates && (component.Scale / this.settings.DevicePixelRatio < 1 || component.AbsolutePosition.x + component.Dimension.width > this.settings.ViewDimension.Width)) {
            const margin = 10;
            const targetScale = this.settings.ViewDimension.Width / (component.Position.x + component.Dimension.width / component.Scale + margin);
            const scale = Math.min(targetScale / this.settings.DevicePixelRatio - Number.EPSILON, 1);

            this.skipUpdates = true;
            this.components.forEach(x => x.Scale = scale);
            this.skipUpdates = false;
        }

        this.MaintainPositionDimension();
    }

    private MaintainPositionDimension(): void {
        const relativeExtremum = MathUtil
            .Extremum(this.components.map(x => ({ ...x.Position })));

        this.position.x = relativeExtremum.min.x;
        this.position.y = relativeExtremum.min.y;


        const absoluteExtremum = MathUtil
            .Extremum(this.components.flatMap(x => this.MapComponent(x)));

        this.absolutePosition.x = absoluteExtremum.min.x;
        this.absolutePosition.y = absoluteExtremum.min.y;

        this.dimension.width = absoluteExtremum.max.x - absoluteExtremum.min.x;
        this.dimension.height = absoluteExtremum.max.y - absoluteExtremum.min.y;
    }

    private MapComponent(component: UIComponent): Vec2[] {
        const dimension = component.Dimension;

        return [
            component.AbsolutePosition,
            {
                x: component.AbsolutePosition.x + dimension.width,
                y: component.AbsolutePosition.y + dimension.height
            }
        ];
    }
}

Inversify.bind(HeadlineControlsLayout).toSelf().inSingletonScope();
