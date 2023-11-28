
import { mat4 } from 'gl-matrix';
import { inject, injectable } from 'inversify';

import { AppEventTransformer } from './AppEventTransformer';
import { AppSettings } from './AppSettings';
import { BefungeToolbox } from './BefungeToolbox';
import { CodeEditorService } from './CodeEditor/CodeEditorService';
import { DebugRenderer } from './DebugRenderer';
import { InjectionToken } from './InjectionToken';
import { PCDirectionCondition } from './Overlay/DebugControls';
import { OverlayService } from './Overlay/OverlayService';
import { SourceCodeMemory } from './SourceCodeMemory';

import { Inversify } from '@/Inversify';
import { BreakpointCondition, BreakpointReleaser, PcLocationCondition } from '@/lib/befunge/Debugger';
import { ArrayMemory } from '@/lib/befunge/memory/ArrayMemory';
import { MemoryLimit } from '@/lib/befunge/memory/MemoryLimit';
import { SourceCodeValidityAnalyser } from '@/lib/befunge/SourceCodeValidityAnalyser';
import { AsyncConstructable, AsyncConstructorActivator } from '@/lib/DI/AsyncConstructorActivator';
import { UserFileLoader } from '@/lib/DOM/UserFileLoader';
import { Intersection } from '@/lib/math/Intersection';
import { Rgb } from '@/lib/Primitives';
import { Camera } from '@/lib/renderer/Camera';


async function Delay(delay: number): Promise<void> {
    return new Promise(ok => setTimeout(ok, delay));
}

@injectable()
export class AppService extends AppEventTransformer implements AsyncConstructable {
    private isRunning = true;

    private projection!: mat4;
    private camera: mat4;

    private befungeToolbox: BefungeToolbox;
    private memoryLimit: MemoryLimit = { Width: 80, Height: 25 };

    private debugRenderer: DebugRenderer;
    private debugPoints: number[] = [5, 5, 0.2, 0, 0, 0];

    private debugMode = false;

    private cellBreakpoints: PcLocationCondition[] = [];

