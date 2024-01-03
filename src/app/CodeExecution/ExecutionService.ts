import { inject, injectable } from "inversify";

import { AppSettings } from "../AppSettings";
import { BefungeToolbox } from "../BefungeToolbox";
import { OverlayService } from "../Overlay/OverlayService";
import { SourceCodeMemory } from "../SourceCodeMemory";

import { Inversify } from "@/Inversify";

@injectable()
export class ExecutionService {
    constructor(
        @inject(AppSettings) private settings: AppSettings,
        @inject(OverlayService) private overlay: OverlayService,
        @inject(BefungeToolbox) private befungeToolbox: BefungeToolbox,
        @inject(SourceCodeMemory) private editorSourceCode: SourceCodeMemory
    ) {
        this.overlay.DebugControls.Execute.Attach(() => this.Execute());
    }

    private Execute(): void {
        this.befungeToolbox.Reset(this.settings.MemoryLimit, this.editorSourceCode.Clone());

        this.befungeToolbox.Interpreter.SetInput(this.overlay.InputControls.Text);

        try {
            if (this.befungeToolbox.Interpreter.RunFor(this.settings.ExecutionTimeout)) {
                this.overlay.Snackbar.ShowSuccess(`Ok\nInstructions executed: ${this.befungeToolbox.Interpreter.InstructionsExecuted}`);
            } else {
                this.overlay.Snackbar.ShowWarning('Terminated due timeout');
            }

            this.overlay.OutputControls.Output = this.befungeToolbox.Interpreter.CollectOutputUntil(this.settings.MaxOutputLength);
        } catch (e) {
            if (e instanceof Error) {
                this.overlay.Snackbar.ShowError(e.message)
            }
        }
    }
}

Inversify.bind(ExecutionService).toSelf().inSingletonScope();
