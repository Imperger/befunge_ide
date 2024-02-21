
import { mat4, vec2, vec3 } from 'gl-matrix';
import { inject, injectable, named } from 'inversify';

import { AppEventTransformer } from './AppEventTransformer';
import { AppSettings } from './AppSettings';
import { CodeEditorService } from './CodeEditor/CodeEditorService';
import { CodeEditorServiceInputReceiverFactory } from './CodeEditorServiceInputReceiver';
import { CodeExecutionService } from './CodeExecution/CodeExecutionService';
import { DebugRenderer } from './DebugRenderer';
import { SmoothCameraMove } from './Effects/SmoothCameraMove';
import { SmoothCameraZoom } from './Effects/SmoothCameraZoom';
import { AppHistory } from './History/AppHistory';
import { InjectionToken, UILabelRendererTargetName } from './InjectionToken';
import { OverlayService } from './Overlay/OverlayService';
import { SnackbarControls } from './Overlay/SnackbarControls';
import { SourceCodeMemory } from './SourceCodeMemory';

import { Inversify } from '@/Inversify';
import { BefungeSourceCodeCodec } from '@/lib/befunge/BefungeSourceCodeCodec';
import { ArrayMemory } from '@/lib/befunge/memory/ArrayMemory';
import { SourceCodeValidityAnalyser } from '@/lib/befunge/SourceCodeValidityAnalyser';
import { AsyncConstructable, AsyncConstructorActivator } from '@/lib/DI/AsyncConstructorActivator';
import { EffectRunner, RegistrationCollisionResolver } from '@/lib/effect/EffectRunner';
import { Intersection } from '@/lib/math/Intersection';
import { Transformation } from '@/lib/math/Transformation';
import { ObserverDetacher } from '@/lib/Observable';
import { Vec2 } from '@/lib/Primitives';
import { Camera } from '@/lib/renderer/Camera';
import { InputReceiver, IsInputReceiver } from '@/lib/UI/InputReceiver';
import { UILabelRenderer } from '@/lib/UI/UILabel/UILabelRenderer';
import './History/Commands';
import router from '@/router';


async function Delay(delay: number): Promise<void> {
    return new Promise(ok => setTimeout(ok, delay));
}

@injectable()
export class AppService extends AppEventTransformer implements AsyncConstructable {
    private isRunning = true;

    private projection!: mat4;
    private camera: mat4;

    private inFocusOnVanishReleaser: ObserverDetacher;
    private inFocus: InputReceiver;

    private debugRenderer: DebugRenderer;
    private debugPoints: number[] = [5, 5, 0.2, 0, 0, 0];

    private openedFilename: string | null = null;

