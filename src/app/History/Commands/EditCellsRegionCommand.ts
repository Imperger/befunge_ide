import { inject, injectable, interfaces } from "inversify";

import { Command } from "./Command";

import { CodeEditorService, EditionDirection } from "@/app/CodeEditor/CodeEditorService";
import { EditableRegion } from "@/app/CodeEditor/EditableTarget";
import { AppCommandInjectionToken } from "@/app/InjectionToken";
import { Inversify } from "@/Inversify";
import { Pointer } from "@/lib/befunge/memory/Memory";
import { Array2D } from "@/lib/containers/Array2D";
import { MathUtil } from "@/lib/math/MathUtil";


@injectable()
export class EditCellsRegionCommand implements Command {
    private region: EditableRegion = {
        lt: { x: -1, y: -1 },
        rb: { x: -1, y: -1 }
    };

    private oldValue!: Array2D<number>;

    private newValue!: Array2D<number>;

    private editDirection = EditionDirection.Right;

    constructor(@inject(CodeEditorService) private codeEditorService: CodeEditorService) { }

    Initialize(...args: Parameters<EditCellsRegionCommandFactory>): void {
        const region = MathUtil.Extremum([args[0].lt, args[0].rb]);
        this.region.lt = region.min;
        this.region.rb = region.max;

        [, this.oldValue, this.newValue, this.editDirection] = args;
    }

    Apply(): void {
        this.newValue
            .ForEach((x, idx) => this.codeEditorService.EditCell(String.fromCharCode(x), this.region.lt.x + idx.column, this.region.lt.y + idx.row));

        this.codeEditorService.SetEditableCell(this.GetNextEditableCell(this.editDirection));
    }

    Undo(): void {
        this.oldValue
            .ForEach((x, idx) => this.codeEditorService.EditCell(String.fromCharCode(x), this.region.lt.x + idx.column, this.region.lt.y + idx.row));

        this.codeEditorService.SetEditableCell(this.region.lt);
        this.codeEditorService.EditableCellDirection = this.editDirection;
    }

    private GetNextEditableCell(direction: EditionDirection): Pointer {
        switch (direction) {
            case EditionDirection.Left:
                {
                    const x = this.region.lt.x === 0 ?
                        this.codeEditorService.Dimension.Columns - 1 :
                        this.region.lt.x - 1;

                    return { x, y: this.region.lt.y };
                }
            case EditionDirection.Up:
                {
                    const y = this.region.lt.y === 0 ?
                        this.codeEditorService.Dimension.Rows - 1 :
                        this.region.lt.y - 1;

                    return { x: this.region.lt.x, y };
                }
            case EditionDirection.Right:
                {
                    const x = this.region.rb.x === this.codeEditorService.Dimension.Columns - 1 ?
                        0 :
                        this.region.rb.x + 1;

                    return { x, y: this.region.rb.y };
                }
            case EditionDirection.Down:
                {
                    const y = this.region.rb.y === this.codeEditorService.Dimension.Rows - 1 ?
                        0 :
                        this.region.rb.y + 1;

                    return { x: this.region.rb.x, y };
                }
        }
    }
}

Inversify.bind(EditCellsRegionCommand).toSelf().inTransientScope();

export type EditCellsRegionCommandFactory = (region: EditableRegion, oldValue: Array2D<number>, newValue: Array2D<number>, editDirection: EditionDirection) => Command;

Inversify
    .bind<interfaces.Factory<EditCellsRegionCommand>>(AppCommandInjectionToken.EditCellsRegionFactory)
    .toFactory<EditCellsRegionCommand, Parameters<EditCellsRegionCommandFactory>>(ctx => (region: EditableRegion, oldValue: Array2D<number>, newValue: Array2D<number>, editDirection: EditionDirection) => {
        const instance = ctx.container.get(EditCellsRegionCommand);
        instance.Initialize(region, oldValue, newValue, editDirection);

        return instance;
    });
