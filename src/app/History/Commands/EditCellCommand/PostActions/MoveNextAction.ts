import { inject, injectable, interfaces } from "inversify";

import { EditCellCommand } from "../EditCellCommand";

import { PostAction } from "./PostAction";

import { CodeEditorService, EditionDirection } from "@/app/CodeEditor/CodeEditorService";
import { EditCellCommandPostAction } from "@/app/InjectionToken";
import { Inversify } from "@/Inversify";
import { Pointer } from "@/lib/befunge/memory/Memory";

@injectable()
export class MoveNextAction implements PostAction {
    constructor(@inject(CodeEditorService) private codeEditorService: CodeEditorService) { }

    Apply(target: EditCellCommand): void {
        const codeFlowEditDirection = this.FollowCodeFlowHelper(target);
        if (target.EditDirection !== codeFlowEditDirection) {
            this.codeEditorService.EditableCellDirection = codeFlowEditDirection;
        }

        this.codeEditorService.SetEditableCell(this.GetNextEditableCell(target, codeFlowEditDirection));
    }

    private GetNextEditableCell(target: EditCellCommand, overriddenDirection: EditionDirection): Pointer {
        const nextEditableCell: Pointer = { ...target.Location };

        switch (overriddenDirection) {
            case EditionDirection.Left:
                nextEditableCell.x = target.Location.x === 0 ?
                    this.codeEditorService.Dimension.Columns - 1 :
                    target.Location.x - 1;
                break;
            case EditionDirection.Up:
                nextEditableCell.y = target.Location.y === 0 ?
                    this.codeEditorService.Dimension.Rows - 1 :
                    target.Location.y - 1;
                break;
            case EditionDirection.Right:
                nextEditableCell.x = target.Location.x === this.codeEditorService.Dimension.Columns - 1 ?
                    0 :
                    target.Location.x + 1;
                break;
            case EditionDirection.Down:
                nextEditableCell.y = target.Location.y === this.codeEditorService.Dimension.Rows - 1 ?
                    0 :
                    target.Location.y + 1;
                break;
        }

        return nextEditableCell;
    }

    private FollowCodeFlowHelper(target: EditCellCommand): EditionDirection {
        if (target.NewValue === '<') {
            return EditionDirection.Left;
        } else if (target.NewValue === '^') {
            return EditionDirection.Up;
        } else if (target.NewValue === '>') {
            return EditionDirection.Right;
        } else if (target.NewValue === 'v') {
            return EditionDirection.Down;
        }

        return target.EditDirection;
    }
}

Inversify.bind(MoveNextAction).toSelf().inTransientScope();

Inversify
    .bind<interfaces.Factory<MoveNextAction>>(EditCellCommandPostAction.MoveNext)
    .toAutoFactory(MoveNextAction);
