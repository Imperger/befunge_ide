import { inject, injectable } from "inversify";

import { ArrayHelper } from "../ArrayHelper";
import { Intersection } from "../math/Intersection";
import { Vec2 } from "../Primitives";
import { Mat4 } from "../renderer/ShaderProgram";

import { Dimension, UIAlert, UIAlertIconStyle, UIAlertStyle, UIAlertText } from "./UIAlert/UIAlert";
import { UIAlertRenderer } from "./UIAlert/UIAlertRenderer";
import { UIButtonStyle, UIIconButton, UIIconStyle } from "./UIIconButton/UIIconButton";
import { UIIconButtonRenderer } from "./UIIconButton/UIIconButtonRenderer";
import { TouchCallback } from "./UIIconButton/UIObservableIconButton";
import { UILabel } from "./UILabel/UILabel";
import { UILabelRenderer } from "./UILabel/UILabelRenderer";
import { UIObservablePositioningGroup } from "./UIObservablePositioningGroup";
import { UITextList } from "./UITextList/UITextList";
import { UITextListRenderer, UITextListRendererFactory } from "./UITextList/UITextListRenderer";

import { InjectionToken } from "@/app/InjectionToken";
import { Inversify } from "@/Inversify";

export interface UICreator {
    CreateButton(position: Vec2,
        dimension: Dimension,
        zIndex: number,
        style: UIButtonStyle,
        iconStyle: UIIconStyle,
        touchCallback: TouchCallback,
        parent: UIObservablePositioningGroup | null): UIIconButton;

    CreateButton(position: Vec2,
        dimension: Dimension,
        zIndex: number,
        style: UIButtonStyle,
        iconStyle: UIIconStyle,
        touchCallback: TouchCallback,
        parent: UIObservablePositioningGroup | null): UIIconButton;

    CreateLabel(position: Vec2,
        zIndex: number,
        text: string,
        lineHeight: number,
        parent: UIObservablePositioningGroup | null): UILabel;

    CreateAlert(position: Vec2,
        dimension: Dimension,
        zIndex: number,
        icon: UIAlertIconStyle,
        text: UIAlertText,
        style: UIAlertStyle,
        parent: UIObservablePositioningGroup | null): UIAlert;

    CreateTextList(position: Vec2,
        dimension: Dimension,
        zIndex: number,
        text: string,
        lineHeight: number,
        parent: UIObservablePositioningGroup | null): UITextList;
}

@injectable()
export class UIRenderer implements UICreator {
    private viewProjection: Mat4 | Float32Array | null = null;

    private uiTextListRenderers: UITextListRenderer[] = [];

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) private gl: WebGL2RenderingContext,
        @inject(UIIconButtonRenderer) private iconButtonRenderer: UIIconButtonRenderer,
        @inject(UIAlertRenderer) private alertRenderer: UIAlertRenderer,
        @inject(UILabelRenderer) private labelsRenderer: UILabelRenderer,
        @inject(InjectionToken.UITextListRendererFactory) private uiTextListRendererFactory: UITextListRendererFactory) {
        this.alertRenderer.UIRenderer = this;
    }

    CreateButton(position: Vec2,
        dimension: Dimension,
        zIndex: number,
        style: UIButtonStyle,
        iconStyle: UIIconStyle,
        touchCallback: TouchCallback,
        parent: UIObservablePositioningGroup | null = null): UIIconButton {
        return this.iconButtonRenderer.Create(position, dimension, zIndex, style, iconStyle, touchCallback, parent);
    }

    CreateLabel(position: Vec2,
        zIndex: number,
        text: string,
        lineHeight: number,
        parent: UIObservablePositioningGroup | null = null): UILabel {
        return this.labelsRenderer.Create(position, zIndex, text, lineHeight, parent);
    }

    CreateAlert(position: Vec2,
        dimension: Dimension,
        zIndex: number,
        icon: UIAlertIconStyle,
        text: UIAlertText,
        style: UIAlertStyle,
        parent: UIObservablePositioningGroup | null = null): UIAlert {
        return this.alertRenderer.Create(position, dimension, zIndex, icon, text, style, parent);
    }

    CreateTextList(position: Vec2,
        dimension: Dimension,
        zIndex: number,
        text: string,
        lineHeight: number,
        parent: UIObservablePositioningGroup | null = null): UITextList {
        const renderer = this.uiTextListRendererFactory(this);

        if (this.viewProjection !== null) {
            renderer.ViewProjection = this.viewProjection;
        }

        this.uiTextListRenderers.push(renderer);

        return renderer.Create(
            position,
            dimension,
            zIndex,
            text,
            lineHeight,
            () => this.UIObservableTextListDeleter(renderer),
            parent);
    }

    Touch(e: MouseEvent): boolean {
        const x = e.offsetX;
        const y = this.gl.canvas.height - e.offsetY;

        return this.TouchAlerts(x, y) ||
            this.TouchButtons(x, y) ||
            this.TouchLabels(x, y);
    }

    private TouchButtons(x: number, y: number): boolean {
        const intersected = this.iconButtonRenderer.IconButtons
            .filter(btn => !btn.Disable && Intersection.AABBRectanglePoint(
                { x: btn.AbsolutePosition.x, y: btn.AbsolutePosition.y, width: btn.Dimension.width, height: btn.Dimension.height },
                { x, y }));

        if (intersected.length === 0) {
            return false;
        }

        ArrayHelper
            .Max(intersected, (a: UIIconButton, b: UIIconButton) => a.ZIndex < b.ZIndex)
            .Touch();

        return true;
    }

    private TouchLabels(x: number, y: number): boolean {
        const intersected = this.labelsRenderer.Labels
            .filter(label => Intersection.AABBRectanglePoint(
                { x: label.AbsolutePosition.x, y: label.AbsolutePosition.y, width: label.Dimension.width, height: label.Dimension.height },
                { x, y }));


        if (intersected.length === 0) {
            return false;
        }

        return true;
    }

    private TouchAlerts(x: number, y: number): boolean {
        const intersected = this.alertRenderer.Alerts
            .filter(alert => Intersection.AABBRectanglePoint(
                { x: alert.AbsolutePosition.x, y: alert.AbsolutePosition.y, width: alert.Dimension.width, height: alert.Dimension.height },
                { x, y }));


        if (intersected.length === 0) {
            return false;
        }

        return true;
    }

    private UIObservableTextListDeleter(renderer: UITextListRenderer): void {
        this.uiTextListRenderers.splice(this.uiTextListRenderers.findIndex(x => x === renderer), 1);
    }


    Draw(): void {
        this.alertRenderer.Draw();
        this.iconButtonRenderer.Draw();
        this.labelsRenderer.Draw();
        this.uiTextListRenderers.forEach(x => x.Draw());
    }

    set ViewProjection(projection: Mat4 | Float32Array) {
        this.viewProjection = projection;

        this.iconButtonRenderer.ViewProjection = projection;
        this.labelsRenderer.ViewProjection = projection;
        this.alertRenderer.ViewProjection = projection;
        this.uiTextListRenderers.forEach(x => x.ViewProjection = projection);
    }
}

Inversify.bind(UIRenderer).toSelf().inSingletonScope();