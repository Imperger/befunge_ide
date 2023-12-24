import { inject, injectable, interfaces } from "inversify";

import { AppSettings } from "../../AppSettings";
import { InjectionToken } from "../../InjectionToken";

import FHeatmapGrid from './HeatmapGrid.frag';
import VHeatmapGrid from './HeatmapGrid.vert';

import { Inversify } from "@/Inversify";
import { Array2D } from "@/lib/containers/Array2D";
import { EnumSize } from "@/lib/EnumSize";
import { Rgba, Vec2 } from "@/lib/Primitives";
import { PrimitiveBuilder } from "@/lib/renderer/PrimitiveBuilder";
import { PrimitivesRenderer } from "@/lib/renderer/PrimitivesRenderer";
import { Mat4 } from "@/lib/renderer/ShaderProgram";
import { UV } from "@/lib/renderer/TextureAtlas";
import { TypeSizeResolver } from "@/lib/renderer/TypeSizeResolver";

enum HeatmapCellComponent { X, Y, Fx, Fy, R, G, B };


export class HeatmapGridRenderer extends PrimitivesRenderer {
    private readonly startTime = Date.now() / 1000;

    constructor(gl: WebGL2RenderingContext, attributes: number[]) {
        const floatSize = TypeSizeResolver.Resolve(gl.FLOAT);
        const gridStride = floatSize * EnumSize(HeatmapCellComponent);

        super(gl,
            { fragment: FHeatmapGrid, vertex: VHeatmapGrid },
            [{
                name: 'a_vertex',
                size: 2,
                type: gl.FLOAT,
                normalized: false,
                stride: gridStride,
                offset: 0
            },
            {
                name: 'a_uvCoord',
                size: 2,
                type: gl.FLOAT,
                normalized: false,
                stride: gridStride,
                offset: 0
            },
            {
                name: 'a_color',
                size: 4,
                type: gl.FLOAT,
                normalized: false,
                stride: gridStride,
                offset: 2 * floatSize
            }],
            { indicesPerPrimitive: 6, basePrimitiveType: gl.TRIANGLES });

        this.UploadAttributes(attributes);
    }

    set ViewProjection(mat: Mat4 | Float32Array) {
        this.shader.SetUniformMatrix4fv('u_viewProject', mat);
    }

    Draw(): void {
        this.shader.SetUniform1f('u_time', Date.now() / 1000 - this.startTime);

        super.Draw();
    }
}

type HeatmapColorInput = Array2D<Rgba>;

@injectable()
class HeatmapGridRendererBuilder {
    public readonly CellSize = 10;

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) private gl: WebGL2RenderingContext,
        @inject(AppSettings) private settings: AppSettings
    ) { }

    Build(heatmap: HeatmapColorInput): HeatmapGridRenderer {
        const width = this.settings.MemoryLimit.Width * this.CellSize;
        const height = this.settings.MemoryLimit.Height * this.CellSize;
        const aspectRatio = width / height;
        const uvCellSize = { width: this.CellSize / width, height: this.CellSize / height };
        const vertexList: number[] = [];
        for (let row = 0; row < this.settings.MemoryLimit.Height; ++row) {
            for (let column = 0; column < this.settings.MemoryLimit.Width; ++column) {
                const color: Rgba = heatmap.Get({ column, row: this.settings.MemoryLimit.Height - row - 1 });

                const cell = this.BuildCell(
                    { x: column * this.CellSize, y: row * this.CellSize },
                    {
                        A: { x: column * this.CellSize / width * aspectRatio, y: row * this.CellSize / height },
                        B: { x: (column * this.CellSize / width + uvCellSize.width) * aspectRatio, y: row * this.CellSize / height + uvCellSize.height }
                    },
                    color);

                vertexList.push(...cell);
            }
        }

        return new HeatmapGridRenderer(this.gl, vertexList);
    }

    private BuildCell(
        position: Vec2,
        uvCoord: UV,
        color: Rgba
    ): number[] {
        return PrimitiveBuilder.AABBRectangle(
            position,
            { width: this.CellSize, height: this.CellSize },
            [
                {
                    LeftBottom: [uvCoord.A.x, uvCoord.A.y],
                    LeftTop: [uvCoord.A.x, uvCoord.B.y],
                    RightTop: [uvCoord.B.x, uvCoord.B.y],
                    RightBottom: [uvCoord.B.x, uvCoord.A.y]
                },
                color
            ]
        );
    }
}

Inversify.bind(HeatmapGridRendererBuilder).toSelf().inRequestScope();

export type HeatMapGridFactory = (heatmap: HeatmapColorInput) => HeatmapGridRenderer;

Inversify
    .bind<interfaces.Factory<HeatMapGridFactory>>(InjectionToken.HeatmapGridRendererFactory)
    .toFactory<HeatmapGridRenderer, [HeatmapColorInput]>(ctx => (data: HeatmapColorInput) => ctx.container.get(HeatmapGridRendererBuilder).Build(data));
