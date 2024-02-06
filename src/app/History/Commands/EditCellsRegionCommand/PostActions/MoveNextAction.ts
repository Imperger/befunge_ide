import { inject, injectable, interfaces } from "inversify";

import type { EditCellsRegionCommand } from "../EditCellsRegionCommand";

import { PostAction } from "./PostAction";

import { CodeEditorService, EditionDirection } from "@/app/CodeEditor/CodeEditorService";
import { EditCellsRegionCommandPostAction } from "@/app/InjectionToken";
import { Inversify } from "@/Inversify";
import { Pointer } from "@/lib/befunge/memory/Memory";

@injectable()
export class MoveNextAction implements PostAction {
    constructor(@inject(CodeEditorService) private codeEditorService: CodeEditorService) { }

    Apply(target: EditCellsRegionCommand): void {
        this.codeEditorService.SetEditableCell(this.GetNextEditableCell(target));
    }

    private GetNextEditableCell(target: EditCellsRegionCommand): Pointer {
        switch (target.EditDirection) {
            case EditionDirection.Left:
                {
                    const x = target.Region.lt.x === 0 ?
                        this.codeEditorService.Dimension.Columns - 1 :
                        target.Region.lt.x - 1;

                    return { x, y: target.Region.lt.y };
                }
            case EditionDirection.Up:
                {
                    const y = target.Region.lt.y === 0 ?
                        this.codeEditorService.Dimension.Rows - 1 :
                        target.Region.lt.y - 1;

                    return { x: target.Region.lt.x, y };
                }
            case EditionDirection.Right:
                {
                    const x = target.Region.rb.x === this.codeEditorService.Dimension.Columns - 1 ?
                        0 :
                        target.Region.rb.x + 1;

                    return { x, y: target.Region.rb.y };
                }
            case EditionDirection.Down:
                {
                    const y = target.Region.rb.y === this.codeEditorService.Dimension.Rows - 1 ?
                        0 :
                        target.Region.rb.y + 1;

                    return { x: target.Region.rb.x, y };
                }
        }
    }
}

Inversify.bind(MoveNextAction).toSelf().inTransientScope();

Inversify
    .bind<interfaces.Factory<MoveNextAction>>(EditCellsRegionCommandPostAction.MoveNext)
    .toAutoFactory(MoveNextAction);