    private lastFrameTime = Date.now();

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) private gl: WebGL2RenderingContext,
        @inject(AppSettings) private settings: AppSettings,
        @inject(EffectRunner) private effectRunner: EffectRunner,
        @inject(OverlayService) private overlay: OverlayService,
        @inject(CodeEditorService) private codeEditor: CodeEditorService,
        @inject(SourceCodeMemory) private editorSourceCode: SourceCodeMemory,
        @inject(AppHistory) private history: AppHistory,
        @inject(CodeExecutionService) private codeExecutionService: CodeExecutionService,
        @inject(UILabelRenderer) @named(UILabelRendererTargetName.Perspective) private perspectiveLabelRenderer: UILabelRenderer,
        @inject(InjectionToken.CodeEditorServiceInputReceiverFactory) private codeEditorServiceInputReceiverFactory: CodeEditorServiceInputReceiverFactory) {
        super();

        this.camera = mat4.translate(
            mat4.create(),
            mat4.create(),
            [0, 0, this.settings.ZCameraBoundary.min + (this.settings.ZCameraBoundary.max - this.settings.ZCameraBoundary.min) * 0.75]);

        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        this.BuildProjection();
        this.FocusCameraAtEditor();

        this.codeEditor.ViewProjection = this.ViewProjection;

        this.editorSourceCode.Initialize(ArrayMemory, this.settings.MemoryLimit);

        this.inFocus = this.codeEditorServiceInputReceiverFactory();
        this.inFocus.Focus();
        this.inFocusOnVanishReleaser = this.inFocus.OnVanish.Attach(() => 0);

        this.debugRenderer = new DebugRenderer(gl);
        this.debugRenderer.ViewProjection = this.ViewProjection;
        this.debugRenderer.UploadAttributes(this.debugPoints);

        const label = this.perspectiveLabelRenderer.Create({ x: 0, y: 0 }, 499, 'TESTING (d) \n 1234567890', 8, null);
        label.Scale = 0.2;
        const Debug = async () => {
            const text = 'Hello world! 1234567890$@';

            for (let n = 0; n < text.length; ++n) {

                this.codeEditor.EditCell(text[n], n, 1);

                await Delay(10);
            }

            const startCode = ' '.charCodeAt(0);
            const endCode = '~'.charCodeAt(0);
            const startRow = 3;
            for (let n = 0; n < endCode - startCode; ++n) {
                this.codeEditor.EditCell(String.fromCharCode(n + startCode), n % 80, startRow + Math.floor(n / 80));

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
        this.overlay.EditDirectionControls.EditDirectionObservable.Attach(dir => this.codeEditor.EditableCellDirection = dir);
        this.codeEditor.EditDirectionObservable.Attach(dir => this.overlay.EditDirectionControls.ForceEditDirection(dir));
        this.codeEditor.EditableCellLostObservable.Attach(() => this.FollowEditableCell());

        this.overlay.FileControls.OpenFromDiskObservable.Attach(() => this.OpenFileFromDisk());
        this.overlay.FileControls.SaveToDiskObservable.Attach(() => this.SaveSourceToDisk());
        this.overlay.FileControls.ShareObservable.Attach(() => this.ShareSourceCode());
        this.overlay.FileControls.OpenSettingsObservable.Attach(() => this.OpenSettings());

        this.overlay.HistoryControls.UndoObservable.Attach(() => this.history.Undo());
        this.overlay.HistoryControls.RedoObservable.Attach(() => this.history.Redo());

        this.history.UpdateObservable.Attach(() => this.OnSourceCodeChanged());
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

        mat4.translate(
            this.camera,
            this.camera,
            [delta.x, delta.y, 0]);

        this.codeEditor.ViewProjection = this.ViewProjection;
        this.debugRenderer.ViewProjection = this.ViewProjection;
        this.perspectiveLabelRenderer.ViewProjection = this.ViewProjection;
    }

    OnSelect(e: MouseEvent): void {
        const touchResult = this.overlay.Touch(e);

        if (touchResult === false) {
            this.SwitchFocus(this.codeEditorServiceInputReceiverFactory());
            const prevEditableCell = { ...this.codeEditor.EditableCell };

            this.codeEditor.Touch(e);

            this.codeExecutionService.Debugging.OnSelect(prevEditableCell);
        } else if (IsInputReceiver(touchResult)) {
            this.SwitchFocus(touchResult);
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
        const smoothCameraZoomEffect = new SmoothCameraZoom(
            e.deltaY < 0 ? 'in' : 'out',
            this.camera,
            this.settings.ZCameraBoundary);

        this.effectRunner.Register(
            smoothCameraZoomEffect,
            { id: 'camera_zoom', rule: RegistrationCollisionResolver.Replace });
    }

    OnKeyDown(e: KeyboardEvent): void {
        this.inFocus.OnInput(e);
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
        requestAnimationFrame(() => this.DrawFrame(Date.now() - this.lastFrameTime));
    }

    private DrawFrame(elapsed: number): void {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT);

        if (this.effectRunner.Draw(elapsed)) {
            this.codeEditor.ViewProjection = this.ViewProjection;
            this.debugRenderer.ViewProjection = this.ViewProjection;
            this.perspectiveLabelRenderer.ViewProjection = this.ViewProjection;
        }

        this.codeEditor.Draw();
        this.perspectiveLabelRenderer.Draw();
        //this.debugRenderer.Draw();

        this.gl.clear(this.gl.DEPTH_BUFFER_BIT);

        this.overlay.Draw();

        if (this.isRunning) {
            const now = Date.now();
            const elapsed = now - this.lastFrameTime;
            requestAnimationFrame(() => this.DrawFrame(elapsed))
            this.lastFrameTime = now;
        }
    }

    private async OpenFileFromDisk(): Promise<void> {
        let sourceCode = '';

        try {
            const [fileHandle] = await window.showOpenFilePicker({ multiple: false });

            if (fileHandle.kind !== "file") {
                return;
            }
            this.openedFilename = fileHandle.name;
            const file = await fileHandle.getFile();

            sourceCode = await file.text();
        } catch (e) {
            if (e instanceof DOMException) {
                switch (e.name) {
                    case 'AbortError':
                        return;
                }

                this.overlay.Snackbar.ShowError(e.message)
            }
        }


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

        this.history.Reset();
        router.replace({ name: 'CodeEditor' });

        this.FocusCameraAtEditor();
    }

    private async SaveSourceToDisk(): Promise<void> {
        try {
            const fileHandle = await window.showSaveFilePicker({ suggestedName: this.openedFilename ?? '' });

            const stream = await fileHandle.createWritable();

            await stream.write(this.SourceCodeString());

            await stream.close();
        } catch (e) {
            if (e instanceof DOMException) {
                switch (e.name) {
                    case 'AbortError':
                        return;
                }

                this.overlay.Snackbar.ShowError(e.message)
            }
        }
    }

    private SourceCodeString(): string {
        let sourceString = '';
        for (let y = 0; y < this.settings.MemoryLimit.Height; ++y) {
            let line = '';

            for (let x = 0; x < this.settings.MemoryLimit.Width; ++x) {
                line += String.fromCharCode(this.editorSourceCode.Read({ x, y }));
            }

            sourceString += line.trimEnd() + '\n';
        }

        return sourceString;
    }

    private ShareSourceCode(): void {
        const encoded = BefungeSourceCodeCodec.Encode(this.SourceCodeString());

        router.replace({ name: 'Share', params: { encoded } });
    }

    private OpenSettings(): void {
        console.log('Open settings');
    }

    LoadSourceCodeToEditor(sourceCode: string): void {
        this.ResetSourceCodeEditor();

        const linesOfCode = sourceCode.split(/\r?\n/);

        for (let row = 0; row < linesOfCode.length; ++row) {
            const line = linesOfCode[row];
            for (let column = 0; column < line.length; ++column) {
                this.codeEditor.EditCell(line[column], column, row);
            }
        }

        this.overlay.FileControls.ShareDisabled = this.editorSourceCode.Empty;
    }

    private OnSourceCodeChanged(): void {
        this.overlay.FileControls.ShareDisabled = this.editorSourceCode.Empty;
    }

    get Snackbar(): SnackbarControls {
        return this.overlay.Snackbar;
    }

    private FollowEditableCell(): void {
        const cellRect = this.codeEditor.EditableCellRect;
        const lbNDC = vec3.transformMat4(vec3.create(), cellRect.lb, this.ViewProjection);
        const rtNDC = vec3.transformMat4(vec3.create(), cellRect.rt, this.ViewProjection);

        const ndcDiagonal = vec3.sub(vec3.create(), rtNDC, lbNDC);
        const ndcStickToEdgeMovement = Transformation.MoveRectangleToPlaceInsideRectangle(
            { lb: { x: lbNDC[0], y: lbNDC[1] }, rt: { x: rtNDC[0], y: rtNDC[1] } },
            { lb: { x: -1, y: -1 }, rt: { x: 1, y: 1 } });

        const finalMovement = vec2.fromValues(ndcStickToEdgeMovement.x, ndcStickToEdgeMovement.y);

        if (ndcStickToEdgeMovement.x > 0) {
            const ndcDistanceToLeft = ndcDiagonal[0] * this.codeEditor.EditableCell.x;
            finalMovement[0] += Math.min(ndcDistanceToLeft, 1);
        } else if (ndcStickToEdgeMovement.x < 0) {
            const ndcDistanceToRight = ndcDiagonal[0] * (this.settings.MemoryLimit.Width - this.codeEditor.EditableCell.x - 1);
            finalMovement[0] -= Math.min(ndcDistanceToRight, 1);
        }

        if (ndcStickToEdgeMovement.y > 0) {
            const ndcDistanceToBottom = ndcDiagonal[1] * (this.settings.MemoryLimit.Height - this.codeEditor.EditableCell.y - 1);
            finalMovement[1] += Math.min(ndcDistanceToBottom, 1);
        } else if (ndcStickToEdgeMovement.y < 0) {
            const ndcDistanceToTop = ndcDiagonal[1] * this.codeEditor.EditableCell.y;
            finalMovement[1] -= Math.min(ndcDistanceToTop, 1);
        }


        const movement: vec2 = [
            finalMovement[0] * this.gl.canvas.width / 2,
            finalMovement[1] * this.gl.canvas.height / 2
        ];

        const effect = new SmoothCameraMove(
            this.camera,
            movement,
            this.gl.canvas,
            () => this.ViewProjection);

        this.effectRunner.Register(
            effect,
            { id: 'follow_editable_cell', rule: RegistrationCollisionResolver.Replace });
    }

    private ResetSourceCodeEditor(): void {
        this.editorSourceCode.Initialize(ArrayMemory, this.settings.MemoryLimit);
        this.codeEditor.Clear();
    }

    private SwitchFocus(component: InputReceiver): void {
        this.inFocus.Blur();
        this.inFocusOnVanishReleaser();

        this.inFocus = component;
        this.inFocus.Focus();
        this.inFocus.OnVanish.Attach(() => this.SwitchFocus(this.codeEditorServiceInputReceiverFactory()));
    }

    private FocusCameraAtEditor(): void {
        const uiLeftTopEditorGridPosition = this.overlay.EditDirectionControls.Boundaries.rt;
        const margin = 10;
        const wndLeftTopEditorGridPosition: Vec2 = {
            x: uiLeftTopEditorGridPosition.x + margin,
            y: this.settings.ViewDimension.Height - uiLeftTopEditorGridPosition.y
        };

        const posNear = Camera.Unproject({ ...wndLeftTopEditorGridPosition, z: 0 }, this.ViewProjection, this.gl.canvas);
        const posFar = Camera.Unproject({ ...wndLeftTopEditorGridPosition, z: 1 }, this.ViewProjection, this.gl.canvas);

        const intersection = Intersection.PlaneLine(
            { a: 0, b: 0, c: 1, d: 0 },
            { a: [posNear[0], posNear[1], posNear[2]], b: [posFar[0], posFar[1], posFar[2]] });

        intersection[1] -= this.settings.MemoryLimit.Height * this.codeEditor.CellSize;

        mat4.translate(
            this.camera,
            mat4.create(),
            [this.camera[12] - intersection[0], this.camera[13] - intersection[1], this.camera[14]]);

        this.codeEditor.ViewProjection = this.ViewProjection;
        this.perspectiveLabelRenderer.ViewProjection = this.ViewProjection;
    }
}

Inversify.bind(AppService).toSelf().inSingletonScope().onActivation(AsyncConstructorActivator);
