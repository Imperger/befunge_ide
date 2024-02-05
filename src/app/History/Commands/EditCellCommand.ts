import { inject, injectable, interfaces } from "inversify";

import { Command } from "./Command";

import { CodeEditorService, EditionDirection } from "@/app/CodeEditor/CodeEditorService";
import { AppCommandInjectionToken } from "@/app/InjectionToken";
import { Inversify } from "@/Inversify";
import { Pointer } from "@/lib/befunge/memory/Memory";


@injectable()
export class EditCellCommand implements Command {
    private location: Pointer = { x: -1, y: -1 };

    private oldValue = '';

    private newValue = '';

    private editDirection = EditionDirection.Right;

    constructor(@inject(CodeEditorService) private codeEditorService: CodeEditorService) { }

    Initialize(...args: Parameters<EditCellCommandFactory>): void {
        [{ ...this.location }, this.oldValue, this.newValue, this.editDirection] = args;
    }

    Apply(): void {
        this.codeEditorService.EditCell(this.newValue, this.location.x, this.location.y);

        const codeFlowEditDirection = this.FollowCodeFlowHelper(this.newValue);
        if (this.editDirection !== codeFlowEditDirection) {
            this.codeEditorService.EditableCellDirection = codeFlowEditDirection;
        }

        this.codeEditorService.SetEditableCell(this.GetNextEditableCell(codeFlowEditDirection));
    }

    Undo(): void {
        this.codeEditorService.EditCell(this.oldValue, this.location.x, this.location.y);

        this.codeEditorService.SetEditableCell(this.location);
        this.codeEditorService.EditableCellDirection = this.editDirection;
    }

    private GetNextEditableCell(direction: EditionDirection): Pointer {
        const nextEditableCell: Pointer = { ...this.location };

        switch (direction) {
            case EditionDirection.Left:
                nextEditableCell.x = this.location.x === 0 ?
                    this.codeEditorService.Dimension.Columns - 1 :
                    this.location.x - 1;
                break;
            case EditionDirection.Up:
                nextEditableCell.y = this.location.y === 0 ?
                    this.codeEditorService.Dimension.Rows - 1 :
                    this.location.y - 1;
                break;
            case EditionDirection.Right:
                nextEditableCell.x = this.location.x === this.codeEditorService.Dimension.Columns - 1 ?
                    0 :
                    this.location.x + 1;
                break;
            case EditionDirection.Down:
                nextEditableCell.y = this.location.y === this.codeEditorService.Dimension.Rows - 1 ?
                    0 :
                    this.location.y + 1;
                break;
        }

        return nextEditableCell;
    }

    private FollowCodeFlowHelper(symbol: string): EditionDirection {
        if (symbol === '<') {
            return EditionDirection.Left;
        } else if (symbol === '^') {
            return EditionDirection.Up;
        } else if (symbol === '>') {
            return EditionDirection.Right;
        } else if (symbol === 'v') {
            return EditionDirection.Down;
        }

        return this.editDirection;
    }
}

Inversify.bind(EditCellCommand).toSelf().inTransientScope();

export type EditCellCommandFactory = (location: Pointer, oldValue: string, newValue: string, editDirection: EditionDirection) => Command;

Inversify
    .bind<interfaces.Factory<EditCellCommand>>(AppCommandInjectionToken.EditCellCommandFactory)
    .toFactory<EditCellCommand, Parameters<EditCellCommandFactory>>(ctx => (location: Pointer, oldValue: string, newValue: string, editDirection: EditionDirection) => {
        const instance = ctx.container.get(EditCellCommand);
        instance.Initialize(location, oldValue, newValue, editDirection);

        return instance;
    });
