import { inject, injectable } from 'inversify';

import { InjectionToken } from '../InjectionToken';

import FCellsOutline from './CellsOutline.frag';
import VCellsOutline from './CellsOutline.vert';
import { EditorGridRenderer } from "./EditorGridRenderer";

import { Inversify } from '@/Inversify';
import { EnumSize } from '@/lib/EnumSize';
import { Rgb } from '@/lib/Primitives';
import { PrimitiveBuilder } from '@/lib/renderer/PrimitiveBuilder';
import { PrimitivesRenderer } from "@/lib/renderer/PrimitivesRenderer";
import { Mat4 } from '@/lib/renderer/ShaderProgram';
import { TypeSizeResolver } from '@/lib/renderer/TypeSizeResolver';

enum CodeCellOutlineComponent { X, Y, R, G, B };

@injectable()
export class EditorGridCellsOutlineRenderer extends PrimitivesRenderer {
    private readonly outlineWidth = 0.2;
    private readonly cellOutlineColor: Rgb = [0.5647058823529412, 0.6431372549019608, 0.6823529411764706];

    private gridOutlineWidth = 0.5;
    private readonly gridOutlineColor: Rgb = [0.20392156862745098, 0.596078431372549, 0.8588235294117647];

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) protected gl: WebGL2RenderingContext,
        @inject(EditorGridRenderer) private gridRenderer: EditorGridRenderer) {
        const floatSize = TypeSizeResolver.Resolve(gl.FLOAT);
        const gridStride = floatSize * EnumSize(CodeCellOutlineComponent);

        super(
            gl,
            { fragment: FCellsOutline, vertex: VCellsOutline },
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
            }],
            { indicesPerPrimitive: 6, basePrimitiveType: gl.TRIANGLES }
        );

        this.SetupRenderer();
    }

    set ViewProjection(mat: Mat4 | Float32Array) {
        this.shader.SetUniformMatrix4fv('u_viewProject', mat);
    }

    private SetupRenderer(): void {
        const vertexList: number[] = [];

        const editorOutline = PrimitiveBuilder.AABBFrame(
            { x: 0, y: 0 },
            {
                width: this.gridRenderer.Dimension.Columns * this.gridRenderer.CellSize,
                height: this.gridRenderer.Dimension.Rows * this.gridRenderer.CellSize
            },
            this.gridOutlineWidth,
            [this.gridOutlineColor]);

        vertexList.push(...editorOutline);

        for (let row = 1; row < this.gridRenderer.Dimension.Rows; ++row) {
            const rowAttrs = PrimitiveBuilder.AABBRectangle(
                { x: 0, y: row * this.gridRenderer.CellSize },
                {
                    width: this.gridRenderer.Dimension.Columns * this.gridRenderer.CellSize,
                    height: this.outlineWidth
                },
                [this.cellOutlineColor]);

            vertexList.push(...rowAttrs);
        }

        for (let col = 1; col < this.gridRenderer.Dimension.Columns; ++col) {
            const colAttrs = PrimitiveBuilder.AABBRectangle(
                { x: col * this.gridRenderer.CellSize, y: 0 },
                {
                    width: this.outlineWidth,
                    height: this.gridRenderer.Dimension.Rows * this.gridRenderer.CellSize
                },
                [this.cellOutlineColor]);

            vertexList.push(...colAttrs);
        }

        this.UploadAttributes(vertexList);
    }
}

Inversify.bind(EditorGridCellsOutlineRenderer).toSelf().inSingletonScope();
