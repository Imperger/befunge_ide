
import { inject, injectable, interfaces } from "inversify";

import { Command } from "./Command";

import { CodeEditorRenderer } from "@/app/CodeEditor/CodeEditorRenderer";
import { CodeEditorService, EditionDirection } from "@/app/CodeEditor/CodeEditorService";
import { AppCommandInjectionToken } from "@/app/InjectionToken";
import { SourceCodeMemory } from "@/app/SourceCodeMemory";
import { Inversify } from "@/Inversify";
import { Pointer } from "@/lib/befunge/memory/Memory";


@injectable()
export class EditCellCommand implements Command {
    private location: Pointer = { x: -1, y: -1 };

    private oldValue = '';

    private newValue = '';

    private editDirection = EditionDirection.Right;

    constructor(
        @inject(SourceCodeMemory) private editorSourceCode: SourceCodeMemory,
        @inject(CodeEditorRenderer) private codeEditorRenderer: CodeEditorRenderer,
        @inject(CodeEditorService) private codeEditorService: CodeEditorService) { }

    Initialize(...args: Parameters<EditCellCommandFactory>): void {
        [{ ...this.location }, this.oldValue, this.newValue, this.editDirection] = args;
    }

    Apply(): void {
        this.codeEditorRenderer.Symbol(this.newValue, this.location.x, this.location.y);
        this.editorSourceCode.Write(this.location, this.newValue.charCodeAt(0));

        const codeFlowEditDirection = this.FollowCodeFlowHelper(this.newValue);
        if (this.editDirection !== codeFlowEditDirection) {
            this.codeEditorService.EditionDirection = codeFlowEditDirection;
        }

        this.codeEditorService.SetEditableCell(this.GetNextEditionCell(codeFlowEditDirection));
    }

    Undo(): void {
        this.codeEditorRenderer.Symbol(this.oldValue, this.location.x, this.location.y);
        this.editorSourceCode.Write(this.location, this.oldValue.charCodeAt(0));

        this.codeEditorService.SetEditableCell(this.location);
        this.codeEditorService.EditionDirection = this.editDirection;
    }

    private GetNextEditionCell(direction: EditionDirection): Pointer {
        const nextEditableCell: Pointer = { ...this.location };

        switch (direction) {
            case EditionDirection.Left:
                nextEditableCell.x = this.location.x === 0 ?
                    this.codeEditorRenderer.Dimension.Columns - 1 :
                    this.location.x - 1;
                break;
            case EditionDirection.Up:
                nextEditableCell.y = this.location.y === 0 ?
                    this.codeEditorRenderer.Dimension.Rows - 1 :
                    this.location.y - 1;
                break;
            case EditionDirection.Right:
                nextEditableCell.x = this.location.x === this.codeEditorRenderer.Dimension.Columns - 1 ?
                    0 :
                    this.location.x + 1;
                break;
            case EditionDirection.Down:
                nextEditableCell.y = this.location.y === this.codeEditorRenderer.Dimension.Rows - 1 ?
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
