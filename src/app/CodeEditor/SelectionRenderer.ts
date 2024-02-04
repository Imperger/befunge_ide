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
        const range = MathUtil.Extremum([this.FlipY(p0), this.FlipY(p1)]);

        if (this.OutOfGrid(range.min) || this.OutOfGrid(range.max)) {
            return;
        }

        const selectionIdx = this.selected
            .findIndex(r => r.a.x === range.min.x && r.a.y === range.min.y && r.b.x === range.max.x && r.b.y === range.max.y);

        if (selectionIdx !== -1) {
            const colorOffset = 2;
            const attrs = this.PrimitiveAttributes(selectionIdx);

            const floatSize = TypeSizeResolver.Resolve(this.gl.FLOAT);
            const componentsPerVertex = EnumSize(SelectionComponent);

            for (let n = 0; n < SelectionRenderer.IndicesPerPrimitive; ++n) {
                const colorStart = attrs.offset + colorOffset + n * componentsPerVertex;

                attrs.buffer[colorStart] = color[0];
                attrs.buffer[colorStart + 1] = color[1];
                attrs.buffer[colorStart + 2] = color[2];
            }

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER,
                floatSize * (attrs.offset + colorOffset),
                this.attributes,
                attrs.offset + colorOffset,
                (SelectionRenderer.IndicesPerPrimitive - 1) * componentsPerVertex + 3);
        } else {
            this.selected.push({ a: range.min, b: range.max });

            const selection = PrimitiveBuilder.AABBFrame(
                {
                    x: range.min.x * this.editorGridRenderer.CellSize,
                    y: range.min.y * this.editorGridRenderer.CellSize
                },
                {
                    width: (range.max.x - range.min.x + 1) * this.editorGridRenderer.CellSize,
                    height: (range.max.y - range.min.y + 1) * this.editorGridRenderer.CellSize
                },
                0.5,
                [color]);

            this.UploadAttributes([...this.attributes, ...selection]);
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
        const range = MathUtil.Extremum([this.FlipY(p0), this.FlipY(p1)]);

        const selectionIdx = this.selected
            .findIndex(r => r.a.x === range.min.x && r.a.y === range.min.y && r.b.x === range.max.x && r.b.y === range.max.y);

        if (selectionIdx === -1) {
            return;
        }

        const attrs = this.PrimitiveAttributes(selectionIdx);

        const copy = [...this.attributes];

        copy.splice(attrs.offset, EnumSize(SelectionComponent) * SelectionRenderer.IndicesPerPrimitive);
        this.UploadAttributes(copy);

        this.selected.splice(selectionIdx, 1);
    }

    set ViewProjection(mat: Mat4 | Float32Array) {
        this.shader.SetUniformMatrix4fv('u_viewProject', mat);
    }
}

Inversify.bind(SelectionRenderer).toSelf().inSingletonScope();