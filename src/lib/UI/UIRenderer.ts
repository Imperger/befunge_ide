import { inject, injectable } from "inversify";

import { ArrayHelper } from "../ArrayHelper";
import { Intersection } from "../math/Intersection";
import { Vec2 } from "../Primitives";
import { Mat4 } from "../renderer/ShaderProgram";

import { InputReceiver } from "./InputReceiver";
import { Dimension, UIAlert, UIAlertIconStyle, UIAlertStyle, UIAlertText } from "./UIAlert/UIAlert";
import { UIAlertRenderer } from "./UIAlert/UIAlertRenderer";
import { UIEditableTextList } from "./UIEditableTextList/UIEditableTextList";
import { UIEditableTextListRenderer, UIEditableTextListRendererFactory } from "./UIEditableTextList/UIEditableTextListRenderer";
import { UIButtonStyle, UIIconButton, UIIconStyle } from "./UIIconButton/UIIconButton";
import { UIIconButtonRenderer } from "./UIIconButton/UIIconButtonRenderer";
import { TouchCallback as IconButtonTouchCallback } from "./UIIconButton/UIObservableIconButton";
import { UILabel } from "./UILabel/UILabel";
import { UILabelRenderer } from "./UILabel/UILabelRenderer";
import { UIObservablePositioningGroup } from "./UIObservablePositioningGroup";
import { TouchCallback as TextButtonTouchCallback } from "./UITextButton/UIObservableTextButton";
import { UIObservableTextButton } from "./UITextButton/UIObservableTextButton";
import { UICaptionStyle, UITextButton } from "./UITextButton/UITextButton";
import { UITextList } from "./UITextList/UITextList";
import { UITextListRenderer, UITextListRendererFactory } from "./UITextList/UITextListRenderer";

import { MouseSelectEvent } from "@/app/AppEventTransformer";
import { InjectionToken } from "@/app/InjectionToken";
import { Inversify } from "@/Inversify";

export interface UICreator {
    CreateIconButton(position: Vec2,
        dimension: Dimension,
        zIndex: number,
        style: UIButtonStyle,
        iconStyle: UIIconStyle,
        touchCallback: IconButtonTouchCallback,
        parent: UIObservablePositioningGroup | null): UIIconButton;

    CreateTextButton(position: Vec2,
        dimension: Dimension,
        zIndex: number,
        style: UIButtonStyle,
        caption: UICaptionStyle,
        touchCallback: TextButtonTouchCallback,
        parent: UIObservablePositioningGroup | null): UITextButton;

    CreateLabel(position: Vec2,
        zIndex: number,
        text: string,
        lineHeight: number,
        parent: UIObservablePositioningGroup | null): UILabel;

    CreateAlert(position: Vec2,
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

    CreateEditableTextList(position: Vec2,
        dimension: Dimension,
        zIndex: number,
        text: string,
        lineHeight: number,
        parent: UIObservablePositioningGroup | null): UIEditableTextList;
}

interface UIEditableTextListDescriptor {
    renderer: UIEditableTextListRenderer;
    editableTextList: UIEditableTextList;
}

@injectable()
export class UIRenderer implements UICreator {
    private viewProjection: Mat4 | Float32Array | null = null;

    private uiTextListRenderers: UITextListRenderer[] = [];

