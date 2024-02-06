import { inject, injectable, interfaces } from "inversify";

import { Command } from "../Command";

import { PostAction } from "./PostActions/PostAction";

import { CodeEditorService, EditionDirection } from "@/app/CodeEditor/CodeEditorService";
import { EditableRegion } from "@/app/CodeEditor/EditableTarget";
import { AppCommandInjectionToken } from "@/app/InjectionToken";
import { Inversify } from "@/Inversify";
import { Array2D } from "@/lib/containers/Array2D";
import { MathUtil } from "@/lib/math/MathUtil";

export type PostActionEditablePosition = 'next' | 'left_top' | 'right_bottom';

@injectable()
export class EditCellsRegionCommand implements Command {
    private region: EditableRegion = {
        lt: { x: -1, y: -1 },
        rb: { x: -1, y: -1 }
    };

    private oldValue!: Array2D<number>;

    private newValue!: Array2D<number>;

    private editDirection = EditionDirection.Right;

    private postAction!: PostAction;

    constructor(@inject(CodeEditorService) private codeEditorService: CodeEditorService) { }

    Initialize(...args: Parameters<EditCellsRegionCommandFactory>): void {
        const region = MathUtil.Extremum([args[0].lt, args[0].rb]);
        this.region.lt = region.min;
        this.region.rb = region.max;

        [, this.oldValue, this.newValue, this.editDirection, this.postAction] = args;
    }

    Apply(): void {
        this.newValue
            .ForEach((x, idx) => this.codeEditorService.EditCell(String.fromCharCode(x), this.region.lt.x + idx.column, this.region.lt.y + idx.row));

        this.postAction.Apply(this);
    }

    Undo(): void {
        this.oldValue
            .ForEach((x, idx) => this.codeEditorService.EditCell(String.fromCharCode(x), this.region.lt.x + idx.column, this.region.lt.y + idx.row));

        this.codeEditorService.SetEditableCell(this.region.lt);
        this.codeEditorService.EditableCellDirection = this.editDirection;
    }

    get Region(): EditableRegion {
        return this.region;
    }

    get EditDirection(): EditionDirection {
        return this.editDirection;
    }
}

Inversify.bind(EditCellsRegionCommand).toSelf().inTransientScope();

export type EditCellsRegionCommandFactory = (region: EditableRegion, oldValue: Array2D<number>, newValue: Array2D<number>, editDirection: EditionDirection, postAction: PostAction) => Command;

Inversify
    .bind<interfaces.Factory<EditCellsRegionCommand>>(AppCommandInjectionToken.EditCellsRegionFactory)
    .toFactory<EditCellsRegionCommand, Parameters<EditCellsRegionCommandFactory>>(ctx => (region: EditableRegion, oldValue: Array2D<number>, newValue: Array2D<number>, editDirection: EditionDirection, postAction: PostAction) => {
        const instance = ctx.container.get(EditCellsRegionCommand);
        instance.Initialize(region, oldValue, newValue, editDirection, postAction);

        return instance;
    });
