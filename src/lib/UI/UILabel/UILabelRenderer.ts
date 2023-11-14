import { UIComponent } from '../UIComponent';

import { UILabel } from './UILabel';
import FUILabel from './UILabel.frag';
import VUILabel from './UILabel.vert';
import { UIObservableLabel } from './UIObservableLabel';

import { AppResource } from '@/app/AppResource';
import { AppSettings } from '@/app/AppSettings';
import { TextureCacheId } from '@/app/TextureCacheId';
import { Inversify } from '@/Inversify';
import { EnumSize } from "@/lib/EnumSize";
import { ExceptionTrap } from '@/lib/ExceptionTrap';
import { FontGlyphCollectionBuilder } from '@/lib/font/FontGlyphCollection';
import { MemoryPoolTracker } from '@/lib/MemoryPoolTracker';
import { NotNull } from '@/lib/NotNull';
import { Vec2 } from '@/lib/Primitives';
import { PrimitiveBuilder } from '@/lib/renderer/PrimitiveBuilder';
import { PrimitivesRenderer } from "@/lib/renderer/PrimitivesRenderer";
import { Mat4 } from '@/lib/renderer/ShaderProgram';
import { TypeSizeResolver } from "@/lib/renderer/TypeSizeResolver";
import { SelfBind } from '@/lib/SelfBind';


enum UILabelComponent { X, Y, Z, R, G, B, Ux, Uy };

type Offset = number;

/**
 * Note: In PrimitivesRenderer::PrimitiveAttributes method the index parameter means an individual symbol location but not a whole label component.
 *       It's because a label has dynamic attribute count that depends on text length.
 */
export class UILabelRenderer extends PrimitivesRenderer {
    private static readonly IndicesPerPrimitive = 6;

    private static readonly AttributesPerComponent = EnumSize(UILabelComponent) * UILabelRenderer.IndicesPerPrimitive;

    private settings: AppSettings;

    private readonly zFarIncluded = 0.1;

    private labels = new Map<Offset, UIObservableLabel>();

    private vertexAttributesTracker: MemoryPoolTracker;

    private fontTexture: WebGLTexture;

