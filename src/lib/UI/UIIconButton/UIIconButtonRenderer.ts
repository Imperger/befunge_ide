
import { inject, injectable } from "inversify";

import { MemoryPoolTracker } from "../../MemoryPoolTracker";
import { Rgb, Vec2 } from "../../Primitives";
import { PrimitiveBuilder } from "../../renderer/PrimitiveBuilder";
import { PrimitivesRenderer } from "../../renderer/PrimitivesRenderer";
import { Mat4 } from "../../renderer/ShaderProgram";
import { UIIconAtlas, UVExtra } from "../UIIcon";
import { UIObservablePositioningGroup } from "../UIObservablePositioningGroup";

import { Dimension, UIButtonStyle, UIIconButton, UIIconStyle } from "./UIIconButton";
import FUIIconButton from './UIIconButton.frag';
import VUIIconButton from './UIIconButton.vert';
import FUIIconButtonOutline from './UIIconButtonOutline.frag';
import VUIIconButtonOutline from './UIIconButtonOutline.vert';
import { TouchCallback, UIObservableIconButton } from "./UIObservableIconButton";

import { AppSettings } from "@/app/AppSettings";
import { InjectionToken } from "@/app/InjectionToken";
import { Inversify } from "@/Inversify";
import { ArrayHelper } from "@/lib/ArrayHelper";
import { TextureAtlas } from "@/lib/renderer/TextureAtlas";


class UIButtonOutlineRenderer extends PrimitivesRenderer {
    constructor(gl: WebGL2RenderingContext) {

        super(gl,
            { fragment: FUIIconButtonOutline, vertex: VUIIconButtonOutline },
            [{
                name: 'a_vertex',
                size: 3,
                type: gl.FLOAT,
                normalized: false
            },
            {
                name: 'a_color',
                size: 3,
                type: gl.FLOAT,
                normalized: false
            }],
            { indicesPerPrimitive: 24, basePrimitiveType: gl.TRIANGLES });
    }

    set ViewProjection(mat: Mat4 | Float32Array) {
        this.shader.SetUniformMatrix4fv('u_viewProject', mat);
    }
}

interface TouchAnimationStart {
    target: UIIconButton;
    originFillColor: Rgb;
    timestamp: number;
}

@injectable()
export class UIIconButtonRenderer extends PrimitivesRenderer {
    private readonly zFarIncluded = 0.1;

    private settings: AppSettings;

    private iconButtons: UIObservableIconButton[] = [];

    private outline: UIButtonOutlineRenderer;

    private vertexAttributesTracker: MemoryPoolTracker;