    private inactiveBreakpointColor: Rgb = [0.9764705882352941, 0.6588235294117647, 0.1450980392156863];

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) private gl: WebGL2RenderingContext,
        @inject(AppSettings) private settings: AppSettings,
        @inject(OverlayService) private overlay: OverlayService,
        @inject(CodeEditorService) private codeEditor: CodeEditorService,
        @inject(SourceCodeMemory) private editorSourceCode: SourceCodeMemory) {
        super();

        this.camera = mat4.translate(mat4.create(), mat4.create(), [50, 100, 300]);

        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        this.BuildProjection();

        this.codeEditor.ViewProjection = this.ViewProjection;

        this.editorSourceCode.Initialize(ArrayMemory, this.memoryLimit);

        this.befungeToolbox = new BefungeToolbox();

        this.debugRenderer = new DebugRenderer(gl);
        this.debugRenderer.ViewProjection = this.ViewProjection;
        this.debugRenderer.UploadAttributes(this.debugPoints);

        const Debug = async () => {
            const text = 'Hello world! 1234567890$@';

            for (let n = 0; n < text.length; ++n) {

                this.codeEditor.Symbol(text[n], n, 1);

                await Delay(10);
            }

            const startCode = ' '.charCodeAt(0);
            const endCode = '~'.charCodeAt(0);
            const startRow = 3;
            for (let n = 0; n < endCode - startCode; ++n) {
                this.codeEditor.Symbol(String.fromCharCode(n + startCode), n % 80, startRow + Math.floor(n / 80));

                await Delay(10);
            }

            let x = true;
            while (x) {
                for (let n = 0; n < 80; ++n) {
                    this.codeEditor.Select(n, 6, [0, 0, n / 80]);

                    await Delay(50);
                }

                /* for (let n = 79; n >= 0; --n) {
                    this.codeEditorRenderer.Unselect(n, 6);

                    await Delay(50);
                } */
                x = false;
            }
        }

        //Debug();
    }

    async AsyncConstructor(): Promise<void> {
        this.overlay.EditDirectionControls.EditDirectionObservable.Attach(dir => this.codeEditor.EditionDirection = dir);
        this.codeEditor.EditDirectionObservable.Attach(dir => this.overlay.EditDirectionControls.ForceEditDirection(dir));

        this.overlay.DebugControls.Execute.Attach(() => this.ExecuteCode());
        this.overlay.DebugControls.Debug.Attach(() => this.DebugCode());
        this.overlay.DebugControls.CellBreakopint.Attach((cond: PCDirectionCondition) => this.OnCellBreakpointAction(cond));
        this.overlay.DebugControls.CellBreakpointDelete.Attach(() => this.OnCellBreakpointDelete());

        this.overlay.FileControls.OpenFromDiskObservable.Attach(() => this.OpenFileFromDisk());

        this.Start();
    }

    Resize(): void {
        this.settings.ViewDimension = { Width: this.gl.canvas.width, Height: this.gl.canvas.height };

        this.BuildProjection();
        this.overlay.Resize();

        this.codeEditor.ViewProjection = this.ViewProjection;
        this.debugRenderer.ViewProjection = this.ViewProjection;
    }

    OnCameraMove(e: MouseEvent): void {
        const delta = Camera.UnprojectMovement(
            { x: e.movementX, y: e.movementY },
            { a: 0, b: 0, c: 1, d: 0 },
            this.ViewProjection,
            this.gl.canvas);

        this.camera = mat4.translate(
            mat4.create(),
            this.camera,
            [delta.x, delta.y, 0]);

        this.codeEditor.ViewProjection = this.ViewProjection;
        this.debugRenderer.ViewProjection = this.ViewProjection;
    }

    OnSelect(e: MouseEvent): void {
        if (!this.overlay.Touch(e)) {
            const oldEditionCell = { ...this.codeEditor.EditionCell };

            this.codeEditor.Touch(e);

            const hasBrk = this.cellBreakpoints
                .some(brk => brk.Location.x === this.codeEditor.EditionCell.x && brk.Location.y === this.codeEditor.EditionCell.y);

            this.overlay.DebugControls.DeactivateButton = hasBrk;

            if (oldEditionCell.x !== this.codeEditor.EditionCell.x || oldEditionCell.y !== this.codeEditor.EditionCell.y) {
                const hasPrevBrk = this.cellBreakpoints
                    .some(brk => brk.Location.x === oldEditionCell.x && brk.Location.y === oldEditionCell.y);

                if (hasPrevBrk) {
                    this.codeEditor.Select(oldEditionCell.x, oldEditionCell.y, this.inactiveBreakpointColor);
                }
            }
        }

        const posNear = Camera.Unproject({ x: e.offsetX, y: e.offsetY, z: 0 }, this.ViewProjection, this.gl.canvas);
        const posFar = Camera.Unproject({ x: e.offsetX, y: e.offsetY, z: 1 }, this.ViewProjection, this.gl.canvas);

        const intersection = Intersection.PlaneLine(
            { a: 0, b: 0, c: 1, d: 0 },
            { a: [posNear[0], posNear[1], posNear[2]], b: [posFar[0], posFar[1], posFar[2]] });

        this.debugPoints.push(posNear[0], posNear[1], posNear[2], intersection[0], intersection[1], intersection[2]);

        this.debugRenderer.UploadAttributes(this.debugPoints);
    }

    OnZoom(e: WheelEvent): void {
        const delta = e.deltaY * 0.5;
        const z = this.camera[14] + delta;

        if (z >= this.settings.ZFar || z <= this.settings.ZNear) {
            return;
        }

        this.camera = mat4.translate(
            mat4.create(),
            this.camera,
            [0, 0, delta]);

        this.codeEditor.ViewProjection = this.ViewProjection;
        this.debugRenderer.ViewProjection = this.ViewProjection;
    }

    OnCellInput(e: KeyboardEvent): void {
        this.codeEditor.CellInput(e);
    }

    private BuildProjection(): void {
        this.settings.AspectRatio = this.gl.canvas.width / this.gl.canvas.height;

        this.projection = mat4.perspective(
            mat4.create(),
            this.settings.Fovy,
            this.settings.AspectRatio,
            this.settings.ZNear,
            this.settings.ZFar);
    }

    private get ViewProjection(): mat4 {
        const view = mat4.invert(mat4.create(), this.camera);
        return mat4.mul(mat4.create(), this.projection, view);
    }

    public Dispose(): void {
        this.isRunning = false;
    }

    private Start(): void {
        this.overlay.OutputControls.Output = 'HelloWOrld \nTerminated due timeout\n1'
        requestAnimationFrame(() => this.DrawFrame())
    }

    private DrawFrame(): void {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        this.codeEditor.Draw();
        //this.debugRenderer.Draw();

        this.gl.clear(this.gl.DEPTH_BUFFER_BIT);

        this.overlay.Draw();

        if (this.isRunning) {
            requestAnimationFrame(() => this.DrawFrame())
        }
    }

    private ExecuteCode(): void {
        this.befungeToolbox.Reset(this.memoryLimit, this.editorSourceCode.Clone());

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

    private DebugCode(): void {
        const activeBreakpointColor: Rgb = [0.8980392156862745, 0.2235294117647059, 0.20784313725490197];

        if (!this.debugMode) {
            this.befungeToolbox.Reset(this.memoryLimit, this.editorSourceCode.Clone());

            this.UploadBreakpointsToDebugger();

            this.debugMode = true;
            this.overlay.DebugControls.DebugMode = true;

            this.overlay.OutputControls.Output = '';
        }

        const debug = this.befungeToolbox.Debugger;
        const interpreter = this.befungeToolbox.Interpreter;


        const executionResult = debug.RunFor(this.settings.ExecutionTimeout);

        let breakpoints: BreakpointCondition[] = [];

        if (executionResult === null) {
            if (!debug.IsHalted) {
                this.overlay.Snackbar.ShowWarning('Terminated due timeout');
            }

            this.debugMode = false;
            this.overlay.DebugControls.DebugMode = false;
        } else {
            breakpoints = executionResult;
        }

        if (breakpoints.length > 0) {
            console.log(breakpoints);

            // TODO Restore only previous one
            this.RestoreCellBreakpointsSelection();

            for (const brk of breakpoints) {
                if (brk.PC) {

                    this.codeEditor.Select(brk.PC.Location.x, brk.PC.Location.y, activeBreakpointColor);
                }
            }

            this.overlay.OutputControls.Output += interpreter.CollectOutputUntil(this.settings.MaxOutputLength);
        }


        if (debug.IsHalted) {
            this.debugMode = false;
            this.overlay.DebugControls.DebugMode = false;

            this.overlay.OutputControls.Output += interpreter.CollectOutputUntil(this.settings.MaxOutputLength);

            this.RestoreCellBreakpointsSelection();
        }
    }

    private UploadBreakpointsToDebugger(): void {
        this.cellBreakpoints.forEach(brk => this.SetCellBreakpoint(brk));
    }

    private SetCellBreakpoint(brk: PcLocationCondition): BreakpointReleaser {
        const releaser = this.befungeToolbox.Debugger.SetBreakpoint({ PC: brk });

        this.codeEditor.Select(brk.Location.x, brk.Location.y, this.inactiveBreakpointColor);

        return () => {
            releaser();
            this.codeEditor.Unselect(brk.Location.x, brk.Location.y);
        };
    }

    private RestoreCellBreakpointsSelection(): void {
        for (const brk of this.befungeToolbox.Debugger.PCBreakpoints) {
            this.codeEditor.Select(brk.Location.x, brk.Location.y, this.inactiveBreakpointColor);
        }
    }

    private async OpenFileFromDisk(): Promise<void> {
        const sourceCode = await UserFileLoader.ReadAsText();

        const validator = new SourceCodeValidityAnalyser(sourceCode);

        const firstProblem = validator.NextIllegalInstruction();

        if (firstProblem !== null) {
            let remainingProblems = 0;

            for (; validator.NextIllegalInstruction(); ++remainingProblems);

            let problemMsg = `File contains illegal symbol '${firstProblem.value}' at ${firstProblem.offset}`;

            if (remainingProblems > 0) {
                problemMsg += ` and ${remainingProblems} more`;
            }

            this.overlay.Snackbar
                .ShowError(problemMsg);

            return;
        }

        this.LoadSourceCodeToEditor(sourceCode);
    }

    private LoadSourceCodeToEditor(sourceCode: string): void {
        this.ResetSourceCodeEditor();

        const linesOfCode = sourceCode.split(/\r?\n/);

        for (let row = 0; row < linesOfCode.length; ++row) {
            const line = linesOfCode[row];
            for (let column = 0; column < line.length; ++column) {
                const symbol = line[column];

                this.editorSourceCode.Write({ x: column, y: row }, symbol.charCodeAt(0));
                this.codeEditor.Symbol(symbol, column, row);
            }
        }
    }

    private ResetSourceCodeEditor(): void {
        this.editorSourceCode.Initialize(ArrayMemory, this.memoryLimit);
        this.codeEditor.Clear();
    }

    private OnCellBreakpointAction(cond: PCDirectionCondition): void {
        const existIdx = this.cellBreakpoints
            .findIndex(brk => brk.Location.x === this.codeEditor.EditionCell.x && brk.Location.y === this.codeEditor.EditionCell.y);

        const condition: PcLocationCondition = {
            Location: { ...this.codeEditor.EditionCell },
            ...cond
        };

        if (existIdx === -1) {
            this.cellBreakpoints.push(condition);

            this.codeEditor.Select(condition.Location.x, condition.Location.y, this.inactiveBreakpointColor);
        } else {
            this.cellBreakpoints[existIdx] = condition;
        }
    }

    private OnCellBreakpointDelete(): void {
        const existIdx = this.cellBreakpoints
            .findIndex(brk => brk.Location.x === this.codeEditor.EditionCell.x && brk.Location.y === this.codeEditor.EditionCell.y);

        if (existIdx !== -1) {
            this.cellBreakpoints.splice(existIdx, 1);
        }
    }
}

Inversify.bind(AppService).toSelf().inSingletonScope().onActivation(AsyncConstructorActivator);
