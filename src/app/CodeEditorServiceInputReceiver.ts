import { inject, injectable, interfaces } from "inversify";

import { CodeEditorService } from "./CodeEditor/CodeEditorService";
import { CodeExecutionService } from "./CodeExecution/CodeExecutionService";
import { InjectionToken } from "./InjectionToken";
import { OverlayService } from "./Overlay/OverlayService";

import { Inversify } from "@/Inversify";
import { Observable, ObservableController } from "@/lib/Observable";
import { InputReceiver } from "@/lib/UI/InputReceiver";

@injectable()
export class CodeEditorServiceInputReceiver implements InputReceiver {
    private onDestroy = new ObservableController<void>();

    constructor(
        @inject(CodeEditorService) private codeEditor: CodeEditorService,
        @inject(OverlayService) private overlay: OverlayService,
        @inject(CodeExecutionService) private codeExecutionService: CodeExecutionService) { }

    OnInput(e: KeyboardEvent): void {
        const keyCode = e.key.charCodeAt(0);

        if (e.key.length === 1 && keyCode >= ' '.charCodeAt(0) && keyCode <= '~'.charCodeAt(0)) {
            if (this.overlay.DebugControls.DebugMode) {
                this.overlay.Snackbar.ShowInformation('Editing is disabled during the debugging');
            } else if (this.overlay.DebugControls.IsHeatmapShown) {
                this.overlay.Snackbar.ShowInformation('Editing is disabled while heatmap is active');
            } else {
                const prevEditableCell = { ...this.codeEditor.EditableCell };

                this.codeEditor.CellInput(e);

                this.codeExecutionService.Debugging.OnCellInput(prevEditableCell);
            }
        }
    }

    Focus(): void {
        this.codeEditor.Focus();
    }

    Blur(): void {
        this.codeEditor.Blur();
    }

    get OnDestroy(): Observable<void> {
        return this.onDestroy;
    }
}

Inversify.bind(CodeEditorServiceInputReceiver).toSelf().inRequestScope();

export type CodeEditorServiceInputReceiverFactory = () => CodeEditorServiceInputReceiver;

Inversify
    .bind<interfaces.Factory<CodeEditorServiceInputReceiver>>(InjectionToken.CodeEditorServiceInputReceiverFactory)
    .toFactory<CodeEditorServiceInputReceiver>(ctx => () => ctx.container.get(CodeEditorServiceInputReceiver));
