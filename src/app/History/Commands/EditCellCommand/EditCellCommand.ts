import { inject, injectable, interfaces } from "inversify";

import { Command } from "../Command";

import { PostAction } from "./PostActions/PostAction";

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

    private postAction!: PostAction;

    constructor(@inject(CodeEditorService) private codeEditorService: CodeEditorService) { }

    Initialize(...args: Parameters<EditCellCommandFactory>): void {
        [{ ...this.location }, this.oldValue, this.newValue, this.editDirection, this.postAction] = args;
    }

    Apply(): void {
        this.codeEditorService.EditCell(this.newValue, this.location.x, this.location.y);

        this.postAction.Apply(this);
    }

    Undo(): void {
        this.codeEditorService.EditCell(this.oldValue, this.location.x, this.location.y);

        this.codeEditorService.SetEditableCell(this.location);
        this.codeEditorService.EditableCellDirection = this.editDirection;
    }

    get Location(): Pointer {
        return this.location;
    }

    get OldValue(): string {
        return this.oldValue;
    }

    get NewValue(): string {
        return this.newValue;
    }

    get EditDirection(): EditionDirection {
        return this.editDirection;
    }
}

Inversify.bind(EditCellCommand).toSelf().inTransientScope();

export type EditCellCommandFactory = (location: Pointer, oldValue: string, newValue: string, editDirection: EditionDirection, postAction: PostAction) => Command;

Inversify
    .bind<interfaces.Factory<EditCellCommand>>(AppCommandInjectionToken.EditCellCommandFactory)
    .toFactory<EditCellCommand, Parameters<EditCellCommandFactory>>(ctx => (location: Pointer, oldValue: string, newValue: string, editDirection: EditionDirection, postAction: PostAction) => {
        const instance = ctx.container.get(EditCellCommand);
        instance.Initialize(location, oldValue, newValue, editDirection, postAction);

        return instance;
    });
