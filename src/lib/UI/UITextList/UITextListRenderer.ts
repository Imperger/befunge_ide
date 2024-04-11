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
import { ArrayHelper } from "@/lib/ArrayHelper";
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
    }

    set ViewProjection(mat: Mat4 | Float32Array) {
        this.shader.SetUniformMatrix4fv('u_viewProject', mat);
    }
}

@injectable()
export class UITextListRenderer extends PrimitivesRenderer {
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

        this.borderRenderer = new UITextListBorderRenderer(this.gl);

        this.vertexAttributesTracker = new (class extends MemoryPoolTracker {
            constructor(private renderer: UITextListRenderer) {
                const initialCapacity = 2;
                super(initialCapacity);

                renderer.UploadAttributes(Array.from({ length: renderer.ComponentsPerPrimitive * initialCapacity }, () => 0));
                this.renderer.borderRenderer.UploadAttributes(Array.from({ length: renderer.borderRenderer.ComponentsPerPrimitive * initialCapacity }, () => 0));
            }

            Free(index: number): void {
                this.renderer.UpdatePrimitiveComponents(
                    new Array(this.renderer.ComponentsPerPrimitive).fill(0),
                    index * this.renderer.ComponentsPerPrimitive);

                this.renderer.borderRenderer.UpdatePrimitiveComponents(
                    new Array(this.renderer.borderRenderer.ComponentsPerPrimitive).fill(0),
                    index * this.renderer.borderRenderer.ComponentsPerPrimitive);

                super.Free(index);
            }

            OnShrink(inUseIndices: number[]): void {
                const scencilRectAttrs = new Array(this.renderer.ComponentsPerPrimitive * inUseIndices.length).fill(0);
                const borderAttrs = new Array(this.renderer.borderRenderer.ComponentsPerPrimitive * inUseIndices.length).fill(0);

                for (let n = 0; n < inUseIndices.length; ++n) {
                    const offset = inUseIndices[n];

                    const stencilComponents = this.renderer.PrimitiveComponents(offset);
                    ArrayHelper.Copy(
                        scencilRectAttrs,
                        n * this.renderer.ComponentsPerPrimitive,
                        stencilComponents,
                        0,
                        stencilComponents.length);

                    const borderComponents = this.renderer.borderRenderer.PrimitiveComponents(offset);
                    ArrayHelper.Copy(
                        borderAttrs,
                        n * this.renderer.borderRenderer.ComponentsPerPrimitive,
                        borderComponents,
                        0,
                        borderComponents.length);
                }

                this.renderer.UploadAttributes(scencilRectAttrs);
                this.renderer.borderRenderer.UploadAttributes(borderAttrs);
            }

            OnExtend(extendedCapacity: number): void {
                const stencilComponents = this.renderer.PrimitiveComponentsRange(0, this.renderer.TotalPrimitives);
                const extendedLabelAttrs = Array.from(
                    { length: extendedCapacity * this.renderer.ComponentsPerPrimitive },
                    (_, n) => n < stencilComponents.length ? stencilComponents[n] : 0);

                this.renderer.UploadAttributes(extendedLabelAttrs);


                const borderComponents = this.renderer.borderRenderer.PrimitiveComponentsRange(0, this.renderer.borderRenderer.TotalPrimitives);
                const extendedBorderAttrs = Array.from(
                    { length: extendedCapacity * this.renderer.borderRenderer.ComponentsPerPrimitive },
                    (_, n) => n < borderComponents.length ? borderComponents[n] : 0);

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
            attrs = new Array(this.ComponentsPerPrimitive).fill(0);
        }

        this.UpdatePrimitiveComponents(attrs, component.Offset * this.ComponentsPerPrimitive);
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
            attrs = new Array(this.borderRenderer.ComponentsPerPrimitive).fill(0);
        }

        this.borderRenderer.UpdatePrimitiveComponents(attrs, component.Offset * this.borderRenderer.ComponentsPerPrimitive);
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
