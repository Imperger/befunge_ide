
import { EnumSize } from "../../EnumSize";
import { MemoryPoolTracker } from "../../MemoryPoolTracker";
import { Vec2 } from "../../Primitives";
import { PrimitiveBuilder } from "../../renderer/PrimitiveBuilder";
import { PrimitivesRenderer } from "../../renderer/PrimitivesRenderer";
import { Mat4 } from "../../renderer/ShaderProgram";
import { TypeSizeResolver } from "../../renderer/TypeSizeResolver";
import { UIIconAtlas } from "../UIIcon";

import { Dimension, UIButtonStyle, UIIconButton, UIIconStyle } from "./UIIconButton";
import FUIIconButton from './UIIconButton.frag';
import VUIIconButton from './UIIconButton.vert';
import FUIIconButtonOutline from './UIIconButtonOutline.frag';
import VUIIconButtonOutline from './UIIconButtonOutline.vert';
import { UIObservableIconButton } from "./UIObservableIconButton";

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
                offset: 2 * floatSize
            }],
            { indicesPerPrimitive: UIButtonOutlineRenderer.IndicesPerPrimitive, basePrimitiveType: gl.TRIANGLES });
    }

    set ViewProjection(mat: Mat4 | Float32Array) {
        this.shader.SetUniformMatrix4fv('u_viewProject', mat);
    }
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
                // Update the offsets for all buttons
                console.log('On shrink');
            }

            OnExtend(extendedCapacity: number): void {
                console.log('On extend', extendedCapacity);
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
        iconStyle: UIIconStyle): UIIconButton {

        const button = new UIObservableIconButton(
            position,
            dimension,
            zIndex,
            style,
            iconStyle,
            this.vertexAttributesTracker.Allocate(),
            (component: UIObservableIconButton) => this.UpdateAttributes(component));

        this.iconButtons.push(button);

        this.UpdateAttributes(button);

        return button;
    }

    Destroy(button: UIIconButton): void {

    }

    Draw(): void {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.iconAtlasTexture);

        super.Draw();
        this.outline.Draw();
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

    private ExtractOutlineAttributes(component: UIObservableIconButton): number[] {
        const width = 2;

        return PrimitiveBuilder.AABBFrame(
            { x: component.Position.x - width, y: component.Position.y - width },
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
