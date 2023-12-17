import { inject, injectable } from "inversify";

import { AppSettings } from "../AppSettings";
import { BefungeToolbox } from "../BefungeToolbox";
import { CodeEditorService } from "../CodeEditor/CodeEditorService";
import { TooltipPosition } from "../CodeEditor/CodeEditorTooltipService";
import { PCDirectionCondition } from "../Overlay/DebugControls";
import { OverlayService } from "../Overlay/OverlayService";
import { SourceCodeMemory } from "../SourceCodeMemory";

import { Inversify } from "@/Inversify";
import { BreakpointCondition, BreakpointReleaser, PcLocationCondition } from "@/lib/befunge/Debugger";
import { Pointer } from "@/lib/befunge/memory/Memory";
import { Rgb, Vec2 } from "@/lib/Primitives";

interface CellBreakpointController extends PcLocationCondition {
    releaser: BreakpointReleaser | null;
}

@injectable()
export class DebuggingService {
    private debugMode = false;
    private cellBreakpoints: CellBreakpointController[] = [];
    private activeCellBreakpoints: PcLocationCondition[] = [];
    private activeBreakpointColor: Rgb = [0.8980392156862745, 0.2235294117647059, 0.20784313725490197];
    private inactiveBreakpointColor: Rgb = [0.9764705882352941, 0.6588235294117647, 0.1450980392156863];

    constructor(
        @inject(AppSettings) private settings: AppSettings,
        @inject(OverlayService) private overlay: OverlayService,
        @inject(CodeEditorService) private codeEditor: CodeEditorService,
        @inject(BefungeToolbox) private befungeToolbox: BefungeToolbox,
        @inject(SourceCodeMemory) private editorSourceCode: SourceCodeMemory
    ) {
        this.overlay.DebugControls.Debug.Attach((next: boolean) => this.DebugCodeAction(next));
        this.overlay.DebugControls.CellBreakopint.Attach((cond: PCDirectionCondition) => this.OnCellBreakpointAction(cond));
        this.overlay.DebugControls.CellBreakpointDelete.Attach(() => this.OnCellBreakpointDelete());
    }

    OnSelect(prevEditionCell: Vec2): void {
        const hasBrk = this.cellBreakpoints
            .some(brk => brk.Location.x === this.codeEditor.EditionCell.x && brk.Location.y === this.codeEditor.EditionCell.y);

        this.overlay.DebugControls.DeactivateButton = hasBrk;

        if (prevEditionCell.x !== this.codeEditor.EditionCell.x || prevEditionCell.y !== this.codeEditor.EditionCell.y) {
            if (this.activeCellBreakpoints.some(brk => brk.Location.x === prevEditionCell.x && brk.Location.y === prevEditionCell.y)) {
                this.codeEditor.Select(prevEditionCell.x, prevEditionCell.y, this.activeBreakpointColor);
            } else if (this.cellBreakpoints.some(brk => brk.Location.x === prevEditionCell.x && brk.Location.y === prevEditionCell.y)) {
                this.codeEditor.Select(prevEditionCell.x, prevEditionCell.y, this.inactiveBreakpointColor);
            }
        }
    }

    OnCellInput(prevEditionCell: Vec2): void {
        if (this.cellBreakpoints.some(brk => brk.Location.x === prevEditionCell.x && brk.Location.y === prevEditionCell.y)) {
            this.codeEditor.Select(prevEditionCell.x, prevEditionCell.y, this.inactiveBreakpointColor);
        }
    }

    private RunNext(): void {
        if (!this.debugMode) {
            this.befungeToolbox.Reset(this.settings.MemoryLimit, this.editorSourceCode.Clone());
            this.befungeToolbox.Interpreter.AddMemoryWriteInterceptor((ptr: Pointer, value: number) => this.OnMemoryWrite(ptr, value));

            this.UploadBreakpointsToDebugger();

            this.debugMode = true;
            this.overlay.DebugControls.DebugMode = true;

            this.overlay.OutputControls.Output = '';
        }

        const debug = this.befungeToolbox.Debugger;
        const interpreter = this.befungeToolbox.Interpreter;



        let executionResult: BreakpointCondition[] | null;
        try {
            executionResult = debug.RunFor(this.settings.ExecutionTimeout);
        } catch (e) {
            if (e instanceof Error) {
                this.overlay.Snackbar.ShowError(e.message)
            }

            this.Interrupt();
            return;
        }


        let breakpoints: BreakpointCondition[] = [];

        if (executionResult === null) {
            if (!debug.IsHalted) {
                this.overlay.Snackbar.ShowWarning('Terminated due timeout');

                this.overlay.StackControls.Stack = [];
            }

            this.debugMode = false;
            this.overlay.DebugControls.DebugMode = false;
            this.activeCellBreakpoints = [];

            this.codeEditor.HideAllTooltips();
        } else {
            breakpoints = executionResult;
        }

        if (breakpoints.length > 0) {
            console.log(breakpoints);
            this.RestoreCellBreakpointsSelection();

            this.activeCellBreakpoints = [];
            for (const brk of breakpoints) {
                if (brk.PC) {
                    this.activeCellBreakpoints.push(brk.PC);
                    this.codeEditor.Select(brk.PC.Location.x, brk.PC.Location.y, this.activeBreakpointColor);
                }
            }

            this.overlay.StackControls.Stack = debug.Stack;
            this.overlay.StackControls.ScrollToTop();
            this.overlay.OutputControls.Output += interpreter.CollectOutputUntil(this.settings.MaxOutputLength);
        }


        if (debug.IsHalted) {
            this.debugMode = false;
            this.overlay.DebugControls.DebugMode = false;
            this.activeCellBreakpoints = [];

            this.overlay.OutputControls.Output += interpreter.CollectOutputUntil(this.settings.MaxOutputLength);

            this.RestoreCellBreakpointsSelection();

            this.codeEditor.HideAllTooltips();

            this.overlay.Snackbar.ShowSuccess(`Completed`);

            this.overlay.StackControls.Stack = [];
        }
    }

