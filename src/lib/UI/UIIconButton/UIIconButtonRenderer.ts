
import { EnumSize } from "../../EnumSize";
import { MemoryPoolTracker } from "../../MemoryPoolTracker";
import { Rgb, Vec2 } from "../../Primitives";
import { PrimitiveBuilder } from "../../renderer/PrimitiveBuilder";
import { PrimitivesRenderer } from "../../renderer/PrimitivesRenderer";
import { Mat4 } from "../../renderer/ShaderProgram";
import { TypeSizeResolver } from "../../renderer/TypeSizeResolver";
import { UIComponent } from "../UIComponent";
import { UIIconAtlas, UVExtra } from "../UIIcon";

import { Dimension, UIButtonStyle, UIIconButton, UIIconStyle } from "./UIIconButton";
import FUIIconButton from './UIIconButton.frag';
import VUIIconButton from './UIIconButton.vert';
import FUIIconButtonOutline from './UIIconButtonOutline.frag';
import VUIIconButtonOutline from './UIIconButtonOutline.vert';
import { TouchCallback, UIObservableIconButton } from "./UIObservableIconButton";

import { NotNull } from "@/lib/NotNull";
import { TextureAtlas } from "@/lib/renderer/TextureAtlas";

enum UIIconButtonComponent { X, Y, Z, fillR, fillG, fillB, iconR, iconG, iconB, Ux, Uy };

enum UIIconButtonOutlineComponent { X, Y, Z, R, G, B };

class UIButtonOutlineRenderer extends PrimitivesRenderer {
    static IndicesPerPrimitive = 24;

    static readonly AttributesPerComponent = EnumSize(UIIconButtonOutlineComponent) * UIButtonOutlineRenderer.IndicesPerPrimitive;

    constructor(gl: WebGL2RenderingContext) {
        const floatSize = TypeSizeResolver.Resolve(gl.FLOAT);
        const stride = floatSize * EnumSize(UIIconButtonOutlineComponent);

        super(gl,
            { fragment: FUIIconButtonOutline, vertex: VUIIconButtonOutline },
            [{
                name: 'a_vertex',
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride,
                offset: 0
            },
            {
                name: 'a_color',
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride,
                offset: 3 * floatSize
            }],
            { indicesPerPrimitive: UIButtonOutlineRenderer.IndicesPerPrimitive, basePrimitiveType: gl.TRIANGLES });
    }

    set ViewProjection(mat: Mat4 | Float32Array) {
        this.shader.SetUniformMatrix4fv('u_viewProject', mat);
    }

    get Attributes(): Float32Array {
        return this.attributes;
    }
}

interface TouchAnimationStart {
    target: UIIconButton;
    originFillColor: Rgb;
    timestamp: number;
}

export class UIIconButtonRenderer extends PrimitivesRenderer {
    private static readonly IndicesPerPrimitive = 18;

    private static readonly AttributesPerComponent = EnumSize(UIIconButtonComponent) * UIIconButtonRenderer.IndicesPerPrimitive;

    private readonly zFarIncluded = 0.1;

    private iconButtons: UIObservableIconButton[] = [];

    private outline: UIButtonOutlineRenderer;

    private vertexAttributesTracker: MemoryPoolTracker;

    private iconAtlas!: UIIconAtlas;
    private iconAtlasTexture!: WebGLTexture;

    private touchStart: TouchAnimationStart[] = [];

