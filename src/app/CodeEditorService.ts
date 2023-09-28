
import { mat4 } from 'gl-matrix';

import { CodeEditorEventTransformer } from './CodeEditorEventTransformer';
import { CodeEditorRenderer } from './CodeEditorRenderer';
import { DebugRenderer } from './DebugRenderer';

import { Intersection } from '@/lib/math/Intersection';
import { Rgb, Vec2 } from '@/lib/Primitives';
import { Camera } from '@/lib/renderer/Camera';
import { UIIcon } from '@/lib/UI/UIIcon';
import { UIRenderer } from '@/lib/UI/UIRednerer';


async function Delay(delay: number): Promise<void> {
    return new Promise(ok => setTimeout(ok, delay));
}

enum EditionDirection { Left, Up, Right, Down };

export class CodeEditorService extends CodeEditorEventTransformer {
    private isRunning = true;

    private fovy = 60 / 180 * Math.PI;
    private aspect!: number;
    private zNear = 1;
    private zFar = 500;

    private projection!: mat4;
    private stickyProjection!: mat4;
    private camera: mat4;

    private codeEditorRenderer: CodeEditorRenderer;

    private readonly editionCellStyle: Rgb = [1, 0, 0];
    private editionCell: Vec2 = { x: 0, y: 0 };
    private editionDirection: EditionDirection = EditionDirection.Right;

    private debugRenderer: DebugRenderer;
    private debugPoints: number[] = [5, 5, 0.2, 0, 0, 0];

    private ui!: UIRenderer;

