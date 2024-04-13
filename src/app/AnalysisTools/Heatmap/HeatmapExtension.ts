import { inject, injectable, interfaces } from "inversify";

import { HeatMapGridFactory, HeatmapGridRenderer, HeatmapRenderInfo } from "./HeatMapGridRenderer";

import { AppSettings } from "@/app/AppSettings";
import { CodeEditorExtension } from "@/app/CodeEditor/CodeEditorExtension";
import { CodeEditorService } from "@/app/CodeEditor/CodeEditorService";
import { TooltipPosition, TooltipReleaser } from "@/app/CodeEditor/CodeEditorTooltipService";
import { InjectionToken } from "@/app/InjectionToken";
import { Inversify } from "@/Inversify";
import { CellHitsFlow } from "@/lib/befunge/Profiler";
import { Array2D } from "@/lib/containers/Array2D";
import { Rgb, Rgba } from "@/lib/Primitives";
import { Mat4 } from "@/lib/renderer/ShaderProgram";

type HeatmapHitStats = Array2D<CellHitsFlow>;

class HeatmapExtension implements CodeEditorExtension {
    constructor(
        private heatmapGridRenderer: HeatmapGridRenderer,
        private tooltipReleasers: TooltipReleaser[]) { }

    Draw(): void {
        this.heatmapGridRenderer.Draw();
    }

    Unload(): void {
        this.heatmapGridRenderer.Dispose();
        this.tooltipReleasers.forEach(release => release());
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
        @inject(AppSettings) private settings: AppSettings,
        @inject(CodeEditorService) private codeEditor: CodeEditorService,
        @inject(InjectionToken.HeatmapGridRendererFactory) private heatmapGridRendererFactory: HeatMapGridFactory
    ) { }

    Build(heatmap: HeatmapHitStats): HeatmapExtension {
        this.heatmap = heatmap;

        this.Setup();

        const releasers = this.DrawHitsOnCell();

        const max = this.MaxHits(this.heatmap);
        const renderInfo: HeatmapRenderInfo = this.heatmap
            .Map(x => ({ color: this.HitsToColor(x.Total), hitsFlow: this.PackHitsFlow(x.Normalized(max)) }));

        const renderer = this.heatmapGridRendererFactory(renderInfo);

        return new HeatmapExtension(renderer, releasers)
    }

    private MaxHits(stats: HeatmapHitStats): number {
        let max = 0;

        stats.ForEach(x => max = Math.max(max, x.Max));

        return max;
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
            0.8
        ]
    }

    private PackHitsFlow(normalizedHitsFlow: number[]): number {
        return normalizedHitsFlow.reduce((packed, x, n) => {
            if (x >= 0.66) {
                return packed | 3 << 2 * n;
            } else if (x >= 0.33) {
                return packed | 2 << 2 * n;
            } else if (x > 0) {
                return packed | 1 << 2 * n;
            }

            return packed;
        }, 0);
    }

    private Setup(): void {
        this.heatmap.ForEach(x => this.maxHits = Math.max(this.maxHits, x.Total));

        this.hitsColorsDiff = [
            this.highHitsColor[0] - this.lowHitsColor[0],
            this.highHitsColor[1] - this.lowHitsColor[1],
            this.highHitsColor[2] - this.lowHitsColor[2]
        ];
    }

    private DrawHitsOnCell(): TooltipReleaser[] {
        const releasers: TooltipReleaser[] = [];

        for (let row = 0; row < this.settings.MemoryLimit.Height; ++row) {
            for (let column = 0; column < this.settings.MemoryLimit.Width; ++column) {
                const hits = this.heatmap.Get({ column, row });
                if (hits.Total > 0) {
                    const releaser = this.codeEditor.Tooltip(column, row, hits.Total.toString(), TooltipPosition.LeftBottom);
                    releasers.push(releaser);
                }
            }
        }

        return releasers;
    }
}

Inversify.bind(HeatmapExtensionBuilder).toSelf().inTransientScope();

export type HeatmapExtensionFactory = (heatmap: HeatmapHitStats) => HeatmapExtension;

Inversify
    .bind<interfaces.Factory<HeatmapExtensionFactory>>(InjectionToken.HeatmapExtensionFactory)
    .toFactory<HeatmapExtension, [HeatmapHitStats]>(ctx => (stats: HeatmapHitStats) => ctx.container.get(HeatmapExtensionBuilder).Build(stats));