    private touchStart: TouchAnimationStart[] = [];

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) gl: WebGL2RenderingContext,
        @inject(InjectionToken.IconAtlas) private iconAtlas: UIIconAtlas,
        @inject(InjectionToken.IconAtlasTexture) private iconAtlasTexture: WebGLTexture) {

        super(gl,
            { fragment: FUIIconButton, vertex: VUIIconButton },
            [{
                name: 'a_vertex',
                size: 3,
                type: gl.FLOAT,
                normalized: false
            },
            {
                name: 'a_fillColor',
                size: 3,
                type: gl.FLOAT,
                normalized: false
            },
            {
                name: 'a_iconColor',
                size: 3,
                type: gl.FLOAT,
                normalized: false
            },
            {
                name: 'a_icon',
                size: 2,
                type: gl.FLOAT,
                normalized: false
            }],
            { indicesPerPrimitive: 18, basePrimitiveType: gl.TRIANGLES });

        this.settings = Inversify.get(AppSettings);

        this.outline = new UIButtonOutlineRenderer(gl);

        this.vertexAttributesTracker = new (class extends MemoryPoolTracker {
            constructor(private renderer: UIIconButtonRenderer) {
                const initialCapacity = 2;
                super(initialCapacity);

                renderer.UploadAttributes(Array.from({ length: renderer.ComponentsPerPrimitive * initialCapacity }, () => 0));
                renderer.outline.UploadAttributes(Array.from({ length: renderer.outline.ComponentsPerPrimitive * initialCapacity }, () => 0));
            }

            OnShrink(inUseIndices: number[]): void {
                const buttonAttrs = new Array(this.renderer.ComponentsPerPrimitive * inUseIndices.length).fill(0);
                const buttonOutlineAttrs = new Array(this.renderer.outline.ComponentsPerPrimitive * inUseIndices.length).fill(0);

                for (let n = 0; n < inUseIndices.length; ++n) {
                    const offset = inUseIndices[n];

                    const buttonComponents = this.renderer.PrimitiveComponents(offset);
                    ArrayHelper.Copy(
                        buttonAttrs,
                        n * this.renderer.ComponentsPerPrimitive,
                        buttonComponents,
                        0,
                        buttonComponents.length);

                    const buttonOutlineComponents = this.renderer.PrimitiveComponents(offset);
                    ArrayHelper.Copy(
                        buttonAttrs,
                        n * this.renderer.outline.ComponentsPerPrimitive,
                        buttonOutlineComponents,
                        0,
                        buttonOutlineComponents.length);
                }

                this.renderer.UploadAttributes(buttonAttrs);
                this.renderer.outline.UploadAttributes(buttonOutlineAttrs);

                this.renderer.iconButtons.forEach(btn => {
                    const idx = inUseIndices.indexOf(btn.Offset);

                    if (idx === -1) {
                        throw new Error(`Can't find position for offset ${btn.Offset}`);
                    }

                    btn.Offset = idx;
                });
            }

            OnExtend(extendedCapacity: number): void {
                const buttonComponents = this.renderer.PrimitiveComponentsRange(0, this.renderer.TotalPrimitives);

                const extendedButtonAttrs = Array.from(
                    { length: extendedCapacity * this.renderer.ComponentsPerPrimitive },
                    (_, n) => n < buttonComponents.length ? buttonComponents[n] : 0);

                this.renderer.UploadAttributes(extendedButtonAttrs);


                const buttonOutlineComponents = this.renderer.outline.PrimitiveComponentsRange(0, this.renderer.outline.TotalPrimitives);
                const extendedOutlineAttrs = Array.from(
                    { length: extendedCapacity * this.renderer.outline.ComponentsPerPrimitive },
                    (_, n) => n < buttonOutlineComponents.length ? buttonOutlineComponents[n] : 0);

                this.renderer.outline.UploadAttributes(extendedOutlineAttrs);
            }
        })(this);
    }

    Create(position: Vec2,
        dimension: Dimension,
        zIndex: number,
        style: UIButtonStyle,
        iconStyle: UIIconStyle,
        touchCallback: TouchCallback,
        parent: UIObservablePositioningGroup | null): UIIconButton {

        const button = new UIObservableIconButton(
            position,
            dimension,
            zIndex,
            style,
            iconStyle,
            (sender: UIIconButton) => this.TouchProxy(sender, touchCallback),
            this.vertexAttributesTracker.Allocate(),
            (component: UIObservableIconButton) => this.Destroy(component),
            parent);

        if (parent !== null) {
            parent.AppendChild(button);
        }

        button.Observable.Attach((component: UIObservableIconButton) => this.UpdateAttributes(component));

        this.iconButtons.push(button);

        if (parent === null) {
            this.UpdateAttributes(button);
        }

        return button;
    }

    private TouchProxy(sender: UIIconButton, origin: TouchCallback): void {
        const alreadyTouchedIdx = this.touchStart.findIndex(btn => btn.target === sender);

        if (alreadyTouchedIdx !== -1) {
            const animation = this.touchStart[alreadyTouchedIdx];
            animation.target.Style = { ...animation.target.Style, fillColor: animation.originFillColor };

            this.touchStart.splice(alreadyTouchedIdx, 1);
        }

        this.touchStart.push({ target: sender, originFillColor: sender.Style.fillColor, timestamp: Date.now() });

        origin(sender);
    }

    private Destroy(component: UIObservableIconButton): void {
        const toDestroyIdx = this.iconButtons.indexOf(component);

        if (toDestroyIdx === -1) {
            return;
        }

        this.iconButtons.splice(toDestroyIdx, 1)

        this.UpdateAttributes(component);

        this.vertexAttributesTracker.Free(component.Offset);
    }

    Draw(): void {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.iconAtlasTexture);

        this.TouchAnimation();

        super.Draw();
        this.outline.Draw();
    }

    private TouchAnimation(): void {
        const lightingDuration = 80;
        const darkeningDuration = 100;
        const brightFactor = 1.2;

        const notFinished: TouchAnimationStart[] = [];
        const finished: TouchAnimationStart[] = [];
        for (const animation of this.touchStart) {
            if (animation.target.Destroyed) {
                continue;
            }

            if (Date.now() - animation.timestamp <= lightingDuration + darkeningDuration) {
                notFinished.push(animation);
            } else {
                finished.push(animation);
            }
        }

        this.touchStart = notFinished;

        finished.forEach(anim => anim.target.Style = { ...anim.target.Style, fillColor: anim.originFillColor });

        for (const animation of this.touchStart) {
            const fillColor: Rgb = [...animation.target.Style.fillColor];
            const elapsed = Date.now() - animation.timestamp;

            if (elapsed <= lightingDuration) {
                const lightingProgress = elapsed / lightingDuration;
                const bright = 1 + (brightFactor - 1) * lightingProgress;

                fillColor[0] = Math.min(1, animation.originFillColor[0] * bright);
                fillColor[1] = Math.min(1, animation.originFillColor[1] * bright);
                fillColor[2] = Math.min(1, animation.originFillColor[2] * bright);
            } else {
                const darkeningProgress = (elapsed - lightingDuration) / darkeningDuration;
                const bright = 1 + (brightFactor - 1) * (1 - darkeningProgress);

                fillColor[0] = Math.min(1, animation.originFillColor[0] * bright);
                fillColor[1] = Math.min(1, animation.originFillColor[1] * bright);
                fillColor[2] = Math.min(1, animation.originFillColor[2] * bright);
            }

            animation.target.Style = { ...animation.target.Style, fillColor };
        }
    }

    get IconButtons(): readonly UIIconButton[] {
        return this.iconButtons;
    }

    set ViewProjection(mat: Mat4 | Float32Array) {
        this.shader.SetUniformMatrix4fv('u_viewProject', mat);
        this.outline.ViewProjection = mat;
    }

    private UpdateAttributes(component: UIObservableIconButton): void {
        this.UpdateContentAttributes(component);

        if (component.Destroyed) {
            this.ResetOutlineAttributes(component);
        } else {
            this.UpdateOutlineAttributes(component);
        }
    }

    private UpdateContentAttributes(component: UIObservableIconButton): void {
        this.UpdatePrimitiveComponents(
            this.ExtractContentAttributes(component),
            component.Offset * this.ComponentsPerPrimitive);
    }

    private ResetOutlineAttributes(component: UIObservableIconButton): void {
        this.outline.UpdatePrimitiveComponents(
            new Array(this.outline.ComponentsPerPrimitive).fill(0),
            component.Offset * this.outline.ComponentsPerPrimitive);
    }

    private UpdateOutlineAttributes(component: UIObservableIconButton): void {
        this.outline.UpdatePrimitiveComponents(
            this.ExtractOutlineAttributes(component),
            component.Offset * this.outline.ComponentsPerPrimitive);
    }

    private ExtractContentAttributes(component: UIObservableIconButton): number[] {
        const iconUV = this.iconAtlas.LookupUV(component.Icon.icon);

        if (TextureAtlas.IsUndefinedUV(iconUV)) {
            throw new Error(`Can't find icon with id ${component.Icon.icon}`);
        }

        return component.Dimension.width / component.Dimension.height >= 1 ?
            this.ExtractContentAttributesWide(component, iconUV) :
            this.ExtractContentAttributesTall(component, iconUV);
    }

    private ExtractContentAttributesWide(component: UIObservableIconButton, iconUV: UVExtra): number[] {
        const iconWidth = component.Dimension.height * iconUV.aspectRatio;
        const segmentWidth = (component.Dimension.width - iconWidth) / 2;

        const leftSegmentAttributes = PrimitiveBuilder.AABBRectangle(
            component.AbsolutePosition,
            { width: segmentWidth, height: component.Dimension.height },
            [[this.settings.ZFar - component.ZIndex - this.zFarIncluded], component.Style.fillColor, component.Icon.color, [-1, -1]]);

        const iconAttributes = PrimitiveBuilder.AABBRectangle(
            { x: component.AbsolutePosition.x + segmentWidth, y: component.AbsolutePosition.y },
            { width: iconWidth, height: component.Dimension.height },
            [
                [this.settings.ZFar - component.ZIndex - this.zFarIncluded],
                component.Style.fillColor,
                component.Icon.color,
                {
                    LeftBottom: [iconUV.A.x, iconUV.B.y],
                    LeftTop: [iconUV.A.x, iconUV.A.y],
                    RightTop: [iconUV.B.x, iconUV.A.y],
                    RightBottom: [iconUV.B.x, iconUV.B.y]
                }
            ]);

        const rightSegmentAttributes = PrimitiveBuilder.AABBRectangle(
            { x: component.AbsolutePosition.x + segmentWidth + iconWidth, y: component.AbsolutePosition.y },
            { width: segmentWidth, height: component.Dimension.height },
            [[this.settings.ZFar - component.ZIndex - this.zFarIncluded], component.Style.fillColor, component.Icon.color, [-1, -1]]);

        return [...leftSegmentAttributes, ...iconAttributes, ...rightSegmentAttributes];
    }

    private ExtractContentAttributesTall(component: UIObservableIconButton, iconUV: UVExtra): number[] {
        const iconHeight = component.Dimension.width / iconUV.aspectRatio;
        const segmentHeight = (component.Dimension.height - iconHeight) / 2;

        const bottomSegmentAttributes = PrimitiveBuilder.AABBRectangle(
            component.AbsolutePosition,
            { width: component.Dimension.width, height: segmentHeight },
            [[this.settings.ZFar - component.ZIndex - this.zFarIncluded], component.Style.fillColor, component.Icon.color, [-1, -1]]);

        const iconAttributes = PrimitiveBuilder.AABBRectangle(
            { x: component.AbsolutePosition.x, y: component.AbsolutePosition.y + segmentHeight },
            { width: component.Dimension.width, height: iconHeight },
            [
                [this.settings.ZFar - component.ZIndex - this.zFarIncluded],
                component.Style.fillColor,
                component.Icon.color,
                {
                    LeftBottom: [iconUV.A.x, iconUV.B.y],
                    LeftTop: [iconUV.A.x, iconUV.A.y],
                    RightTop: [iconUV.B.x, iconUV.A.y],
                    RightBottom: [iconUV.B.x, iconUV.B.y]
                }
            ]);

        const topSegmentAttributes = PrimitiveBuilder.AABBRectangle(
            { x: component.AbsolutePosition.x, y: component.AbsolutePosition.y + segmentHeight + iconHeight },
            { width: component.Dimension.width, height: segmentHeight },
            [[this.settings.ZFar - component.ZIndex - this.zFarIncluded], component.Style.fillColor, component.Icon.color, [-1, -1]]);

        return [...bottomSegmentAttributes, ...iconAttributes, ...topSegmentAttributes];
    }

    private ExtractOutlineAttributes(component: UIObservableIconButton): number[] {
        const width = 2;

        return PrimitiveBuilder.AABBFrame(
            { x: component.AbsolutePosition.x - width, y: component.AbsolutePosition.y - width },
            { width: component.Dimension.width + 2 * width, height: component.Dimension.height + 2 * width },
            width * component.Scale, [[this.settings.ZFar - component.ZIndex - this.zFarIncluded], component.Style.outlineColor]);
    }
}

Inversify.bind(UIIconButtonRenderer).toSelf().inSingletonScope();