    private constructor(gl: WebGL2RenderingContext, private zFar: number) {
        const floatSize = TypeSizeResolver.Resolve(gl.FLOAT);

        const stride = floatSize * EnumSize(UIIconButtonComponent);

        super(gl,
            { fragment: FUIIconButton, vertex: VUIIconButton },
            [{
                name: 'a_vertex',
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride,
                offset: 0
            },
            {
                name: 'a_fillColor',
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride,
                offset: 3 * floatSize
            },
            {
                name: 'a_iconColor',
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride,
                offset: 6 * floatSize
            },
            {
                name: 'a_icon',
                size: 2,
                type: gl.FLOAT,
                normalized: false,
                stride,
                offset: 9 * floatSize
            }],
            { indicesPerPrimitive: UIIconButtonRenderer.IndicesPerPrimitive, basePrimitiveType: gl.TRIANGLES });

        this.outline = new UIButtonOutlineRenderer(gl);

        this.vertexAttributesTracker = new (class extends MemoryPoolTracker {
            constructor(private renderer: UIIconButtonRenderer) {
                const initialCapacity = 2;
                super(initialCapacity);

                renderer.UploadAttributes(Array.from({ length: UIIconButtonRenderer.AttributesPerComponent * initialCapacity }, () => 0));
                renderer.outline.UploadAttributes(Array.from({ length: UIButtonOutlineRenderer.AttributesPerComponent * initialCapacity }, () => 0));
            }

            OnShrink(inUseIndices: number[]): void {
                const buttonAttrs = new Array(UIIconButtonRenderer.AttributesPerComponent * inUseIndices.length).fill(0);
                const buttonOutlineAttrs = new Array(UIButtonOutlineRenderer.AttributesPerComponent * inUseIndices.length).fill(0);

                for (let n = 0; n < inUseIndices.length; ++n) {
                    const offset = inUseIndices[n];

                    for (let attribOffset = 0; attribOffset < UIIconButtonRenderer.AttributesPerComponent; ++attribOffset) {
                        buttonAttrs[n * UIIconButtonRenderer.AttributesPerComponent + attribOffset] = this.renderer.attributes[offset * UIIconButtonRenderer.AttributesPerComponent + attribOffset];
                    }

                    for (let attribOffset = 0; attribOffset < UIButtonOutlineRenderer.AttributesPerComponent; ++attribOffset) {
                        buttonOutlineAttrs[n * UIButtonOutlineRenderer.AttributesPerComponent + attribOffset] = this.renderer.outline.Attributes[offset * UIButtonOutlineRenderer.AttributesPerComponent + attribOffset];
                    }
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
                const extendedButtonAttrs = Array.from(
                    { length: extendedCapacity * UIIconButtonRenderer.AttributesPerComponent },
                    (_, n) => n < this.renderer.attributes.length ? this.renderer.attributes[n] : 0);

                this.renderer.UploadAttributes(extendedButtonAttrs);


                const extendedOutlineAttrs = Array.from(
                    { length: extendedCapacity * UIButtonOutlineRenderer.AttributesPerComponent },
                    (_, n) => n < this.renderer.outline.Attributes.length ? this.renderer.outline.Attributes[n] : 0);

                this.renderer.outline.UploadAttributes(extendedOutlineAttrs);
            }
        })(this);
    }

    static async Create(gl: WebGL2RenderingContext, zFar: number): Promise<UIIconButtonRenderer> {
        const renderer = new UIIconButtonRenderer(gl, zFar);

        renderer.iconAtlas = await UIIconAtlas.Create();

        renderer.SetupAtlasTexture();

        return renderer;
    }

    Create(position: Vec2,
        dimension: Dimension,
        zIndex: number,
        style: UIButtonStyle,
        iconStyle: UIIconStyle,
        touchCallback: TouchCallback,
        parent: UIComponent | null): UIIconButton {

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

        button.Observable.Attach((component: UIObservableIconButton) => this.UpdateAttributes(component));

        this.iconButtons.push(button);

        this.UpdateAttributes(button);

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
        this.UpdateOutlineAttributes(component);
    }

    private UpdateContentAttributes(component: UIObservableIconButton): void {
        this.UpdateComponentAttributes(
            this.ExtractContentAttributes(component),
            component.Offset * UIIconButtonRenderer.AttributesPerComponent);
    }

    private UpdateOutlineAttributes(component: UIObservableIconButton): void {
        this.outline.UpdateComponentAttributes(
            this.ExtractOutlineAttributes(component),
            component.Offset * UIButtonOutlineRenderer.AttributesPerComponent);
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
            [[this.zFar - component.ZIndex - this.zFarIncluded], component.Style.fillColor, component.Icon.color, [-1, -1]]);

        const iconAttributes = PrimitiveBuilder.AABBRectangle(
            { x: component.AbsolutePosition.x + segmentWidth, y: component.AbsolutePosition.y },
            { width: iconWidth, height: component.Dimension.height },
            [
                [this.zFar - component.ZIndex - this.zFarIncluded],
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
            [[this.zFar - component.ZIndex - this.zFarIncluded], component.Style.fillColor, component.Icon.color, [-1, -1]]);

        return [...leftSegmentAttributes, ...iconAttributes, ...rightSegmentAttributes];
    }

    private ExtractContentAttributesTall(component: UIObservableIconButton, iconUV: UVExtra): number[] {
        const iconHeight = component.Dimension.width / iconUV.aspectRatio;
        const segmentHeight = (component.Dimension.height - iconHeight) / 2;

        const bottomSegmentAttributes = PrimitiveBuilder.AABBRectangle(
            component.AbsolutePosition,
            { width: component.Dimension.width, height: segmentHeight },
            [[this.zFar - component.ZIndex - this.zFarIncluded], component.Style.fillColor, component.Icon.color, [-1, -1]]);

        const iconAttributes = PrimitiveBuilder.AABBRectangle(
            { x: component.AbsolutePosition.x, y: component.AbsolutePosition.y + segmentHeight },
            { width: component.Dimension.width, height: iconHeight },
            [
                [this.zFar - component.ZIndex - this.zFarIncluded],
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
            [[this.zFar - component.ZIndex - this.zFarIncluded], component.Style.fillColor, component.Icon.color, [-1, -1]]);

        return [...bottomSegmentAttributes, ...iconAttributes, ...topSegmentAttributes];
    }

    private ExtractOutlineAttributes(component: UIObservableIconButton): number[] {
        const width = 2;

        return PrimitiveBuilder.AABBFrame(
            { x: component.AbsolutePosition.x - width, y: component.AbsolutePosition.y - width },
            { width: component.Dimension.width + 2 * width, height: component.Dimension.height + 2 * width },
            width, [[this.zFar - component.ZIndex - this.zFarIncluded], component.Style.outlineColor]);
    }

    private SetupAtlasTexture(): void {
        this.iconAtlasTexture = this.gl.createTexture() ?? NotNull('Failed to create font atlas texture');
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.iconAtlasTexture);

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.iconAtlas.Image);
    }
}
