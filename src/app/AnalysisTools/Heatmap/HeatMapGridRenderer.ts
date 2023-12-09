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
import { TypeSizeResolver } from "@/lib/renderer/TypeSizeResolver";

enum HeatmapCellComponent { X, Y, R, G, B };


export class HeatmapGridRenderer extends PrimitivesRenderer {
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
        const vertexList: number[] = [];
        for (let row = 0; row < this.settings.MemoryLimit.Height; ++row) {
            for (let column = 0; column < this.settings.MemoryLimit.Width; ++column) {
                const color: Rgba = heatmap.Get({ column, row: this.settings.MemoryLimit.Height - row - 1 });

                const cell = this.BuildCell(
                    { x: column * this.CellSize, y: row * this.CellSize },
                    [...color]);

                vertexList.push(...cell);
            }
        }

        return new HeatmapGridRenderer(this.gl, vertexList);
    }

    private BuildCell(
        position: Vec2,
        color: Rgba
    ): number[] {
        return PrimitiveBuilder.AABBRectangle(
            position,
            { width: this.CellSize, height: this.CellSize },
            [color]
        );
    }
}

Inversify.bind(HeatmapGridRendererBuilder).toSelf().inRequestScope();

export type HeatMapGridFactory = (heatmap: HeatmapColorInput) => HeatmapGridRenderer;

Inversify
    .bind<interfaces.Factory<HeatMapGridFactory>>(InjectionToken.HeatmapGridRendererFactory)
    .toFactory<HeatmapGridRenderer, [HeatmapColorInput]>(ctx => (data: HeatmapColorInput) => ctx.container.get(HeatmapGridRendererBuilder).Build(data));