    private Interrupt(): void {
        this.debugMode = false;
        this.overlay.DebugControls.DebugMode = false;
        this.activeCellBreakpoints = [];

        this.RestoreCellBreakpointsSelection();

        this.codeEditor.HideAllTooltips();

        this.overlay.StackControls.Stack = [];
    }

    private DebugCodeAction(next: boolean): void {
        next ? this.RunNext() : this.Interrupt();
    }

    private UploadBreakpointsToDebugger(): void {
        this.cellBreakpoints.forEach(brk => {
            brk.releaser = this.SetCellBreakpoint(brk);
        });
    }

    private SetCellBreakpoint(brk: PcLocationCondition): BreakpointReleaser {
        const releaser = this.befungeToolbox.Debugger.SetBreakpoint({ PC: brk });

        this.codeEditor.Select(brk.Location.x, brk.Location.y, this.inactiveBreakpointColor);

        return () => {
            releaser();
            this.codeEditor.Unselect(brk.Location.x, brk.Location.y);
        };
    }

    private OnCellBreakpointAction(cond: PCDirectionCondition): void {
        const existIdx = this.cellBreakpoints
            .findIndex(brk => brk.Location.x === this.codeEditor.EditionCell.x && brk.Location.y === this.codeEditor.EditionCell.y);

        const condition: PcLocationCondition = {
            Location: { ...this.codeEditor.EditionCell },
            ...cond
        };

        if (existIdx === -1) {
            const releaser = this.debugMode ? this.SetCellBreakpoint(condition) : null;
            this.cellBreakpoints.push({ ...condition, releaser });

            this.codeEditor.Select(condition.Location.x, condition.Location.y, this.inactiveBreakpointColor);

            this.overlay.DebugControls.DeactivateButton = true;
        } else {
            const releaser = this.debugMode ? this.SetCellBreakpoint(condition) : null;
            this.cellBreakpoints[existIdx] = { ...condition, releaser };
        }
    }

    private OnCellBreakpointDelete(): void {
        const existIdx = this.cellBreakpoints
            .findIndex(brk => brk.Location.x === this.codeEditor.EditionCell.x && brk.Location.y === this.codeEditor.EditionCell.y);

        if (existIdx !== -1) {
            const brkRemove = this.cellBreakpoints[existIdx];

            if (brkRemove.releaser !== null) {
                brkRemove.releaser();
            }

            const activeBrkIdx = this.activeCellBreakpoints.findIndex(brk => brk.Location.x === brkRemove.Location.x && brk.Location.y === brkRemove.Location.y);

            if (activeBrkIdx !== -1) {
                this.activeCellBreakpoints.splice(activeBrkIdx, 1);
            }

            this.cellBreakpoints.splice(existIdx, 1);

            this.codeEditor.Select(brkRemove.Location.x, brkRemove.Location.y, [0.21568627450980393, 0.2784313725490196, 0.30980392156862746]);
        }
    }

    private RestoreCellBreakpointsSelection(): void {
        for (const brk of this.befungeToolbox.Debugger.PCBreakpoints) {
            this.codeEditor.Select(brk.Location.x, brk.Location.y, this.inactiveBreakpointColor);
        }
    }

    private OnMemoryWrite(ptr: Pointer, value: number): void {
        this.codeEditor.Tooltip(
            ptr.x,
            ptr.y,
            `${value.toString()}(${String.fromCharCode(value)})`,
            TooltipPosition.RightTop);
    }
}

Inversify.bind(DebuggingService).toSelf().inSingletonScope();
