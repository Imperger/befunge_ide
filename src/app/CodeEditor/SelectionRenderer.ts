import { inject, injectable } from 'inversify';

import { InjectionToken } from '../InjectionToken';

import { EditorGridRenderer } from './EditorGridRenderer';
import FSelection from './Selection.frag';
import VSelection from './Selection.vert';

import { Inversify } from '@/Inversify';
import { EnumSize } from '@/lib/EnumSize';
import { MathUtil } from '@/lib/math/MathUtil';
import { Rgb, Vec2 } from '@/lib/Primitives';
import { PrimitiveBuilder } from '@/lib/renderer/PrimitiveBuilder';
import { PrimitivesRenderer } from "@/lib/renderer/PrimitivesRenderer";
import { Mat4 } from '@/lib/renderer/ShaderProgram';
import { TypeSizeResolver } from "@/lib/renderer/TypeSizeResolver";

enum SelectionComponent { X, Y, R, G, B };

interface SelectionBoundaryPoint {
    x: number;
    y: number;
}

interface Selection {
    a: SelectionBoundaryPoint;
    b: SelectionBoundaryPoint;
}

@injectable()
export class SelectionRenderer extends PrimitivesRenderer {
    private static readonly IndicesPerPrimitive = 24;

    private readonly selected: Selection[] = [];

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) gl: WebGL2RenderingContext,
        @inject(EditorGridRenderer) private editorGridRenderer: EditorGridRenderer) {
        const floatSize = TypeSizeResolver.Resolve(gl.FLOAT);

        const selectionStride = floatSize * EnumSize(SelectionComponent);

        super(
            gl,
            { fragment: FSelection, vertex: VSelection },
            [
                {
                    name: 'a_vertex',
                    size: 2,
                    type: gl.FLOAT,
                    normalized: false,
                    stride: selectionStride,
                    offset: 0
                },
                {
                    name: 'a_color',
                    size: 3,
                    type: gl.FLOAT,
                    normalized: false,
                    stride: selectionStride,
                    offset: 2 * floatSize
                }
            ],
            { indicesPerPrimitive: SelectionRenderer.IndicesPerPrimitive, basePrimitiveType: gl.TRIANGLES });
    }

    Select(x: number, y: number, color: Rgb): void {
        this.SelectRegion({ x, y }, { x, y }, color);
    }

    SelectRegion(p0: Vec2, p1: Vec2, color: Rgb): void {
        const region = MathUtil.Extremum([this.FlipY(p0), this.FlipY(p1)]);

        if (this.OutOfGrid(region.min) || this.OutOfGrid(region.max)) {
            return;
        }

        const selectionIdx = this.selected
            .findIndex(r => r.a.x === region.min.x && r.a.y === region.min.y && r.b.x === region.max.x && r.b.y === region.max.y);

        if (selectionIdx !== -1) {
            const colorOffset = 2;
            const attrs = this.PrimitiveComponents(selectionIdx);
            const componentsPerVertex = EnumSize(SelectionComponent);

            for (let n = 0; n < SelectionRenderer.IndicesPerPrimitive; ++n) {
                const colorStart = colorOffset + n * componentsPerVertex;

                attrs[colorStart] = color[0];
                attrs[colorStart + 1] = color[1];
                attrs[colorStart + 2] = color[2];
            }

            this.UpdatePrimitiveComponents(attrs, selectionIdx * componentsPerVertex * SelectionRenderer.IndicesPerPrimitive)
        } else {
            this.selected.push({ a: region.min, b: region.max });

            const attributes = PrimitiveBuilder.AABBFrame(
                {
                    x: region.min.x * this.editorGridRenderer.CellSize,
                    y: region.min.y * this.editorGridRenderer.CellSize
                },
                {
                    width: (region.max.x - region.min.x + 1) * this.editorGridRenderer.CellSize,
                    height: (region.max.y - region.min.y + 1) * this.editorGridRenderer.CellSize
                },
                0.5,
                [color]);

            this.UploadAttributes([
                ...this.PrimitiveComponentsRange(0, this.TotalPrimitives),
                ...attributes
            ]);
        }
    }

    private OutOfGrid(p: Vec2): boolean {
        return p.x < 0 || p.x >= this.editorGridRenderer.Dimension.Columns ||
            p.y < 0 || p.y >= this.editorGridRenderer.Dimension.Rows;
    }

    private FlipY(point: Vec2): Vec2 {
        return {
            x: point.x,
            y: this.editorGridRenderer.Dimension.Rows - point.y - 1
        }
    }

    Unselect(x: number, y: number): void {
        this.UnselectRegion({ x, y }, { x, y });
    }

    UnselectRegion(p0: Vec2, p1: Vec2): void {
        const region = MathUtil.Extremum([this.FlipY(p0), this.FlipY(p1)]);

        const selectionIdx = this.selected
            .findIndex(r => r.a.x === region.min.x && r.a.y === region.min.y && r.b.x === region.max.x && r.b.y === region.max.y);

        if (selectionIdx === -1) {
            return;
        }

        const attributes = this.PrimitiveComponentsRange(0, this.TotalPrimitives);
        attributes.splice(selectionIdx * this.ComponentsPerPrimitive, this.ComponentsPerPrimitive);

        this.UploadAttributes(attributes);

        this.selected.splice(selectionIdx, 1);
    }

    set ViewProjection(mat: Mat4 | Float32Array) {
        this.shader.SetUniformMatrix4fv('u_viewProject', mat);
    }
}

Inversify.bind(SelectionRenderer).toSelf().inSingletonScope();