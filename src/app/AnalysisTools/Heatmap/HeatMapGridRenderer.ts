import { inject, injectable, interfaces } from "inversify";

import { AppSettings } from "../../AppSettings";
import { InjectionToken } from "../../InjectionToken";

import FHeatmapGrid from './HeatmapGrid.frag';
import VHeatmapGrid from './HeatmapGrid.vert';

import { Inversify } from "@/Inversify";
import { Array2D } from "@/lib/containers/Array2D";
import { Rgba, Vec2 } from "@/lib/Primitives";
import { PrimitiveBuilder } from "@/lib/renderer/PrimitiveBuilder";
import { PrimitivesRenderer } from "@/lib/renderer/PrimitivesRenderer";
import { Mat4 } from "@/lib/renderer/ShaderProgram";
import { UV } from "@/lib/renderer/TextureAtlas";


export class HeatmapGridRenderer extends PrimitivesRenderer {
    private readonly startTime = Date.now() / 1000;

    constructor(gl: WebGL2RenderingContext, attributes: number[]) {
        super(gl,
            { fragment: FHeatmapGrid, vertex: VHeatmapGrid },
            [{
                name: 'a_vertex',
                size: 2,
                type: gl.FLOAT,
                normalized: false
            },
            {
                name: 'a_uvCoord',
                size: 2,
                type: gl.FLOAT,
                normalized: false
            },
            {
                name: 'a_color',
                size: 4,
                type: gl.FLOAT,
                normalized: false
            },
            {
                name: 'a_hitsFlow',
                size: 1,
                type: gl.UNSIGNED_INT
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
interface HeatmapCellAttributes {
    color: Rgba;
    hitsFlow: number;
}

export type HeatmapRenderInfo = Array2D<HeatmapCellAttributes>;

@injectable()
class HeatmapGridRendererBuilder {
    public readonly CellSize = 10;

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) private gl: WebGL2RenderingContext,
        @inject(AppSettings) private settings: AppSettings
    ) { }

    Build(heatmap: HeatmapRenderInfo): HeatmapGridRenderer {
        const vertexList: number[] = [];
        for (let row = 0; row < this.settings.MemoryLimit.Height; ++row) {
            for (let column = 0; column < this.settings.MemoryLimit.Width; ++column) {
                const attributes = heatmap.Get({ column, row: this.settings.MemoryLimit.Height - row - 1 });

                const cell = this.BuildCell(
                    { x: column * this.CellSize, y: row * this.CellSize },
                    {
                        A: { x: 0, y: 0 },
                        B: { x: 1, y: 1 }
                    },
                    attributes.color,
                    attributes.hitsFlow);

                vertexList.push(...cell);
            }
        }

        return new HeatmapGridRenderer(this.gl, vertexList);
    }

    private BuildCell(
        position: Vec2,
        uvCoord: UV,
        color: Rgba,
        hitsFlow: number
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
                color,
                [hitsFlow]
            ]
        );
    }
}

Inversify.bind(HeatmapGridRendererBuilder).toSelf().inRequestScope();

export type HeatMapGridFactory = (heatmap: HeatmapRenderInfo) => HeatmapGridRenderer;

Inversify
    .bind<interfaces.Factory<HeatMapGridFactory>>(InjectionToken.HeatmapGridRendererFactory)
    .toFactory<HeatmapGridRenderer, [HeatmapRenderInfo]>(ctx => (data: HeatmapRenderInfo) => ctx.container.get(HeatmapGridRendererBuilder).Build(data));
