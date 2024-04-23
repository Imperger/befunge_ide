import { inject, injectable } from "inversify";

import { AppSettings } from "../AppSettings";
import { BefungeToolbox } from "../BefungeToolbox";
import { CodeEditorService } from "../CodeEditor/CodeEditorService";
import { TooltipPosition, TooltipReleaser } from "../CodeEditor/CodeEditorTooltipService";
import { EditableTarget } from "../CodeEditor/EditableTarget";
import { DebugAction, PCDirectionCondition } from "../Overlay/DebugControls";
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
    private breakpoints: CellBreakpointController[] = [];
    private activeCellBreakpoints: PcLocationCondition[] = [];
    private activeBreakpointColor: Rgb = [0.8980392156862745, 0.2235294117647059, 0.20784313725490197];
    private inactiveBreakpointColor: Rgb = [0.9764705882352941, 0.6588235294117647, 0.1450980392156863];
    private memoryWritesTooltipsReleasers: TooltipReleaser[] = [];

    constructor(
        @inject(AppSettings) private settings: AppSettings,
        @inject(OverlayService) private overlay: OverlayService,
        @inject(CodeEditorService) private codeEditor: CodeEditorService,
        @inject(BefungeToolbox) private befungeToolbox: BefungeToolbox,
        @inject(SourceCodeMemory) private editorSourceCode: SourceCodeMemory,
        @inject(EditableTarget) private editableCell: EditableTarget
    ) {
        this.overlay.DebugControls.Debug.Attach((action: DebugAction) => this.DebugCodeAction(action));
        this.overlay.DebugControls.CellBreakopint.Attach((cond: PCDirectionCondition) => this.OnCellBreakpointAction(cond));
        this.overlay.DebugControls.CellBreakpointDelete.Attach(() => this.OnCellBreakpointDelete());
    }

    OnSelect(prevEditableCell: Vec2): void {
        const hasBrk = this.breakpoints
            .some(brk => brk.Location.x === this.codeEditor.EditableCell.x && brk.Location.y === this.codeEditor.EditableCell.y);

        this.overlay.DebugControls.DeactivateButton = hasBrk;

        if (prevEditableCell.x !== this.codeEditor.EditableCell.x || prevEditableCell.y !== this.codeEditor.EditableCell.y) {
            if (this.activeCellBreakpoints.some(brk => brk.Location.x === prevEditableCell.x && brk.Location.y === prevEditableCell.y)) {
                this.codeEditor.Select(prevEditableCell.x, prevEditableCell.y, this.activeBreakpointColor);
            } else if (this.breakpoints.some(brk => brk.Location.x === prevEditableCell.x && brk.Location.y === prevEditableCell.y)) {
                this.codeEditor.Select(prevEditableCell.x, prevEditableCell.y, this.inactiveBreakpointColor);
            }
        }
    }

    OnCellInput(prevEditableCell: Vec2): void {
        if (this.breakpoints.some(brk => brk.Location.x === prevEditableCell.x && brk.Location.y === prevEditableCell.y)) {
            this.codeEditor.Select(prevEditableCell.x, prevEditableCell.y, this.inactiveBreakpointColor);
        }
    }

    private RunNext(action: DebugAction): void {
        if (!this.DebugMode) {
            this.befungeToolbox.Reset(this.settings.MemoryLimit, this.editorSourceCode.Clone());
            this.befungeToolbox.Interpreter.SetInput(this.overlay.IOControls.Input);
            this.befungeToolbox.Interpreter.AddMemoryWriteInterceptor((ptr: Pointer, value: number) => this.OnMemoryWrite(ptr, value));

            this.UploadBreakpointsToDebugger();

            this.DebugMode = true;
            this.overlay.DebugControls.DebugMode = true;

            this.overlay.IOControls.Output = '';
        }

        const debug = this.befungeToolbox.Debugger;
        const interpreter = this.befungeToolbox.Interpreter;


        this.activeCellBreakpoints.forEach(brk => {
            if (this.editableCell.IsSingleCell &&
                brk.Location.x === this.codeEditor.EditableCell.x &&
                brk.Location.y === this.codeEditor.EditableCell.y) {
                this.codeEditor.Select(brk.Location.x, brk.Location.y, this.settings.Visual.editableCellStyle);
            } else {
                this.codeEditor.Unselect(brk.Location.x, brk.Location.y);
            }
        });


        let executionResult: BreakpointCondition[] | null;
        try {
            if (action === DebugAction.RunNextBreakpoint) {
                executionResult = debug.RunFor(this.settings.ExecutionTimeout);
            } else if (action === DebugAction.RunNextInstruction) {
                executionResult = debug.RunNext();
                if (executionResult.length > 0) {
                    executionResult = debug.RunNext();
                }
            } else {
                throw new Error('Unexpected debug action');
            }
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

            this.DebugMode = false;
            this.overlay.DebugControls.DebugMode = false;
            this.activeCellBreakpoints = [];

            this.HideMemoryWriteTooltips();
        } else {
            breakpoints = executionResult;
        }

        if (action === DebugAction.RunNextBreakpoint && breakpoints.length > 0) {
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
            this.overlay.IOControls.Output += interpreter.CollectOutputUntil(this.settings.MaxOutputLength);
        } else {
            this.RestoreCellBreakpointsSelection();

            this.activeCellBreakpoints = [{ Location: { x: interpreter.IP.x, y: interpreter.IP.y } }];

            this.codeEditor.Select(interpreter.IP.x, interpreter.IP.y, this.activeBreakpointColor);

            this.overlay.StackControls.Stack = debug.Stack;
            this.overlay.StackControls.ScrollToTop();
            this.overlay.IOControls.Output += interpreter.CollectOutputUntil(this.settings.MaxOutputLength);
        }

        if (debug.IsHalted) {
            this.DebugMode = false;
            this.overlay.DebugControls.DebugMode = false;

            this.activeCellBreakpoints.forEach(brk => this.codeEditor.Unselect(brk.Location.x, brk.Location.y));
            this.activeCellBreakpoints = [];

            this.overlay.IOControls.Output += interpreter.CollectOutputUntil(this.settings.MaxOutputLength);

            this.RestoreCellBreakpointsSelection();

            this.HideMemoryWriteTooltips();

            this.overlay.Snackbar.ShowSuccess(`Completed`);

            this.overlay.StackControls.Stack = [];
        }
    }

    private Interrupt(): void {
        this.DebugMode = false;
        this.overlay.DebugControls.DebugMode = false;

        this.activeCellBreakpoints.forEach(brk => this.codeEditor.Unselect(brk.Location.x, brk.Location.y));
        this.activeCellBreakpoints = [];

        this.RestoreCellBreakpointsSelection();


        this.HideMemoryWriteTooltips();

        this.overlay.StackControls.Stack = [];
    }

    private get DebugMode(): boolean {
        return this.debugMode;
    }

    private set DebugMode(debug: boolean) {
        this.debugMode = debug;

        this.overlay.StackControls.Visible = debug;
        this.overlay.EditControls.Disable = debug;
    }

    private DebugCodeAction(action: DebugAction): void {
        if (action === DebugAction.RunNextBreakpoint && this.breakpoints.length === 0 && !this.debugMode) {
            this.RunNext(DebugAction.RunNextInstruction);
        } else if (action === DebugAction.Interrupt) {
            this.Interrupt();
        } else {
            this.RunNext(action);
        }
    }

    private UploadBreakpointsToDebugger(): void {
        this.breakpoints.forEach(brk => {
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
        const existIdx = this.breakpoints
            .findIndex(brk => brk.Location.x === this.codeEditor.EditableCell.x && brk.Location.y === this.codeEditor.EditableCell.y);

        const condition: PcLocationCondition = {
            Location: { ...this.codeEditor.EditableCell },
            ...cond
        };

        if (existIdx === -1) {
            const releaser = this.DebugMode ? this.SetCellBreakpoint(condition) : null;
            this.breakpoints.push({ ...condition, releaser });

            this.codeEditor.Select(condition.Location.x, condition.Location.y, this.inactiveBreakpointColor);

            this.overlay.DebugControls.DeactivateButton = true;
        } else {
            const releaser = this.DebugMode ? this.SetCellBreakpoint(condition) : null;
            this.breakpoints[existIdx] = { ...condition, releaser };
        }
    }

    private OnCellBreakpointDelete(): void {
        const existIdx = this.breakpoints
            .findIndex(brk => brk.Location.x === this.codeEditor.EditableCell.x && brk.Location.y === this.codeEditor.EditableCell.y);

        if (existIdx !== -1) {
            const brkRemove = this.breakpoints[existIdx];

            if (brkRemove.releaser !== null) {
                brkRemove.releaser();
            }

            this.breakpoints.splice(existIdx, 1);

            this.codeEditor.Select(brkRemove.Location.x, brkRemove.Location.y, [0.21568627450980393, 0.2784313725490196, 0.30980392156862746]);

            this.overlay.DebugControls.DeactivateButton = false;
        }
    }

    private RestoreCellBreakpointsSelection(): void {
        for (const brk of this.befungeToolbox.Debugger.PCBreakpoints) {
            this.codeEditor.Select(brk.Location.x, brk.Location.y, this.inactiveBreakpointColor);
        }
    }

    private OnMemoryWrite(ptr: Pointer, value: number): void {
        const releaser = this.codeEditor.Tooltip(
            ptr.x,
            ptr.y,
            `${value.toString()}(${String.fromCharCode(value)})`,
            TooltipPosition.RightTop);

        this.memoryWritesTooltipsReleasers.push(releaser);
    }

    private HideMemoryWriteTooltips(): void {
        this.memoryWritesTooltipsReleasers.forEach(x => x());
    }
}

Inversify.bind(DebuggingService).toSelf().inSingletonScope();