    constructor(gl: WebGL2RenderingContext) {
        const floatSize = TypeSizeResolver.Resolve(gl.FLOAT);
        const stride = floatSize * EnumSize(UILabelComponent);

        super(gl,
            { fragment: FUILabel, vertex: VUILabel },
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
            },
            {
                name: 'a_glyph',
                size: 2,
                type: gl.FLOAT,
                normalized: false,
                stride,
                offset: 6 * floatSize
            }],
            { indicesPerPrimitive: UILabelRenderer.IndicesPerPrimitive, basePrimitiveType: gl.TRIANGLES });

        this.settings = Inversify.get(AppSettings);

        this.fontTexture = Inversify.get(AppResource).TextureCache.Find(TextureCacheId.ASCIIAtlas) ?? NotNull('Failed to find font texture');

        this.vertexAttributesTracker = new (class extends MemoryPoolTracker {
            constructor(private renderer: UILabelRenderer) {
                const initialCapacity = 256;
                super(initialCapacity);

                renderer.UploadAttributes(Array.from({ length: UILabelRenderer.AttributesPerComponent * initialCapacity }, () => 0));
            }

            Free(index: number): void {
                const emptyAttrs = new Array(UILabelRenderer.AttributesPerComponent).fill(0);

                this.renderer.UpdateComponentAttributes(emptyAttrs, index * UILabelRenderer.AttributesPerComponent);

                super.Free(index);
            }

            OnShrink(inUseIndices: number[]): void {
                const labelAttrs = new Array(UILabelRenderer.AttributesPerComponent * inUseIndices.length).fill(0);

                for (let n = 0; n < inUseIndices.length; ++n) {
                    const offset = inUseIndices[n];

                    for (let attribOffset = 0; attribOffset < UILabelRenderer.AttributesPerComponent; ++attribOffset) {
                        labelAttrs[n * UILabelRenderer.AttributesPerComponent + attribOffset] = this.renderer.attributes[offset * UILabelRenderer.AttributesPerComponent + attribOffset];
                    }
                }

                this.renderer.UploadAttributes(labelAttrs);

                inUseIndices.forEach((oldOffset, offset) => {
                    const label = this.renderer.labels.get(oldOffset);

                    if (label !== undefined) {
                        this.renderer.labels.delete(oldOffset);
                        this.renderer.labels.set(offset, label);
                    }
                });
            }

            OnExtend(extendedCapacity: number): void {
                const extendedLabelAttrs = Array.from(
                    { length: extendedCapacity * UILabelRenderer.AttributesPerComponent },
                    (_, n) => n < this.renderer.attributes.length ? this.renderer.attributes[n] : 0);

                this.renderer.UploadAttributes(extendedLabelAttrs);
            }
        })(this);
    }

    set ViewProjection(mat: Mat4 | Float32Array) {
        this.shader.SetUniformMatrix4fv('u_viewProject', mat);
    }

    Create(position: Vec2,
        zIndex: number,
        text: string,
        lineHeight: number,
        parent: UIComponent | null): UILabel {
        const label = new UIObservableLabel(
            position,
            text,
            lineHeight,
            zIndex,
            {
                Allocate: (component: UIObservableLabel) => this.AllocateGlyph(component),
                Free: (idx: number) => this.GlyphFree(idx)
            },
            parent);

        label.Observable.Attach((component: UIObservableLabel) => this.UpdateAttributes(component));

        this.UpdateAttributes(label);

        return label;
    }

    Draw(): void {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.fontTexture);

        super.Draw();
    }

    private AllocateGlyph(component: UIObservableLabel): number {

        const offset = this.vertexAttributesTracker.Allocate();

        this.labels.set(offset, component);

        return offset;
    }

    private GlyphFree(idx: number): void {
        this.vertexAttributesTracker.Free(idx);
        this.labels.delete(idx);
    }

    private UpdateAttributes(component: UIObservableLabel): void {
        const fontGlyphCollection = FontGlyphCollectionBuilder.Build({ ASCIIRange: { Start: ' ', End: '~' }, Font: { Name: 'Roboto', Size: component.LineHeight } });

        for (let n = 0, { x, y } = component.AbsolutePosition; n < component.Text.length; ++n) {
            const symbol = component.Text[n];
            const style = component.Style[n];
            const offset = component.Offsets[n];

            if (symbol === '\n') {
                x = component.AbsolutePosition.x;
                y -= component.LineHeight * 0.8;
                continue;
            }

            const glyphBlueprint = ExceptionTrap
                .Try(SelfBind(fontGlyphCollection, 'Lookup'), symbol)
                .CatchFn(SelfBind(fontGlyphCollection, 'Lookup'), '?');

            const attributes = PrimitiveBuilder.AABBRectangle(
                { x, y: y + glyphBlueprint.baselineOffset.y },
                {
                    width: glyphBlueprint.width,
                    height: glyphBlueprint.height
                },
                [
                    [this.settings.ZFar - component.ZIndex - this.zFarIncluded],
                    style.color,
                    {
                        LeftBottom: [glyphBlueprint.uv.A.x, glyphBlueprint.uv.B.y],
                        LeftTop: [glyphBlueprint.uv.A.x, glyphBlueprint.uv.A.y],
                        RightTop: [glyphBlueprint.uv.B.x, glyphBlueprint.uv.A.y],
                        RightBottom: [glyphBlueprint.uv.B.x, glyphBlueprint.uv.B.y]
                    }
                ]);

            this.UpdateComponentAttributes(attributes, offset * UILabelRenderer.AttributesPerComponent);

            x += glyphBlueprint.width;
        }
    }
}
