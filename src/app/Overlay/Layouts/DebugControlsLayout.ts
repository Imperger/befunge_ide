import { inject, injectable } from "inversify";

import { HeadlineControlsLayout } from "./HeadlineControlsLayout";

import { Inversify } from "@/Inversify";
import { Intersection } from "@/lib/math/Intersection";
import { UIComponent } from "@/lib/UI/UIComponent";

@injectable()
export class DebugControlsLayout {
    private skipUpdates = false;

    private debugGroup!: UIComponent;

    private readonly verticalPosition = 60;

    constructor(@inject(HeadlineControlsLayout) private headlineLayout: HeadlineControlsLayout) { }

    set DebugGroup(group: UIComponent) {
        this.debugGroup = group;

        group.Observable.Attach(() => this.DebugGroupUpdated());
    }

    DebugGroupUpdated(): void {
        if (this.skipUpdates) {
            return;
        }

        queueMicrotask(() => this.RecalculatePosition());
    }

    private RecalculatePosition(): void {
        const debugGroupDimension = this.debugGroup.Dimension;
        const headlineDimension = this.headlineLayout.Dimension;

        if (Intersection.RectangleRectangle(
            { ...this.debugGroup.AbsolutePosition, width: debugGroupDimension.width, height: debugGroupDimension.height + headlineDimension.height },
            { ...this.headlineLayout.AbsolutePosition, ...headlineDimension })) {
            console.log('intersect');
            const margin = 10;

            this.skipUpdates = true;

            this.debugGroup.Position = {
                x: this.debugGroup.Position.x,
                y: this.headlineLayout.Position.y + debugGroupDimension.height / this.debugGroup.Scale + margin
            };

            this.skipUpdates = false;
        } else {
            console.log('not intersect');

            this.skipUpdates = true;

            this.debugGroup.Position = {
                x: this.debugGroup.Position.x,
                y: this.verticalPosition
            };

            this.skipUpdates = false;
        }
    }
}

Inversify.bind(DebugControlsLayout).toSelf().inSingletonScope();
