
import { inject, injectable } from 'inversify';

import { AppSettings } from '../AppSettings';
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

    constructor(
        @inject(AppSettings) private settings: AppSettings,
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

    ResizeGrid(): void {

        const vertexList: number[] = [];
        for (let row = 0; row < this.settings.MemoryLimit.Height; ++row) {
            for (let col = 0; col < this.settings.MemoryLimit.Width; ++col) {
                const cell = this.BuildCell(
                    { x: col * this.CellSize, y: row * this.CellSize },
                    [0, 0.592156862745098, 0.6549019607843137],
                    ' ');

                vertexList.push(...cell);
            }
        }

        this.UploadAttributes(vertexList);
    }

    Symbol(symbol: string, column: number, row: number): void {
        row = this.settings.MemoryLimit.Height - row - 1;
        const cellIdx = row * this.settings.MemoryLimit.Width + column;
        const cellAttrs = this.PrimitiveComponents(cellIdx);
        const symbolUV = this.fontAtlas.LookupUV(symbol);

        const UVStartOffset = 5;

        // Left bottom
        cellAttrs[UVStartOffset] = symbolUV.A.x;
        cellAttrs[UVStartOffset + 1] = symbolUV.B.y;

        const stride = EnumSize(CodeCellComponent);

        // Right top
        cellAttrs[UVStartOffset + stride] = symbolUV.B.x;
        cellAttrs[UVStartOffset + stride + 1] = symbolUV.A.y;

        // Left top
        cellAttrs[UVStartOffset + 2 * stride] = symbolUV.A.x;
        cellAttrs[UVStartOffset + 2 * stride + 1] = symbolUV.A.y;

        // Left bottom
        cellAttrs[UVStartOffset + 3 * stride] = symbolUV.A.x;
        cellAttrs[UVStartOffset + 3 * stride + 1] = symbolUV.B.y;

        // Right bottom
        cellAttrs[UVStartOffset + 4 * stride] = symbolUV.B.x;
        cellAttrs[UVStartOffset + 4 * stride + 1] = symbolUV.B.y;

        // Right top
        cellAttrs[UVStartOffset + 5 * stride] = symbolUV.B.x;
        cellAttrs[UVStartOffset + 5 * stride + 1] = symbolUV.A.y;

        this.UpdatePrimitiveComponents(cellAttrs, cellIdx * this.ComponentsPerPrimitive);
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

    get Dimension(): EditorGridDimension {
        return {
            Columns: this.settings.MemoryLimit.Width,
            Rows: this.settings.MemoryLimit.Height
        };
    }

    private SetupRenderer(): void {
        this.ResizeGrid();
    }
}

Inversify.bind(EditorGridRenderer).toSelf().inSingletonScope();
