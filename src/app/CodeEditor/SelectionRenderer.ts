import { inject, injectable } from 'inversify';

import { InjectionToken } from '../InjectionToken';

import { EditorGridRenderer } from './EditorGridRenderer';
import FSelection from './Selection.frag';
import VSelection from './Selection.vert';

import { Inversify } from '@/Inversify';
import { EnumSize } from '@/lib/EnumSize';
import { Rgb } from '@/lib/Primitives';
import { PrimitiveBuilder } from '@/lib/renderer/PrimitiveBuilder';
import { PrimitivesRenderer } from "@/lib/renderer/PrimitivesRenderer";
import { Mat4 } from '@/lib/renderer/ShaderProgram';
import { TypeSizeResolver } from "@/lib/renderer/TypeSizeResolver";

enum SelectionComponent { X, Y, R, G, B };

interface SelectionLocation {
    Column: number;
    Row: number;
}

@injectable()
export class SelectionRenderer extends PrimitivesRenderer {
    private static readonly IndicesPerPrimitive = 24;

    private readonly selected: SelectionLocation[] = [];

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

    Select(column: number, row: number, color: Rgb): void {
        row = this.editorGridRenderer.Dimension.Rows - row - 1;

        if (column < 0 || column >= this.editorGridRenderer.Dimension.Columns || row < 0 || row >= this.editorGridRenderer.Dimension.Rows) {
            return;
        }

        const selectionIdx = this.selected.findIndex(x => x.Column === column && x.Row === row);

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
            this.selected.push({ Column: column, Row: row });

            const selection = PrimitiveBuilder.AABBFrame(
                { x: column * this.editorGridRenderer.CellSize, y: row * this.editorGridRenderer.CellSize },
                { width: this.editorGridRenderer.CellSize, height: this.editorGridRenderer.CellSize },
                0.5,
                [color]);

            this.UploadAttributes([...this.attributes, ...selection]);
        }
    }

    Unselect(column: number, row: number): void {
        row = this.editorGridRenderer.Dimension.Rows - row - 1;

        const selectionIdx = this.selected.findIndex(x => x.Column === column && x.Row === row);

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