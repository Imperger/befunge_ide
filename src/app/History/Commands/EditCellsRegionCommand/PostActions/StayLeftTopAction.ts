import { inject, injectable, interfaces } from "inversify";

import type { EditCellsRegionCommand } from "../EditCellsRegionCommand";

import { PostAction } from "./PostAction";

import { CodeEditorService } from "@/app/CodeEditor/CodeEditorService";
import { EditCellsRegionCommandPostAction } from "@/app/InjectionToken";
import { Inversify } from "@/Inversify";

@injectable()
export class StayLeftTopAction implements PostAction {
    constructor(@inject(CodeEditorService) private codeEditorService: CodeEditorService) { }

    Apply(target: EditCellsRegionCommand): void {
        this.codeEditorService.SetEditableCell(target.Region.lt);
    }
}

Inversify.bind(StayLeftTopAction).toSelf().inTransientScope();

Inversify
    .bind<interfaces.Factory<StayLeftTopAction>>(EditCellsRegionCommandPostAction.StayLeftTop)
    .toAutoFactory(StayLeftTopAction);
