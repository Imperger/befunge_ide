import { inject, injectable } from 'inversify';

import { UIObservablePositioningGroup } from '../UIObservablePositioningGroup';

import { UILabel } from './UILabel';
import FUILabel from './UILabel.frag';
import VUILabel from './UILabel.vert';
import { UIObservableLabel } from './UIObservableLabel';

import { AppSettings } from '@/app/AppSettings';
import { InjectionToken, UILabelRendererTargetName } from '@/app/InjectionToken';
import { Inversify } from '@/Inversify';
import { EnumSize } from "@/lib/EnumSize";
import { ExceptionTrap } from '@/lib/ExceptionTrap';
import { FontGlyphCollection, FontGlyphCollectionFactory, GlyphMeshBlueprint } from '@/lib/font/FontGlyphCollection';
import { MemoryPoolTracker } from '@/lib/MemoryPoolTracker';
import { Vec2 } from '@/lib/Primitives';
import { PrimitiveBuilder } from '@/lib/renderer/PrimitiveBuilder';
import { PrimitivesRenderer } from "@/lib/renderer/PrimitivesRenderer";
import { Mat4 } from '@/lib/renderer/ShaderProgram';
import { TypeSizeResolver } from "@/lib/renderer/TypeSizeResolver";
import { SelfBind } from '@/lib/SelfBind';


enum UILabelComponent { X, Y, Z, R, G, B, Ux, Uy };

type Offset = number;

interface SplitedLine {
    startIdx: number;
    text: string;
}

/**
 * Note: In PrimitivesRenderer::PrimitiveAttributes method the index parameter means an individual symbol location but not a whole label component.
 *       It's because a label has dynamic attribute count that depends on text length.
 */
@injectable()
export class UILabelRenderer extends PrimitivesRenderer {
    private readonly IndicesPerPrimitive;

    private readonly AttributesPerComponent;

    private readonly zFarIncluded = 0.1;

    private labels = new Map<Offset, UIObservableLabel>();

