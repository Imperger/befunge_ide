import { inject, injectable, interfaces } from "inversify";

import { HeatMapGridFactory, HeatmapGridRenderer } from "./HeatMapGridRenderer";

import { CodeEditorExtension } from "@/app/CodeEditor/CodeEditorExtension";
import { InjectionToken } from "@/app/InjectionToken";
import { Inversify } from "@/Inversify";
import { Array2D } from "@/lib/containers/Array2D";
import { Rgb, Rgba } from "@/lib/Primitives";
import { Mat4 } from "@/lib/renderer/ShaderProgram";

type HeatmapHitStats = Array2D<number>;


class HeatmapExtension implements CodeEditorExtension {
    constructor(private heatmapGridRenderer: HeatmapGridRenderer) { }

    Draw(): void {
        this.heatmapGridRenderer.Draw();
    }

    set ViewProjection(mat: Mat4 | Float32Array) {
        this.heatmapGridRenderer.ViewProjection = mat;
    }
}

@injectable()
export class HeatmapExtensionBuilder {
    private readonly lowHitsColor: Rgb = [0, 0.5568627450980392, 1];
    private readonly highHitsColor: Rgb = [1, 0, 0];

    private hitsColorsDiff!: Rgb;

    private maxHits = Number.NEGATIVE_INFINITY;

    private heatmap!: HeatmapHitStats;

    constructor(
        @inject(InjectionToken.HeatmapGridRendererFactory) private heatmapGridRendererFactory: HeatMapGridFactory
    ) { }

    Build(heatmap: HeatmapHitStats): HeatmapExtension {
        this.heatmap = heatmap;

        this.Setup();

        const colors = this.heatmap.Map(x => this.HitsToColor(x));

        const renderer = this.heatmapGridRendererFactory(colors);

        return new HeatmapExtension(renderer)
    }

    private HitsToColor(hits: number): Rgba {
        if (hits === 0) {
            return [1, 1, 1, 0];
        }

        const t = hits / this.maxHits;

        return [
            this.lowHitsColor[0] + this.hitsColorsDiff[0] * t,
            this.lowHitsColor[1] + this.hitsColorsDiff[1] * t,
            this.lowHitsColor[2] + this.hitsColorsDiff[2] * t,
            0.7
        ]
    }

    private Setup(): void {
        this.heatmap.ForEach(x => this.maxHits = Math.max(this.maxHits, x));

        this.hitsColorsDiff = [
            this.highHitsColor[0] - this.lowHitsColor[0],
            this.highHitsColor[1] - this.lowHitsColor[1],
            this.highHitsColor[2] - this.lowHitsColor[2]
        ];
    }
}

Inversify.bind(HeatmapExtensionBuilder).toSelf().inTransientScope();

export type HeatmapExtensionFactory = (heatmap: HeatmapHitStats) => HeatmapExtension;

Inversify
    .bind<interfaces.Factory<HeatmapExtensionFactory>>(InjectionToken.HeatmapExtensionFactory)
    .toFactory<HeatmapExtension, [HeatmapHitStats]>(ctx => (stats: HeatmapHitStats) => ctx.container.get(HeatmapExtensionBuilder).Build(stats));
