import { mat4 } from 'gl-matrix';
import { inject, injectable } from 'inversify';

import { UIObservablePositioningGroup } from '../UIObservablePositioningGroup';

import { UILabel } from './UILabel';
import FUILabel from './UILabel.frag';
import VUILabel from './UILabel.vert';
import { UIObservableLabel, UpdatedProperty } from './UIObservableLabel';

import { AppSettings } from '@/app/AppSettings';
import { InjectionToken, UILabelRendererTargetName } from '@/app/InjectionToken';
import { Inversify } from '@/Inversify';
import { ArrayHelper } from '@/lib/ArrayHelper';
import { ExceptionTrap } from '@/lib/ExceptionTrap';
import { FontGlyphCollection, FontGlyphCollectionFactory, GlyphMeshBlueprint } from '@/lib/font/FontGlyphCollection';
import { MemoryPoolTracker } from '@/lib/MemoryPoolTracker';
import { Vec2 } from '@/lib/Primitives';
import { PrimitiveBuilder } from '@/lib/renderer/PrimitiveBuilder';
import { PrimitivesRenderer } from "@/lib/renderer/PrimitivesRenderer";
import { Mat4 } from '@/lib/renderer/ShaderProgram';
import { SelfBind } from '@/lib/SelfBind';

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
    private readonly zFarIncluded = 0.1;

    private labels = new Map<Offset, UIObservableLabel>();

    private vertexAttributesTracker: MemoryPoolTracker;

    public Unique = false;

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) gl: WebGL2RenderingContext,
        @inject(AppSettings) private settings: AppSettings,
        @inject(InjectionToken.FontAtlasTexture) private fontTexture: WebGLTexture,
        @inject(InjectionToken.FontGlyphCollectionFactory) private fontGlyphCollectionFactory: FontGlyphCollectionFactory) {

        super(gl,
            { fragment: FUILabel, vertex: VUILabel },
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
            },
            {
                name: 'a_glyph',
                size: 2,
                type: gl.FLOAT,
                normalized: false
            }],
            { indicesPerPrimitive: 6, basePrimitiveType: gl.TRIANGLES });

        this.shader.SetUniformMatrix4fv('u_world', mat4.create());


        this.vertexAttributesTracker = new (class extends MemoryPoolTracker {
            constructor(private renderer: UILabelRenderer) {
                const initialCapacity = 256;
                super(initialCapacity);

                renderer.UploadAttributes(Array.from({ length: renderer.ComponentsPerPrimitive * initialCapacity }, () => 0));
            }

            Free(index: number): void {
                const emptyAttrs = new Array(this.renderer.ComponentsPerPrimitive).fill(0);

                this.renderer.UpdatePrimitiveComponents(emptyAttrs, index * this.renderer.ComponentsPerPrimitive);

                super.Free(index);
            }

            OnShrink(inUseIndices: number[]): void {
                const labelAttrs = new Array(this.renderer.ComponentsPerPrimitive * inUseIndices.length).fill(0);

                for (let n = 0; n < inUseIndices.length; ++n) {
                    const offset = inUseIndices[n];

                    const components = this.renderer.PrimitiveComponents(offset);
                    ArrayHelper.Copy(
                        labelAttrs,
                        n * this.renderer.ComponentsPerPrimitive,
                        components,
                        0,
                        components.length);
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
                const components = this.renderer.PrimitiveComponentsRange(0, this.renderer.TotalPrimitives);
                const extendedLabelAttrs = Array.from(
                    { length: extendedCapacity * this.renderer.ComponentsPerPrimitive },
                    (_, n) => n < components.length ? components[n] : 0);

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

    private OnlyPositionChanged(component: UIObservableLabel): boolean {
        return component.ChangedProperties.every((x, n) => n === UpdatedProperty.Position ? x : !x);
    }

    private UpdateAttributes(component: UIObservableLabel): void {
        let width = 0;
        let { x, y } = { x: 0, y: 0 };
        const fontGlyphCollection = this.fontGlyphCollectionFactory({ ASCIIRange: { Start: ' ', End: '~' }, Font: { Name: 'Roboto', Size: component.LineHeight } });
        const lines = UILabelRenderer.SplitString(component.Text);

        if (lines.length === 0) {
            component.UpdateTextDimension({ width: 0, height: 0 });
            return;
        }

        const minBaseOffset = UILabelRenderer.MinBaseOffset(lines[lines.length - 1].text, component, fontGlyphCollection);

        if (this.Unique) {
            const world = mat4.create();
            const p = component.AbsolutePosition;
            mat4.translate(world, world, [p.x, p.y, 0]);

            this.shader.SetUniformMatrix4fv('u_world', world);

            if (this.OnlyPositionChanged(component)) {
                return;
            }
        } else {
            x = component.AbsolutePosition.x;
            y = component.AbsolutePosition.y - minBaseOffset;
        }

        const xOffset = this.Unique ? 0 : component.AbsolutePosition.x;

        for (let n = lines.length - 1; n >= 0; --n) {
            const line = lines[n];

            if (line.text.length === 0) {
                x = xOffset;
                y += component.LineHeight * component.Scale;
                continue;
            }

            for (let n = 0; n < line.text.length; ++n) {
                const symbol = line.text[n];
                const style = component.Style[line.startIdx + n];
                const offset = component.Offsets[line.startIdx + n];

                if (offset === UIObservableLabel.NonPrintableOffset) {
                    continue;
                }

                const glyphBlueprint = UILabelRenderer.LookupGlyph(symbol, fontGlyphCollection);

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

                this.UpdatePrimitiveComponents(attributes, offset * this.ComponentsPerPrimitive);

                x += glyphBlueprint.width * component.Scale;

                width = Math.max(width, x - xOffset);
            }

            x = xOffset;
            y += component.LineHeight * component.Scale + minBaseOffset;
        }

        component.UpdateTextDimension({ width, height: y - component.AbsolutePosition.y });
    }

    private static MinBaseOffset(line: string, component: UIObservableLabel, fontGlyphCollection: FontGlyphCollection): number {
        if (line.length === 0) {
            return 0;
        }

        const comp = (a: string, b: string) => UILabelRenderer.LookupGlyph(a, fontGlyphCollection).baselineOffset.y < UILabelRenderer.LookupGlyph(b, fontGlyphCollection).baselineOffset.y;
        const maxBaselineOffsetSymbol = ArrayHelper.Min([...line], comp);

        return UILabelRenderer.LookupGlyph(maxBaselineOffsetSymbol, fontGlyphCollection).baselineOffset.y * component.Scale;
    }

    private static LookupGlyph(symbol: string, fontGlyphCollection: FontGlyphCollection): GlyphMeshBlueprint {
        return ExceptionTrap
            .Try(SelfBind(fontGlyphCollection, 'Lookup'), symbol)
            .CatchFn(SelfBind(fontGlyphCollection, 'Lookup'), '?');
    }

    private static SplitString(str: string): SplitedLine[] {
        const lines: SplitedLine[] = [];

        if (str.length === 0) {
            return [];
        }

        let lineStart = 0;
        for (let n = 0; n < str.length; ++n) {
            const symbol = str[n];

            if (symbol === '\n') {
                lines.push({ text: str.slice(lineStart, n), startIdx: lineStart });
                lineStart = n + 1;
            }
        }

        if (lineStart !== str.length) {
            lines.push({ text: str.slice(lineStart, str.length), startIdx: lineStart });
        }

        return lines;
    }
}

Inversify.bind(UILabelRenderer).toSelf().inSingletonScope().whenTargetIsDefault();
Inversify.bind(UILabelRenderer).toSelf().inSingletonScope().whenTargetNamed(UILabelRendererTargetName.Perspective);
Inversify.bind(UILabelRenderer).toSelf().inTransientScope().whenTargetNamed(UILabelRendererTargetName.Unique).onActivation((ctx, instance) => (instance.Unique = true, instance));