    private constructor(private gl: WebGL2RenderingContext) {
        super();
        //this.camera = mat4.rotateY(mat4.create(), mat4.create(), 0.3141592653589793);
        //console.log(this.camera);
        this.camera = mat4.translate(mat4.create(), mat4.create(), [50, 100, 300]);

        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        this.BuildProjection();
        this.BuildStickyProjection();

        this.codeEditorRenderer = new CodeEditorRenderer(gl);
        this.codeEditorRenderer.ViewProjection = this.ViewProjection;

        this.debugRenderer = new DebugRenderer(gl);
        this.debugRenderer.ViewProjection = this.ViewProjection;
        this.debugRenderer.UploadAttributes(this.debugPoints);

        this.codeEditorRenderer.Select(this.editionCell.x, this.editionCell.y, this.editionCellStyle);

        const Debug = async () => {
            const text = 'Hello world! 1234567890$@';

            for (let n = 0; n < text.length; ++n) {

                this.codeEditorRenderer.Symbol(text[n], n, 1);

                await Delay(10);
            }

            const startCode = ' '.charCodeAt(0);
            const endCode = '~'.charCodeAt(0);
            const startRow = 3;
            for (let n = 0; n < endCode - startCode; ++n) {
                this.codeEditorRenderer.Symbol(String.fromCharCode(n + startCode), n % 80, startRow + Math.floor(n / 80));

                await Delay(10);
            }

            let x = true;
            while (x) {
                for (let n = 0; n < 80; ++n) {
                    this.codeEditorRenderer.Select(n, 6, [0, 0, n / 80]);

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

    static async Create(gl: WebGL2RenderingContext): Promise<CodeEditorService> {
        const service = new CodeEditorService(gl);

        await service.SetupUIRenderer();

        return service;
    }

    Resize(): void {
        this.BuildProjection();
        this.BuildStickyProjection();

        this.codeEditorRenderer.ViewProjection = this.ViewProjection;
        this.debugRenderer.ViewProjection = this.ViewProjection;
        this.ui.ViewProjection = this.stickyProjection;
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

        this.codeEditorRenderer.ViewProjection = this.ViewProjection;
        this.debugRenderer.ViewProjection = this.ViewProjection;
    }

    OnSelect(e: MouseEvent): void {
        const posNear = Camera.Unproject({ x: e.offsetX, y: e.offsetY, z: 0 }, this.ViewProjection, this.gl.canvas);
        const posFar = Camera.Unproject({ x: e.offsetX, y: e.offsetY, z: 1 }, this.ViewProjection, this.gl.canvas);

        const intersection = Intersection.PlaneLine(
            { a: 0, b: 0, c: 1, d: 0 },
            { a: [posNear[0], posNear[1], posNear[2]], b: [posFar[0], posFar[1], posFar[2]] });

        const column = Math.floor(intersection[0] / this.codeEditorRenderer.CellSize);
        const row = this.codeEditorRenderer.Dimension.Rows - Math.floor(intersection[1] / this.codeEditorRenderer.CellSize) - 1;

        if (column >= 0 && row >= 0 && column < this.codeEditorRenderer.Dimension.Columns && row < this.codeEditorRenderer.Dimension.Rows) {
            this.codeEditorRenderer.Unselect(this.editionCell.x, this.editionCell.y);

            this.editionCell.x = column;
            this.editionCell.y = row;
            this.codeEditorRenderer.Select(this.editionCell.x, this.editionCell.y, this.editionCellStyle);
        }

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

        this.codeEditorRenderer.ViewProjection = this.ViewProjection;
        this.debugRenderer.ViewProjection = this.ViewProjection;
    }

    OnCellInput(e: KeyboardEvent): void {
        this.codeEditorRenderer.Symbol(e.key, this.editionCell.x, this.editionCell.y);

        this.MoveToNextEditionCell();
    }

    private async SetupUIRenderer(): Promise<void> {
        this.ui = await UIRenderer.Create(this.gl, this.zFar);
        this.ui.ViewProjection = this.stickyProjection;


        const blueButton = this.ui.CreateButton(
            { x: 10, y: 10 },
            { width: 300, height: 100 },
            0,
            { fillColor: [0, 0, 1], outlineColor: [0, 1, 0] },
            { icon: UIIcon.ARROW_UP, color: [0, 1, 0] });

        const redButton = this.ui.CreateButton(
            { x: 250, y: 50 },
            { width: 300, height: 100 },
            1,
            { fillColor: [1, 0, 0], outlineColor: [0, 1, 0] },
            { icon: UIIcon.SAVE, color: [0, 1, 0] });

        this.Start();
    }

    private MoveToNextEditionCell(): void {
        this.codeEditorRenderer.Unselect(this.editionCell.x, this.editionCell.y);

        switch (this.editionDirection) {
            case EditionDirection.Left:
                this.editionCell.x = this.editionCell.x === 0 ?
                    this.codeEditorRenderer.Dimension.Columns - 1 :
                    this.editionCell.x - 1;
                break;
            case EditionDirection.Up:
                this.editionCell.y = this.editionCell.y === 0 ?
                    this.codeEditorRenderer.Dimension.Rows - 1 :
                    this.editionCell.y - 1;
                break;
            case EditionDirection.Right:
                this.editionCell.x = this.editionCell.x === this.codeEditorRenderer.Dimension.Columns - 1 ?
                    0 :
                    this.editionCell.x + 1;
                break;
            case EditionDirection.Down:
                this.editionCell.y = this.editionCell.y === this.codeEditorRenderer.Dimension.Rows - 1 ?
                    0 :
                    this.editionCell.y + 1;
                break;
        }

        this.codeEditorRenderer.Select(this.editionCell.x, this.editionCell.y, this.editionCellStyle);
    }

    private BuildProjection(): void {
        this.aspect = this.gl.canvas.width / this.gl.canvas.height;

        this.projection = mat4.perspective(mat4.create(), this.fovy, this.aspect, this.zNear, this.zFar);
    }

    private BuildStickyProjection(): void {
        this.stickyProjection = mat4.ortho(
            mat4.create(),
            0, this.gl.canvas.width,
            0, this.gl.canvas.height,
            -this.zNear, -this.zFar);
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

        this.codeEditorRenderer.Draw();
        this.debugRenderer.Draw();

        this.gl.clear(this.gl.DEPTH_BUFFER_BIT);

        this.ui.Draw();

        if (this.isRunning) {
            requestAnimationFrame(() => this.DrawFrame())
        }
    }
}
