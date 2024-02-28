import { inject, injectable } from "inversify";

import { HeadlineControlsLayout } from "./HeadlineControlsLayout";

import { AppSettings } from "@/app/AppSettings";
import { Inversify } from "@/Inversify";
import { Intersection } from "@/lib/math/Intersection";
import { UIComponent } from "@/lib/UI/UIComponent";

@injectable()
export class DebugControlsLayout {
    private skipUpdates = false;

    private debugGroup!: UIComponent;

    private readonly verticalPosition = 60;

    constructor(
        @inject(HeadlineControlsLayout) private headlineLayout: HeadlineControlsLayout,
        @inject(AppSettings) private settings: AppSettings) { }

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

        if (Intersection.RangeRange(
            { min: this.debugGroup.AbsolutePosition.x, max: this.debugGroup.AbsolutePosition.x + debugGroupDimension.width },
            { min: this.headlineLayout.AbsolutePosition.x, max: this.headlineLayout.AbsolutePosition.x + this.headlineLayout.Dimension.width })) {

            const margin = 10;

            this.skipUpdates = true;

            this.debugGroup.Position = {
                x: this.debugGroup.Position.x,
                y: (this.settings.ViewDimension.Height - this.headlineLayout.AbsolutePosition.y) / this.headlineLayout.Scale + debugGroupDimension.height / this.debugGroup.Scale + margin
            };

            this.skipUpdates = false;
        } else {
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
