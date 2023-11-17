
import { inject, injectable } from 'inversify';

import { InjectionToken } from '../InjectionToken';

import FGrid from './Grid.frag';
import VGrid from './Grid.vert';

import { Inversify } from '@/Inversify';
import { EnumSize } from '@/lib/EnumSize';
import { FontAtlas } from '@/lib/font/FontAtlasBuilder';
import { Rgb, Rgba, Vec2 } from '@/lib/Primitives';
import { PrimitiveBuilder } from '@/lib/renderer/PrimitiveBuilder';
import { PrimitivesRenderer } from "@/lib/renderer/PrimitivesRenderer";
import { Mat4 } from '@/lib/renderer/ShaderProgram';
import { TypeSizeResolver } from '@/lib/renderer/TypeSizeResolver';


enum CodeCellComponent { X, Y, R, G, B, Ux, Uy };

export interface EditorGridDimension {
    Columns: number;
    Rows: number;
}

@injectable()
export class EditorGridRenderer extends PrimitivesRenderer {
    public readonly CellSize = 10;

    public readonly Dimension: EditorGridDimension = { Columns: 80, Rows: 25 };

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) gl: WebGL2RenderingContext,
        @inject(InjectionToken.FontAtlas) private fontAtlas: FontAtlas,
        @inject(InjectionToken.FontAtlasTexture) private fontAtlasTexture: WebGLTexture) {
        const floatSize = TypeSizeResolver.Resolve(gl.FLOAT);
        const gridStride = floatSize * EnumSize(CodeCellComponent);

        super(gl,
            { fragment: FGrid, vertex: VGrid },
            [{
                name: 'a_vertex',
                size: 2,
                type: gl.FLOAT,
                normalized: false,
                stride: gridStride,
                offset: 0
            },
            {
                name: 'a_color',
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride: gridStride,
                offset: 2 * floatSize
            },
            {
                name: 'a_glyph',
                size: 2,
                type: gl.FLOAT,
                normalized: false,
                stride: gridStride,
                offset: 2 * floatSize + 3 * floatSize
            }],
            { indicesPerPrimitive: 6, basePrimitiveType: gl.TRIANGLES });

        this.SetupRenderer();
    }

    Resize(columns: number, rows: number): void {
        this.Dimension.Columns = columns;
        this.Dimension.Rows = rows;

        const vertexList: number[] = [];
        for (let row = 0; row < this.Dimension.Rows; ++row) {
            for (let col = 0; col < this.Dimension.Columns; ++col) {
                const cell = this.BuildCell(
                    { x: col * this.CellSize, y: row * this.CellSize },
                    [1, 0, 0],
                    ' ');

                vertexList.push(...cell);
            }
        }

        this.UploadAttributes(vertexList);
    }

    Symbol(symbol: string, column: number, row: number): void {
        row = this.Dimension.Rows - row - 1;

        const cellAttrs = this.PrimitiveAttributes(row * this.Dimension.Columns + column);
        const symbolUV = this.fontAtlas.LookupUV(symbol);

        const UVOffset = 5;
        const UVStartOffset = cellAttrs.offset + UVOffset;

        // Left bottom
        cellAttrs.buffer[UVStartOffset] = symbolUV.A.x;
        cellAttrs.buffer[UVStartOffset + 1] = symbolUV.B.y;

        const stride = EnumSize(CodeCellComponent);

        // Right top
        cellAttrs.buffer[UVStartOffset + stride] = symbolUV.B.x;
        cellAttrs.buffer[UVStartOffset + stride + 1] = symbolUV.A.y;

        // Left top
        cellAttrs.buffer[UVStartOffset + 2 * stride] = symbolUV.A.x;
        cellAttrs.buffer[UVStartOffset + 2 * stride + 1] = symbolUV.A.y;

        // Left bottom
        cellAttrs.buffer[UVStartOffset + 3 * stride] = symbolUV.A.x;
        cellAttrs.buffer[UVStartOffset + 3 * stride + 1] = symbolUV.B.y;

        // Right bottom
        cellAttrs.buffer[UVStartOffset + 4 * stride] = symbolUV.B.x;
        cellAttrs.buffer[UVStartOffset + 4 * stride + 1] = symbolUV.B.y;

        // Right top
        cellAttrs.buffer[UVStartOffset + 5 * stride] = symbolUV.B.x;
        cellAttrs.buffer[UVStartOffset + 5 * stride + 1] = symbolUV.A.y;

        const floatSize = TypeSizeResolver.Resolve(this.gl.FLOAT);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, floatSize * UVStartOffset, this.attributes, UVStartOffset, 5 * stride + 2);
    }

    Draw(): void {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.fontAtlasTexture);

        super.Draw();
    }

    private BuildCell(
        position: Vec2,
        color: Rgb | Rgba,
        symbol: string
    ): number[] {
        const uv = this.fontAtlas.LookupUV(symbol);

        return PrimitiveBuilder.AABBRectangle(
            position,
            { width: this.CellSize, height: this.CellSize },
            [
                color,
                {
                    LeftBottom: [uv.A.x, uv.B.y],
                    LeftTop: [uv.A.x, uv.A.y],
                    RightTop: [uv.B.x, uv.A.y],
                    RightBottom: [uv.B.x, uv.B.y]
                }
            ]
        );
    }

    set ViewProjection(mat: Mat4 | Float32Array) {
        this.shader.SetUniformMatrix4fv('u_viewProject', mat);
    }

    private SetupRenderer(): void {
        this.Resize(this.Dimension.Columns, this.Dimension.Rows);
    }
}

Inversify.bind(EditorGridRenderer).toSelf().inSingletonScope();
