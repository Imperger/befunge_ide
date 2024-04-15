import { vec2, vec3 } from 'gl-matrix';
import { inject, injectable, named } from 'inversify';

import { AppEventTransformer, MouseMovementEvent, MouseSelectEvent } from './AppEventTransformer';
import { AppSettings } from './AppSettings';
import { AppSettingsCodec, ShareableAppSettings } from './AppSettingsCodec';
import { CameraService } from './CameraService';
import { CodeEditorService } from './CodeEditor/CodeEditorService';
import { CodeEditorServiceInputReceiverFactory } from './CodeEditorServiceInputReceiver';
import { CodeExecutionService } from './CodeExecution/CodeExecutionService';
import { DebugRenderer } from './DebugRenderer';
import { SmoothCameraMove } from './Effects/SmoothCameraMove';
import { SmoothCameraZoom } from './Effects/SmoothCameraZoom';
import { AppHistory } from './History/AppHistory';
import { InjectionToken, UILabelRendererTargetName } from './InjectionToken';
import { HeatmapToggleButtonState } from './Overlay/DebugControls';
import { OverlayService } from './Overlay/OverlayService';
import { SnackbarControls } from './Overlay/SnackbarControls';
import { SourceCodeMemory } from './SourceCodeMemory';

import { Inversify } from '@/Inversify';
import { BefungeSourceCodeCodec } from '@/lib/befunge/BefungeSourceCodeCodec';
import { ArrayMemory } from '@/lib/befunge/memory/ArrayMemory';
import { SourceCodeValidityAnalyser } from '@/lib/befunge/SourceCodeValidityAnalyser';
import { AsyncConstructable, AsyncConstructorActivator } from '@/lib/DI/AsyncConstructorActivator';
import { AbortOperationException, FileStorage } from '@/lib/DOM/FileStorage/FileStorage';
import { EffectRunner, RegistrationCollisionResolver } from '@/lib/effect/EffectRunner';
import { Intersection } from '@/lib/math/Intersection';
import { MathUtil } from '@/lib/math/MathUtil';
import { Transformation } from '@/lib/math/Transformation';
import { ObserverDetacher } from '@/lib/Observable';
import { Vec2 } from '@/lib/Primitives';
import { Camera } from '@/lib/renderer/Camera';
import { InputReceiver, IsInputReceiver, MyInputEvent } from '@/lib/UI/InputReceiver';
import { UILabelRenderer } from '@/lib/UI/UILabel/UILabelRenderer';
import './History/Commands';
import router from '@/router';


async function Delay(delay: number): Promise<void> {
    return new Promise(ok => setTimeout(ok, delay));
}

@injectable()
export class AppService extends AppEventTransformer implements AsyncConstructable {
    private isRunning = true;

    private touchZoomStartZ = 0;

    private inFocusOnVanishReleaser: ObserverDetacher;
    private inFocus: InputReceiver;

    private debugRenderer: DebugRenderer;
    private debugPoints: number[] = [5, 5, 0.2, 0, 0, 0];