    private vertexAttributesTracker: MemoryPoolTracker;

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) gl: WebGL2RenderingContext,
        @inject(AppSettings) private settings: AppSettings,
        @inject(InjectionToken.FontAtlasTexture) private fontTexture: WebGLTexture,
        @inject(InjectionToken.FontGlyphCollectionFactory) private fontGlyphCollectionProvider: FontGlyphCollectionFactory) {
        const floatSize = TypeSizeResolver.Resolve(gl.FLOAT);
        const stride = floatSize * EnumSize(UILabelComponent);
        const indicesPerPrimitive = 6;

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
            { indicesPerPrimitive, basePrimitiveType: gl.TRIANGLES });

        this.IndicesPerPrimitive = indicesPerPrimitive;
        this.AttributesPerComponent = EnumSize(UILabelComponent) * this.IndicesPerPrimitive;

        this.vertexAttributesTracker = new (class extends MemoryPoolTracker {
            constructor(private renderer: UILabelRenderer) {
                const initialCapacity = 256;
                super(initialCapacity);

                renderer.UploadAttributes(Array.from({ length: renderer.AttributesPerComponent * initialCapacity }, () => 0));
            }

            Free(index: number): void {
                const emptyAttrs = new Array(this.renderer.AttributesPerComponent).fill(0);

                this.renderer.UpdateComponentAttributes(emptyAttrs, index * this.renderer.AttributesPerComponent);

                super.Free(index);
            }

            OnShrink(inUseIndices: number[]): void {
                const labelAttrs = new Array(this.renderer.AttributesPerComponent * inUseIndices.length).fill(0);

                for (let n = 0; n < inUseIndices.length; ++n) {
                    const offset = inUseIndices[n];

                    for (let attribOffset = 0; attribOffset < this.renderer.AttributesPerComponent; ++attribOffset) {
                        labelAttrs[n * this.renderer.AttributesPerComponent + attribOffset] = this.renderer.attributes[offset * this.renderer.AttributesPerComponent + attribOffset];
                    }
                }

                this.renderer.UploadAttributes(labelAttrs);

                inUseIndices.forEach((oldOffset, offset) => {
                    const label = this.renderer.labels.get(oldOffset);

                    if (label !== undefined) {
                        this.renderer.labels.delete(oldOffset);
                        this.renderer.labels.set(offset, label);
                        label.ReplaceOffset(oldOffset, offset);
                    }
                });
            }

            OnExtend(extendedCapacity: number): void {
                const extendedLabelAttrs = Array.from(
                    { length: extendedCapacity * this.renderer.AttributesPerComponent },
                    (_, n) => n < this.renderer.attributes.length ? this.renderer.attributes[n] : 0);

                this.renderer.UploadAttributes(extendedLabelAttrs);
            }
        })(this);
    }

    get Labels(): readonly UILabel[] {
        return [...new Set([...this.labels.values()]).values()];
    }

    set ViewProjection(mat: Mat4 | Float32Array) {
        this.shader.SetUniformMatrix4fv('u_viewProject', mat);
    }

    Create(position: Vec2,
        zIndex: number,
        text: string,
        lineHeight: number,
        parent: UIObservablePositioningGroup | null): UILabel {
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

        if (parent !== null) {
            parent.AppendChild(label);
        }

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
        this.labels.delete(idx);
        this.vertexAttributesTracker.Free(idx);
    }

    private UpdateAttributes(component: UIObservableLabel): void {
        const fontGlyphCollection = this.fontGlyphCollectionProvider({ ASCIIRange: { Start: ' ', End: '~' }, Font: { Name: 'Roboto', Size: component.LineHeight } });

        let width = 0, height = 0;
        const avgBaseOffset = UILabelRenderer.AverageBaseOffset(component, fontGlyphCollection);
        const startBaseOffset = this.BaseStartOffset(component);

        let { x, y } = {
            x: component.AbsolutePosition.x,
            y: component.AbsolutePosition.y + startBaseOffset - avgBaseOffset
        };

        for (const line of UILabelRenderer.SplitString(component.Text)) {
            for (let n = 0; n < line.text.length; ++n) {
                const symbol = line.text[n];
                const style = component.Style[line.startIdx + n];
                const offset = component.Offsets[line.startIdx + n];

                const glyphBlueprint = UILabelRenderer.LookupGlyph(symbol, fontGlyphCollection);

                height = Math.max(height, component.AbsolutePosition.y + startBaseOffset - avgBaseOffset / component.Scale - y + glyphBlueprint.height);

                const attributes = PrimitiveBuilder.AABBRectangle(
                    { x, y: y + glyphBlueprint.baselineOffset.y * component.Scale },
                    {
                        width: glyphBlueprint.width * component.Scale,
                        height: glyphBlueprint.height * component.Scale
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

                this.UpdateComponentAttributes(attributes, offset * this.AttributesPerComponent);

                x += glyphBlueprint.width * component.Scale;

                width = Math.max(width, x - component.AbsolutePosition.x);
            }

            x = component.AbsolutePosition.x;
            y -= component.LineHeight * component.Scale;
        }

        component.UpdateTextDimension({ width, height });
    }

    private static AverageBaseOffset(component: UIObservableLabel, fontGlyphCollection: FontGlyphCollection): number {
        return [...component.Text]
            .reduce((sum, symbol) => sum + UILabelRenderer.LookupGlyph(symbol, fontGlyphCollection).baselineOffset.y * component.Scale, 0) / component.Text.length;
    }

    private static LookupGlyph(symbol: string, fontGlyphCollection: FontGlyphCollection): GlyphMeshBlueprint {
        return ExceptionTrap
            .Try(SelfBind(fontGlyphCollection, 'Lookup'), symbol)
            .CatchFn(SelfBind(fontGlyphCollection, 'Lookup'), '?');
    }

    private static SplitString(str: string): SplitedLine[] {
        return [...str.matchAll(/(.+)/g)]
            .map(x => ({ text: x[0], startIdx: x.index ?? -1 }));
    }

    private BaseStartOffset(component: UIObservableLabel): number {
        return [...component.Text.trimEnd()]
            .reduce((lineBreaks, symbol) => lineBreaks + (symbol === '\n' ? 1 : 0), 0) * component.LineHeight;
    }

}

Inversify.bind(UILabelRenderer).toSelf().inSingletonScope().whenTargetIsDefault();
Inversify.bind(UILabelRenderer).toSelf().inSingletonScope().whenTargetNamed(UILabelRendererTargetName.Perspective);
Inversify.bind(UILabelRenderer).toSelf().inTransientScope().whenTargetNamed(UILabelRendererTargetName.Unique);