    private uiEditableTextLists: UIEditableTextListDescriptor[] = [];

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) private gl: WebGL2RenderingContext,
        @inject(UIIconButtonRenderer) private iconButtonRenderer: UIIconButtonRenderer,
        @inject(UIAlertRenderer) private alertRenderer: UIAlertRenderer,
        @inject(UILabelRenderer) private labelsRenderer: UILabelRenderer,
        @inject(InjectionToken.UITextListRendererFactory) private uiTextListRendererFactory: UITextListRendererFactory,
        @inject(InjectionToken.UIEditableTextListRendererFactory) private uiEditableTextListRendererFactory: UIEditableTextListRendererFactory) {
        this.alertRenderer.UIRenderer = this;
    }

    CreateIconButton(position: Vec2,
        dimension: Dimension,
        zIndex: number,
        style: UIButtonStyle,
        iconStyle: UIIconStyle,
        touchCallback: IconButtonTouchCallback,
        parent: UIObservablePositioningGroup | null = null): UIIconButton {
        return this.iconButtonRenderer.Create(position, dimension, zIndex, style, iconStyle, touchCallback, parent);
    }

    CreateTextButton(position: Vec2,
        dimension: Dimension,
        zIndex: number,
        style: UIButtonStyle,
        caption: UICaptionStyle,
        touchCallback: TextButtonTouchCallback,
        parent: UIObservablePositioningGroup | null = null): UITextButton {
        return new UIObservableTextButton(position, dimension, zIndex, style, caption, touchCallback, this, parent);
    }

    CreateLabel(position: Vec2,
        zIndex: number,
        text: string,
        lineHeight: number,
        parent: UIObservablePositioningGroup | null = null): UILabel {
        return this.labelsRenderer.Create(position, zIndex, text, lineHeight, parent);
    }

    CreateAlert(position: Vec2,
        zIndex: number,
        icon: UIAlertIconStyle,
        text: UIAlertText,
        style: UIAlertStyle,
        parent: UIObservablePositioningGroup | null = null): UIAlert {
        return this.alertRenderer.Create(position, zIndex, icon, text, style, parent);
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

    CreateEditableTextList(position: Vec2,
        dimension: Dimension,
        zIndex: number,
        text: string,
        lineHeight: number,
        parent: UIObservablePositioningGroup | null = null): UIEditableTextList {
        const renderer = this.uiEditableTextListRendererFactory(this);

        if (this.viewProjection !== null) {
            renderer.ViewProjection = this.viewProjection;
        }


        const descriptor: UIEditableTextListDescriptor = { renderer } as UIEditableTextListDescriptor;

        const editableTextList = renderer.Create(
            position,
            dimension,
            zIndex,
            text,
            lineHeight,
            () => this.UIObservableEditableTextListDeleter(descriptor),
            parent);

        descriptor.editableTextList = editableTextList;

        this.uiEditableTextLists.push(descriptor);

        return editableTextList;
    }

    Touch(e: MouseSelectEvent): InputReceiver | boolean {
        const touchResult = this.TouchAlerts(e.offsetX, e.offsetY) ||
            this.TouchButtons(e.offsetX, e.offsetY) ||
            this.TouchLabels(e.offsetX, e.offsetY);

        return touchResult || (this.TouchEditableTextList(e.offsetX, e.offsetY) ?? false);
    }

    private TouchButtons(x: number, y: number): boolean {
        const intersected = this.iconButtonRenderer.IconButtons
            .filter(btn => Intersection.AABBRectanglePoint(
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

    private TouchEditableTextList(x: number, y: number): UIEditableTextList | null {
        const intersected = this.uiEditableTextLists
            .filter(desc => desc.editableTextList.Visible && Intersection.AABBRectanglePoint(
                {
                    x: desc.editableTextList.AbsolutePosition.x,
                    y: desc.editableTextList.AbsolutePosition.y,
                    width: desc.editableTextList.Dimension.width,
                    height: desc.editableTextList.Dimension.height
                },
                { x, y }));


        if (intersected.length === 0) {
            return null;
        }

        return ArrayHelper
            .Max(
                intersected,
                (a: UIEditableTextListDescriptor, b: UIEditableTextListDescriptor) => a.editableTextList.ZIndex < b.editableTextList.ZIndex)
            .editableTextList;
    }

    private UIObservableTextListDeleter(renderer: UITextListRenderer): void {
        this.uiTextListRenderers.splice(this.uiTextListRenderers.findIndex(x => x === renderer), 1);
    }

    private UIObservableEditableTextListDeleter(descriptor: UIEditableTextListDescriptor): void {
        this.uiEditableTextLists.splice(this.uiEditableTextLists.findIndex(x => x === descriptor), 1);
    }

    Draw(): void {
        this.alertRenderer.Draw();
        this.iconButtonRenderer.Draw();
        this.labelsRenderer.Draw();
        this.uiTextListRenderers.forEach(x => x.Draw());
        this.uiEditableTextLists.forEach(x => x.renderer.Draw());
    }

    set ViewProjection(projection: Mat4 | Float32Array) {
        this.viewProjection = projection;

        this.iconButtonRenderer.ViewProjection = projection;
        this.labelsRenderer.ViewProjection = projection;
        this.alertRenderer.ViewProjection = projection;
        this.uiTextListRenderers.forEach(x => x.ViewProjection = projection);
        this.uiEditableTextLists.forEach(x => x.renderer.ViewProjection = projection);
    }
}

Inversify.bind(UIRenderer).toSelf().inSingletonScope();
