
import { mat4 } from 'gl-matrix';

import { AppEventTransformer } from './AppEventTransformer';
import { CodeEditorService } from './CodeEditor/CodeEditorService';
import { DebugRenderer } from './DebugRenderer';
import { OverlayService } from './Overlay/OverlayService';

import { Intersection } from '@/lib/math/Intersection';
import { Camera } from '@/lib/renderer/Camera';


async function Delay(delay: number): Promise<void> {
    return new Promise(ok => setTimeout(ok, delay));
}

export class AppService extends AppEventTransformer {
    private isRunning = true;

    private fovy = 60 / 180 * Math.PI;
    private aspect!: number;
    private zNear = 1;
    private zFar = 500;

    private projection!: mat4;
    private camera: mat4;

    private overlay!: OverlayService;
    private codeEditor: CodeEditorService;

    private debugRenderer: DebugRenderer;
    private debugPoints: number[] = [5, 5, 0.2, 0, 0, 0];


    private constructor(private gl: WebGL2RenderingContext) {
        super();
        //this.camera = mat4.rotateY(mat4.create(), mat4.create(), 0.3141592653589793);
        //console.log(this.camera);
        this.camera = mat4.translate(mat4.create(), mat4.create(), [50, 100, 300]);

        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        this.BuildProjection();

        this.codeEditor = new CodeEditorService(gl);
        this.codeEditor.ViewProjection = this.ViewProjection;

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

        Debug();

    }

    static async Create(gl: WebGL2RenderingContext): Promise<AppService> {
        const service = new AppService(gl);

        await service.SetupUIRenderer();

        return service;
    }

    Resize(): void {
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
            this.codeEditor.Touch(e);
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

        if (z >= this.zFar || z <= this.zNear) {
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

    private async SetupUIRenderer(): Promise<void> {
        this.overlay = await OverlayService.Create(this.gl, this.zNear, this.zFar);

        this.Start();
    }

    private BuildProjection(): void {
        this.aspect = this.gl.canvas.width / this.gl.canvas.height;

        this.projection = mat4.perspective(mat4.create(), this.fovy, this.aspect, this.zNear, this.zFar);
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
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        this.codeEditor.Draw();
        this.debugRenderer.Draw();

        this.gl.clear(this.gl.DEPTH_BUFFER_BIT);

        this.overlay.Draw();

        if (this.isRunning) {
            requestAnimationFrame(() => this.DrawFrame())
        }
    }
}
