import { inject, injectable, interfaces, named } from "inversify";

import { Dimension } from "../UIComponent";
import { UILabelRenderer } from "../UILabel/UILabelRenderer";
import { UIObservablePositioningGroup } from "../UIObservablePositioningGroup";
import { UICreator, UIRenderer } from "../UIRenderer";

import { UIObservableTextList, UIObservableTextListDeleter } from "./UIObservableTextList";
import { ContainerStyle, UITextList } from "./UITextList";
import FTextListBorder from './UITextListBorder.frag'
import VTextListBorder from './UITextListBorder.vert'
import FUITextListStencil from './UITextListStencil.frag';
import VUITextListStencil from './UITextListStencil.vert';

import { AppSettings } from "@/app/AppSettings";
import { InjectionToken, UILabelRendererTargetName } from "@/app/InjectionToken";
import { Inversify } from "@/Inversify";
import { EnumSize } from "@/lib/EnumSize";
import { MemoryPoolTracker } from "@/lib/MemoryPoolTracker";
import { Vec2 } from "@/lib/Primitives";
import { PrimitiveBuilder } from "@/lib/renderer/PrimitiveBuilder";
import { PrimitivesRenderer } from "@/lib/renderer/PrimitivesRenderer";
import { Mat4 } from "@/lib/renderer/ShaderProgram";
import { TypeSizeResolver } from "@/lib/renderer/TypeSizeResolver";


enum UITextListBorderComponent { X, Y, Z };

enum UITextListStencilComponent { X, Y, Z, Fr, Fg, Fb };

class UITextListBorderRenderer extends PrimitivesRenderer {
    public readonly IndicesPerPrimitive;

    public readonly AttributesPerComponent;

    constructor(gl: WebGL2RenderingContext) {
        const floatSize = TypeSizeResolver.Resolve(gl.FLOAT);
        const stride = floatSize * EnumSize(UITextListBorderComponent);
        const indicesPerPrimitive = 24;

        super(gl,
            { fragment: FTextListBorder, vertex: VTextListBorder },
            [{
                name: 'a_vertex',
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride,
                offset: 0
            }],
            { indicesPerPrimitive, basePrimitiveType: gl.TRIANGLES });

        this.IndicesPerPrimitive = indicesPerPrimitive;
        this.AttributesPerComponent = EnumSize(UITextListBorderComponent) * this.IndicesPerPrimitive;
    }

    set ViewProjection(mat: Mat4 | Float32Array) {
        this.shader.SetUniformMatrix4fv('u_viewProject', mat);
    }

    get Attributes(): Float32Array {
        return this.attributes;
    }
}

@injectable()
export class UITextListRenderer extends PrimitivesRenderer {
    private readonly IndicesPerPrimitive;

    private readonly AttributesPerComponent;

    private readonly zFarIncluded = 0.1;

    private borderRenderer: UITextListBorderRenderer;

    private vertexAttributesTracker: MemoryPoolTracker;

    private uiRenderer!: UICreator;

    constructor(
        @inject(AppSettings) private settings: AppSettings,
        @inject(InjectionToken.WebGLRenderingContext) gl: WebGL2RenderingContext,
        @inject(UILabelRenderer) @named(UILabelRendererTargetName.Unique) private labelRenderer: UILabelRenderer) {

        const floatSize = TypeSizeResolver.Resolve(gl.FLOAT);
        const stride = floatSize * EnumSize(UITextListStencilComponent);
        const indicesPerPrimitive = 6;

        super(gl,
            { fragment: FUITextListStencil, vertex: VUITextListStencil },
            [{
                name: 'a_vertex',
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride,
                offset: 0
            },
            {
                name: 'a_fill_color',
                size: 4,
                type: gl.FLOAT,
                normalized: false,
                stride,
                offset: 3
            }],
            { indicesPerPrimitive, basePrimitiveType: gl.TRIANGLES });

        this.IndicesPerPrimitive = indicesPerPrimitive;
        this.AttributesPerComponent = EnumSize(UITextListStencilComponent) * this.IndicesPerPrimitive;

        this.borderRenderer = new UITextListBorderRenderer(this.gl);

        this.vertexAttributesTracker = new (class extends MemoryPoolTracker {
            constructor(private renderer: UITextListRenderer) {
                const initialCapacity = 2;
                super(initialCapacity);

                renderer.UploadAttributes(Array.from({ length: renderer.AttributesPerComponent * initialCapacity }, () => 0));
                this.renderer.borderRenderer.UploadAttributes(Array.from({ length: renderer.borderRenderer.AttributesPerComponent * initialCapacity }, () => 0));
            }

            Free(index: number): void {
                this.renderer.UpdateComponentAttributes(
                    new Array(this.renderer.AttributesPerComponent).fill(0),
                    index * this.renderer.AttributesPerComponent);

                this.renderer.borderRenderer.UpdateComponentAttributes(
                    new Array(this.renderer.borderRenderer.AttributesPerComponent).fill(0),
                    index * this.renderer.borderRenderer.AttributesPerComponent);

                super.Free(index);
            }

            OnShrink(inUseIndices: number[]): void {
                const scencilRectAttrs = new Array(this.renderer.AttributesPerComponent * inUseIndices.length).fill(0);
                const borderAttrs = new Array(this.renderer.borderRenderer.AttributesPerComponent * inUseIndices.length).fill(0);

                for (let n = 0; n < inUseIndices.length; ++n) {
                    const offset = inUseIndices[n];

                    for (let attribOffset = 0; attribOffset < this.renderer.AttributesPerComponent; ++attribOffset) {
                        scencilRectAttrs[n * this.renderer.AttributesPerComponent + attribOffset] = this.renderer.attributes[offset * this.renderer.AttributesPerComponent + attribOffset];
                    }

                    for (let attribOffset = 0; attribOffset < this.renderer.borderRenderer.AttributesPerComponent; ++attribOffset) {
                        borderAttrs[n * this.renderer.borderRenderer.AttributesPerComponent + attribOffset] = this.renderer.borderRenderer.Attributes[offset * this.renderer.borderRenderer.AttributesPerComponent + attribOffset];
                    }
                }

                this.renderer.UploadAttributes(scencilRectAttrs);
                this.renderer.borderRenderer.UploadAttributes(borderAttrs);
            }

            OnExtend(extendedCapacity: number): void {
                const extendedLabelAttrs = Array.from(
                    { length: extendedCapacity * this.renderer.AttributesPerComponent },
                    (_, n) => n < this.renderer.attributes.length ? this.renderer.attributes[n] : 0);

                this.renderer.UploadAttributes(extendedLabelAttrs);


                const extendedBorderAttrs = Array.from(
                    { length: extendedCapacity * this.renderer.borderRenderer.AttributesPerComponent },
                    (_, n) => n < this.renderer.borderRenderer.Attributes.length ? this.renderer.borderRenderer.Attributes[n] : 0);

                this.renderer.UploadAttributes(extendedBorderAttrs);
            }
        })(this);
    }

