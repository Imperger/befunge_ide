import { inject, injectable, named } from "inversify";

import { UILabelRendererTargetName } from "../InjectionToken";

import { CodeEditorRenderer } from "./CodeEditorRenderer";

import { Inversify } from "@/Inversify";
import { UILabel } from "@/lib/UI/UILabel/UILabel";
import { UILabelRenderer } from "@/lib/UI/UILabel/UILabelRenderer";

export enum TooltipPosition { LeftBottom, LeftTop, RightTop, RightBottom };

export type TooltipReleaser = () => void;

interface Tooltip {
    column: number;
    row: number;
    position: TooltipPosition;
    instance: UILabel
}

@injectable()
export class CodeEditorTooltipService {
    private readonly tooltips: Tooltip[] = [];

    constructor(
        @inject(CodeEditorRenderer) private codeEditorRenderer: CodeEditorRenderer,
        @inject(UILabelRenderer) @named(UILabelRendererTargetName.Perspective) private perspectiveLabelRenderer: UILabelRenderer) { }

    Tooltip(column: number, row: number, text: string, position: TooltipPosition): TooltipReleaser {
        const tooltipIdx = this.FindIndex(column, row, position);

        if (tooltipIdx !== -1) {
            if (text === '') {
                this.ReleaseTooltip(tooltipIdx);
            } else {
                this.tooltips[tooltipIdx].instance.Text = text;
            }

            return this.BuildReleaser(column, row, position);
        }

        const cellSize = 10;
        const margin = 0.5;

        const instance = this.perspectiveLabelRenderer.Create(
            { x: 0, y: 0 },
            499.7,
            text,
            8,
            null);

        instance.Scale = 0.2;

        queueMicrotask(() => {
            let x = 0, y = 0;
            switch (position) {
                case TooltipPosition.LeftBottom:
                    x = margin + column * cellSize;
                    y = margin + (this.codeEditorRenderer.Dimension.Rows - row - 1) * cellSize;
                    break;
                case TooltipPosition.LeftTop:
                    x = margin + column * cellSize;
                    y = (this.codeEditorRenderer.Dimension.Rows - row - 1) * cellSize + cellSize - instance.Dimension.height - margin;
                    break;
                case TooltipPosition.RightTop:
                    x = column * cellSize + cellSize - instance.Dimension.width - margin;
                    y = (this.codeEditorRenderer.Dimension.Rows - row - 1) * cellSize + cellSize - instance.Dimension.height - margin;
                    break;
                case TooltipPosition.RightBottom:
                    x = column * cellSize + cellSize - instance.Dimension.width - margin;
                    y = margin + (this.codeEditorRenderer.Dimension.Rows - row - 1) * cellSize;
                    break;
            }

            instance.Position = { x, y };
        });

        this.tooltips.push({ column, row, position, instance });

        return this.BuildReleaser(column, row, position);
    }

    ReleaseAll(): void {
        while (this.tooltips.length > 0) {
            this.ReleaseTooltip(this.tooltips.length - 1);
        }
    }

    private FindIndex(column: number, row: number, position: TooltipPosition): number {
        return this.tooltips.findIndex(x => x.column === column && x.row === row && x.position === position);
    }

    private BuildReleaser(column: number, row: number, position: TooltipPosition): TooltipReleaser {
        return () => {
            const idx = this.FindIndex(column, row, position);

            if (idx !== -1) {
                this.ReleaseTooltip(idx);
            }
        };
    }

    private ReleaseTooltip(idx: number): void {
        this.tooltips[idx].instance.Destroy();
        this.tooltips.splice(idx, 1);
    }
}

Inversify.bind(CodeEditorTooltipService).toSelf().inSingletonScope();
