import { inject, injectable } from "inversify";

import { HeatmapExtensionFactory } from "../AnalysisTools/Heatmap/HeatmapExtension";
import { AppSettings } from "../AppSettings";
import { BefungeToolbox } from "../BefungeToolbox";
import { CodeEditorService } from "../CodeEditor/CodeEditorService";
import { InjectionToken } from "../InjectionToken";
import { HeatmapToggleButtonState } from "../Overlay/DebugControls";
import { OverlayService } from "../Overlay/OverlayService";
import { SourceCodeMemory } from "../SourceCodeMemory";

import { Inversify } from "@/Inversify";

@injectable()
export class ProfillingService {
    constructor(
        @inject(AppSettings) private settings: AppSettings,
        @inject(SourceCodeMemory) private editorSourceCode: SourceCodeMemory,
        @inject(BefungeToolbox) private befungeToolbox: BefungeToolbox,
        @inject(CodeEditorService) private codeEditor: CodeEditorService,
        @inject(OverlayService) private overlay: OverlayService,
        @inject(InjectionToken.HeatmapExtensionFactory) private heatmapExtensionFactory: HeatmapExtensionFactory
    ) {
        this.overlay.DebugControls.Heatmap.Attach((shown: HeatmapToggleButtonState) => this.ToggleHeatmap(shown))
    }

    private ToggleHeatmap(feedback: HeatmapToggleButtonState): void {
        feedback.isShown ? this.BuildHeatmap(feedback) : this.HideHeatmap();
    }

    private BuildHeatmap(feedback: HeatmapToggleButtonState): void {
        this.befungeToolbox.Reset(this.settings.MemoryLimit, this.editorSourceCode.Clone());

        this.befungeToolbox.Interpreter.SetInput(this.overlay.IOControls.Input);

        try {
            const heatmap = this.befungeToolbox.Profiler.CellHeatmapFor(1000);

            if (heatmap === null) {
                this.overlay.Snackbar.ShowWarning('Terminated due timeout');

                feedback.isShown = false;
            } else {
                const extension = this.heatmapExtensionFactory(heatmap);

                this.codeEditor.LoadExtension(extension);
            }
        } catch (e) {
            if (e instanceof Error) {
                this.overlay.Snackbar.ShowError(e.message)
            }

            feedback.isShown = false;
        }
    }

    private HideHeatmap(): void {
        this.codeEditor.UnloadExtension();
    }
}

Inversify.bind(ProfillingService).toSelf().inSingletonScope();
