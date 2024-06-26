import { inject, injectable, interfaces } from "inversify";

import { CodeEditorService } from "./CodeEditor/CodeEditorService";
import { CodeExecutionService } from "./CodeExecution/CodeExecutionService";
import { InjectionToken } from "./InjectionToken";
import { OverlayService } from "./Overlay/OverlayService";

import { Inversify } from "@/Inversify";
import { Observable, ObservableController } from "@/lib/Observable";
import { InputReceiver, MyInputEvent } from "@/lib/UI/InputReceiver";

@injectable()
export class CodeEditorServiceInputReceiver implements InputReceiver {
    private onVanish = new ObservableController<void>();

    constructor(
        @inject(CodeEditorService) private codeEditor: CodeEditorService,
        @inject(OverlayService) private overlay: OverlayService,
        @inject(CodeExecutionService) private codeExecutionService: CodeExecutionService) { }

    OnInput(e: MyInputEvent): void {
        const keyCode = e.key.charCodeAt(0);

        const isNavigation = this.IsNavigationEvent(e.key);

        if (e.key.length === 1 && keyCode >= ' '.charCodeAt(0) && keyCode <= '~'.charCodeAt(0) || e.key === 'Backspace' || isNavigation) {
            if (!isNavigation && this.overlay.DebugControls.DebugMode) {
                this.overlay.Snackbar.ShowInformation('Editing is disabled during the debugging');
            } else if (!isNavigation && this.overlay.DebugControls.IsHeatmapShown) {
                this.overlay.Snackbar.ShowInformation('Editing is disabled while heatmap is active');
            } else {
                const prevEditableCell = { ...this.codeEditor.EditableCell };

                this.codeEditor.CellInput(e);

                this.codeExecutionService.Debugging.OnCellInput(prevEditableCell);
            }
        }
    }

    private IsNavigationEvent(keycode: string): boolean {
        return ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(keycode);
    }

    Focus(): void {
        this.codeEditor.Focus();
    }

    Blur(): void {
        this.codeEditor.Blur();
    }

    get OnVanish(): Observable<void> {
        return this.onVanish;
    }
}

Inversify.bind(CodeEditorServiceInputReceiver).toSelf().inRequestScope();

export type CodeEditorServiceInputReceiverFactory = () => CodeEditorServiceInputReceiver;

Inversify
    .bind<interfaces.Factory<CodeEditorServiceInputReceiver>>(InjectionToken.CodeEditorServiceInputReceiverFactory)
    .toFactory<CodeEditorServiceInputReceiver>(ctx => () => ctx.container.get(CodeEditorServiceInputReceiver));