    private lastFrameTime = Date.now();

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) private gl: WebGL2RenderingContext,
        @inject(InjectionToken.FileStorage) private fileStorage: FileStorage,
        @inject(CameraService) private camera: CameraService,
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

        this.camera.MoveTo(
            {
                x: 0,
                y: 0,
                z: this.settings.ZCameraBoundary.min + (this.settings.ZCameraBoundary.max - this.settings.ZCameraBoundary.min) * 0.75
            });

        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);


        this.codeEditor.ViewProjection = this.camera.ViewProjection;
        this.FocusCameraAtEditor();

        this.editorSourceCode.Initialize(ArrayMemory, this.settings.MemoryLimit);

        this.inFocus = this.codeEditorServiceInputReceiverFactory();
        this.inFocus.Focus();
        this.inFocusOnVanishReleaser = this.inFocus.OnVanish.Attach(() => 0);

        this.debugRenderer = new DebugRenderer(gl);
        this.debugRenderer.ViewProjection = this.camera.ViewProjection;
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
        this.overlay.FileControls.ShowHelpObservable.Attach(() => this.overlay.LanguageSyntaxHelpControls.ToggleHelp());

        this.overlay.HistoryControls.UndoObservable.Attach(() => this.history.Undo());
        this.overlay.HistoryControls.RedoObservable.Attach(() => this.history.Redo());

        this.overlay.DebugControls.Heatmap.Attach(feedback => this.ControlsResponseToHeatmapActivation(feedback));

        this.history.UpdateObservable.Attach(() => this.OnSourceCodeChanged());

        this.overlay.VirtualKeyboardControls.Observable.Attach((key: string) => this.inFocus.OnInput({ key }));

        this.Start();
    }

    Resize(): void {
        this.settings.ViewDimension = { Width: this.gl.canvas.width, Height: this.gl.canvas.height };
        this.settings.AspectRatio = this.gl.canvas.width / this.gl.canvas.height;

        this.camera.Resize();

        this.overlay.Resize();

        this.codeEditor.ViewProjection = this.camera.ViewProjection;
        this.debugRenderer.ViewProjection = this.camera.ViewProjection;
        this.perspectiveLabelRenderer.ViewProjection = this.camera.ViewProjection;
    }

    OnPan(e: MouseMovementEvent): void {
        if (!this.overlay.Scroll({
            startX: e.startX,
            startY: e.startY,
            scroll: -e.movementY / window.devicePixelRatio,
            units: 'px'
        })) {
            const delta = Camera.UnprojectMovement(
                { x: e.movementX, y: e.movementY },
                { a: 0, b: 0, c: 1, d: 0 },
                this.camera.ViewProjection,
                this.gl.canvas);

            this.camera.Translate({ x: delta.x, y: delta.y });

            this.codeEditor.ViewProjection = this.camera.ViewProjection;
            this.debugRenderer.ViewProjection = this.camera.ViewProjection;
            this.perspectiveLabelRenderer.ViewProjection = this.camera.ViewProjection;
        }
    }

    OnSelect(e: MouseSelectEvent): void {
        const touchResult = this.overlay.Touch(e);

        if (touchResult === false) {
            this.SwitchFocus(this.codeEditorServiceInputReceiverFactory());
            const prevEditableCell = { ...this.codeEditor.EditableCell };

            this.codeEditor.Touch(e);

            this.codeExecutionService.Debugging.OnSelect(prevEditableCell);
        } else if (IsInputReceiver(touchResult)) {
            this.SwitchFocus(touchResult);
        }

        const posNear = Camera.Unproject({ x: e.offsetX, y: e.offsetY, z: 0 }, this.camera.ViewProjection, this.gl.canvas);
        const posFar = Camera.Unproject({ x: e.offsetX, y: e.offsetY, z: 1 }, this.camera.ViewProjection, this.gl.canvas);

        const intersection = Intersection.PlaneLine(
            { a: 0, b: 0, c: 1, d: 0 },
            { a: [posNear[0], posNear[1], posNear[2]], b: [posFar[0], posFar[1], posFar[2]] });

        this.debugPoints.push(posNear[0], posNear[1], posNear[2], intersection[0], intersection[1], intersection[2]);

        this.debugRenderer.UploadAttributes(this.debugPoints);
    }

    OnWheel(e: WheelEvent): void {
        if (!this.overlay.Scroll({
            startX: e.offsetX,
            startY: e.offsetY,
            scroll: Math.sign(e.deltaY),
            units: 'row'
        })) {
            const smoothCameraZoomEffect = new SmoothCameraZoom(
                e.deltaY < 0 ? 'in' : 'out',
                this.camera,
                this.settings.ZCameraBoundary);

            this.effectRunner.Register(
                smoothCameraZoomEffect,
                { id: 'camera_zoom', rule: RegistrationCollisionResolver.Replace });
        }
    }

    OnTouchZoomStart(): void {
        this.touchZoomStartZ = this.camera.Position.z;
    }

    OnTouchZoom(zoom: number): void {
        this.camera.MoveTo({
            z: MathUtil.Clamp(this.touchZoomStartZ * zoom, this.settings.ZCameraBoundary.min, this.settings.ZCameraBoundary.max)
        });

        this.codeEditor.ViewProjection = this.camera.ViewProjection;
        this.debugRenderer.ViewProjection = this.camera.ViewProjection;
        this.perspectiveLabelRenderer.ViewProjection = this.camera.ViewProjection;
    }

    OnKeyDown(e: MyInputEvent): void {
        this.inFocus.OnInput(e);
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
            this.codeEditor.ViewProjection = this.camera.ViewProjection;
            this.debugRenderer.ViewProjection = this.camera.ViewProjection;
            this.perspectiveLabelRenderer.ViewProjection = this.camera.ViewProjection;
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
            sourceCode = await this.fileStorage.Open();
        } catch (e) {
            if (e instanceof AbortOperationException) {
                return;
            } else if (e instanceof Error) {
                this.overlay.Snackbar.ShowError(e.message);
            }

            return;
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
            await this.fileStorage.Save(this.SourceCodeString());
        } catch (e) {
            if (e instanceof AbortOperationException) {
                return;
            } else if (e instanceof Error) {
                this.overlay.Snackbar.ShowError(e.message)
            }

            return;
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
        const source_code = BefungeSourceCodeCodec.Encode(this.SourceCodeString());

        const shareableSettings = this.ShareableSettings();
        const settings = shareableSettings ? AppSettingsCodec.Encode(shareableSettings) : '';

        router.replace({ name: 'Share', params: { source_code, settings } });
    }

    private ShareableSettings(): ShareableAppSettings | null {
        const settings: ShareableAppSettings = {};

        if (this.overlay.DebugControls.IsHeatmapShown) {
            settings.heatmap = true;
        }

        if (this.overlay.IOControls.Input.length > 0) {
            settings.input = this.overlay.IOControls.Input;
        }

        return Object.keys(settings).length > 0 ? settings : null;
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

    LoadSettings(settings: ShareableAppSettings): void {
        if (settings.input !== undefined) {
            this.overlay.IOControls.Input = settings.input;
        }

        if (settings.heatmap !== undefined) {
            this.overlay.DebugControls.ClickOnHeatmap();
        }
    }

    private OnSourceCodeChanged(): void {
        this.overlay.FileControls.ShareDisabled = this.editorSourceCode.Empty;
    }

    get Snackbar(): SnackbarControls {
        return this.overlay.Snackbar;
    }

    private FollowEditableCell(): void {
        const cellRect = this.codeEditor.EditableCellRect;
        const lbNDC = vec3.transformMat4(vec3.create(), cellRect.lb, this.camera.ViewProjection);
        const rtNDC = vec3.transformMat4(vec3.create(), cellRect.rt, this.camera.ViewProjection);

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
            this.gl.canvas);

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

    private ControlsResponseToHeatmapActivation(feedback: HeatmapToggleButtonState): void {
        this.overlay.FileControls.OpenFromDiskDisabled = feedback.isShown;

        feedback.isShown ?
            this.overlay.HistoryControls.Lock() :
            this.overlay.HistoryControls.Unlock();

        this.overlay.EditControls.Disable = feedback.isShown;
    }

    private FocusCameraAtEditor(): void {
        const uiLeftTopEditorGridPosition = this.overlay.EditDirectionControls.Boundaries.rt;
        const margin = 10;
        const wndLeftTopEditorGridPosition: Vec2 = {
            x: uiLeftTopEditorGridPosition.x + margin,
            y: this.settings.ViewDimension.Height - uiLeftTopEditorGridPosition.y
        };

        const posNear = Camera.Unproject({ ...wndLeftTopEditorGridPosition, z: 0 }, this.camera.ViewProjection, this.gl.canvas);
        const posFar = Camera.Unproject({ ...wndLeftTopEditorGridPosition, z: 1 }, this.camera.ViewProjection, this.gl.canvas);

        const intersection = Intersection.PlaneLine(
            { a: 0, b: 0, c: 1, d: 0 },
            { a: [posNear[0], posNear[1], posNear[2]], b: [posFar[0], posFar[1], posFar[2]] });

        intersection[1] -= this.settings.MemoryLimit.Height * this.codeEditor.CellSize;

        this.camera.Translate({
            x: -intersection[0],
            y: -intersection[1]
        });

        this.codeEditor.ViewProjection = this.camera.ViewProjection;
        this.perspectiveLabelRenderer.ViewProjection = this.camera.ViewProjection;
    }
}

Inversify.bind(AppService).toSelf().inSingletonScope().onActivation(AsyncConstructorActivator);