    Create(position: Vec2,
        dimension: Dimension,
        zIndex: number,
        text: string,
        containerStyle: ContainerStyle,
        lineHeight: number,
        deleter: UIObservableTextListDeleter,
        parent: UIObservablePositioningGroup | null = null): UITextList {

        const textList = new UIObservableTextList(
            position,
            dimension,
            zIndex,
            text,
            lineHeight,
            containerStyle,
            this.vertexAttributesTracker.Allocate(),
            this.labelRenderer,
            this.UIRenderer,
            deleter,
            parent);


        if (parent !== null) {
            parent.AppendChild(textList);
        }

        textList.Observable.Attach((component: UIObservableTextList) => this.UpdateAttributes(component))

        this.UpdateAttributes(textList);

        return textList;
    }

    Draw(): void {
        this.gl.enable(this.gl.STENCIL_TEST);

        this.gl.stencilFunc(
            this.gl.ALWAYS,
            1,
            0xFF
        );

        this.gl.stencilOp(
            this.gl.KEEP,
            this.gl.KEEP,
            this.gl.REPLACE
        );

        super.Draw();

        this.gl.stencilFunc(
            this.gl.EQUAL,
            1,
            0xFF
        );

        this.gl.stencilOp(
            this.gl.KEEP,
            this.gl.KEEP,
            this.gl.KEEP
        );

        this.labelRenderer.Draw();

        this.gl.clear(this.gl.STENCIL_BUFFER_BIT);
        this.gl.disable(this.gl.STENCIL_TEST);

        this.borderRenderer.Draw();
    }

    set ViewProjection(mat: Mat4 | Float32Array) {
        this.shader.SetUniformMatrix4fv('u_viewProject', mat);
        this.labelRenderer.ViewProjection = mat;
        this.borderRenderer.ViewProjection = mat;
    }

    get UIRenderer(): UICreator {
        return this.uiRenderer;
    }

    set UIRenderer(renderer: UICreator) {
        this.uiRenderer = renderer;
    }

    Dispose(): void {
        this.borderRenderer.Dispose();

        super.Dispose();
    }

    private UpdateAttributes(component: UIObservableTextList): void {
        this.UpdateStencilAttributes(component);
        this.UpdateBorderAttributes(component);
    }

    private UpdateStencilAttributes(component: UIObservableTextList): void {
        let attrs: number[];
        if (component.Visible) {
            attrs = PrimitiveBuilder.AABBRectangle(
                {
                    x: component.AbsolutePosition.x + component.ContainerStyle.borderWidth,
                    y: component.AbsolutePosition.y + component.ContainerStyle.borderWidth
                },
                {
                    width: component.Dimension.width - 2 * component.ContainerStyle.borderWidth,
                    height: component.Dimension.height - 2 * component.ContainerStyle.borderWidth
                },
                [
                    [this.settings.ZFar - component.ZIndex - this.zFarIncluded + 0.1],
                    component.ContainerStyle.fillColor
                ]);
        } else {
            attrs = new Array(this.AttributesPerComponent).fill(0);
        }

        this.UpdateComponentAttributes(attrs, component.Offset * this.AttributesPerComponent);
    }

    private UpdateBorderAttributes(component: UIObservableTextList): void {
        let attrs: number[];

        if (component.Visible) {
            attrs = PrimitiveBuilder.AABBFrame(
                component.AbsolutePosition,
                component.Dimension,
                component.ContainerStyle.borderWidth,
                [
                    [this.settings.ZFar - component.ZIndex - this.zFarIncluded]
                ]
            );
        } else {
            attrs = new Array(this.borderRenderer.AttributesPerComponent).fill(0);
        }

        this.borderRenderer.UpdateComponentAttributes(attrs, component.Offset * this.borderRenderer.AttributesPerComponent);
    }
}

Inversify.bind(UITextListRenderer).toSelf().inTransientScope();

export type UITextListRendererFactory = (uiRenderer: UIRenderer) => UITextListRenderer;

Inversify
    .bind<interfaces.Factory<UITextListRendererFactory>>(InjectionToken.UITextListRendererFactory)
    .toFactory<UITextListRenderer, [UIRenderer]>(ctx => (uiRenderer: UIRenderer) => {
        const instance = ctx.container.get(UITextListRenderer);
        instance.UIRenderer = uiRenderer;

        return instance;
    });
