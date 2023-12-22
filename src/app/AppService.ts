
import { mat4 } from 'gl-matrix';
import { inject, injectable, named } from 'inversify';

import { AppEventTransformer } from './AppEventTransformer';
import { AppSettings } from './AppSettings';
import { CodeEditorService } from './CodeEditor/CodeEditorService';
import { CodeExecutionService } from './CodeExecution/CodeExecutionService';
import { DebugRenderer } from './DebugRenderer';
import { InjectionToken, UILabelRendererTargetName } from './InjectionToken';
import { OverlayService } from './Overlay/OverlayService';
import { SourceCodeMemory } from './SourceCodeMemory';

import { Inversify } from '@/Inversify';
import { ArrayMemory } from '@/lib/befunge/memory/ArrayMemory';
import { SourceCodeValidityAnalyser } from '@/lib/befunge/SourceCodeValidityAnalyser';
import { AsyncConstructable, AsyncConstructorActivator } from '@/lib/DI/AsyncConstructorActivator';
import { UserFileLoader } from '@/lib/DOM/UserFileLoader';
import { Intersection } from '@/lib/math/Intersection';
import { Camera } from '@/lib/renderer/Camera';
import { UILabelRenderer } from '@/lib/UI/UILabel/UILabelRenderer';


async function Delay(delay: number): Promise<void> {
    return new Promise(ok => setTimeout(ok, delay));
}

@injectable()
export class AppService extends AppEventTransformer implements AsyncConstructable {
    private isRunning = true;

    private projection!: mat4;
    private camera: mat4;

    private debugRenderer: DebugRenderer;
    private debugPoints: number[] = [5, 5, 0.2, 0, 0, 0];

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) private gl: WebGL2RenderingContext,
        @inject(AppSettings) private settings: AppSettings,
        @inject(OverlayService) private overlay: OverlayService,
        @inject(CodeEditorService) private codeEditor: CodeEditorService,
        @inject(SourceCodeMemory) private editorSourceCode: SourceCodeMemory,
        @inject(CodeExecutionService) private codeExecutionService: CodeExecutionService,
        @inject(UILabelRenderer) @named(UILabelRendererTargetName.Perspective) private perspectiveLabelRenderer: UILabelRenderer) {
        super();

        this.camera = mat4.translate(mat4.create(), mat4.create(), [50, 100, 300]);

        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        this.BuildProjection();

        this.codeEditor.ViewProjection = this.ViewProjection;

        this.editorSourceCode.Initialize(ArrayMemory, this.settings.MemoryLimit);

        this.debugRenderer = new DebugRenderer(gl);
        this.debugRenderer.ViewProjection = this.ViewProjection;
        this.debugRenderer.UploadAttributes(this.debugPoints);

        const label = this.perspectiveLabelRenderer.Create({ x: 0, y: 0 }, 499, 'TESTING (d) 1234567890', 8, null);
        label.Scale = 0.2;
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

        this.overlay.FileControls.OpenFromDiskObservable.Attach(() => this.OpenFileFromDisk());

        this.Start();
    }

    Resize(): void {
        this.settings.ViewDimension = { Width: this.gl.canvas.width, Height: this.gl.canvas.height };

        this.BuildProjection();
        this.overlay.Resize();

        this.codeEditor.ViewProjection = this.ViewProjection;
        this.debugRenderer.ViewProjection = this.ViewProjection;
        this.perspectiveLabelRenderer.ViewProjection = this.ViewProjection;
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
        this.perspectiveLabelRenderer.ViewProjection = this.ViewProjection;
    }

    OnSelect(e: MouseEvent): void {
        if (!this.overlay.Touch(e)) {
            const prevEditionCell = { ...this.codeEditor.EditionCell };

            this.codeEditor.Touch(e);

            this.codeExecutionService.Debugging.OnSelect(prevEditionCell);
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
        this.perspectiveLabelRenderer.ViewProjection = this.ViewProjection;
    }

    OnCellInput(e: KeyboardEvent): void {
        if (this.overlay.DebugControls.DebugMode) {
            this.overlay.Snackbar.ShowInformation('Editing is disabled during the debugging');
        } else {
            const prevEditionCell = { ...this.codeEditor.EditionCell };

            this.codeEditor.CellInput(e);

            this.codeExecutionService.Debugging.OnCellInput(prevEditionCell);
        }
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
        requestAnimationFrame(() => this.DrawFrame())
    }

    private DrawFrame(): void {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT);

        this.codeEditor.Draw();
        this.perspectiveLabelRenderer.Draw();
        //this.debugRenderer.Draw();

        this.gl.clear(this.gl.DEPTH_BUFFER_BIT);

        this.overlay.Draw();

        if (this.isRunning) {
            requestAnimationFrame(() => this.DrawFrame())
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
        this.editorSourceCode.Initialize(ArrayMemory, this.settings.MemoryLimit);
        this.codeEditor.Clear();
    }
}

Inversify.bind(AppService).toSelf().inSingletonScope().onActivation(AsyncConstructorActivator);
