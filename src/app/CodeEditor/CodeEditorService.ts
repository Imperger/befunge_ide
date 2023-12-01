import { inject, injectable } from "inversify";

import { InjectionToken } from "../InjectionToken";
import { SourceCodeMemory } from "../SourceCodeMemory";

import { CodeEditorRenderer } from "./CodeEditorRenderer";
import { CodeEditorTooltipService, TooltipPosition, TooltipReleaser } from "./CodeEditorTooltipService";
import { EditorGridDimension } from "./EditorGridRenderer";

import { Inversify } from "@/Inversify";
import { Intersection } from "@/lib/math/Intersection";
import { Observable, ObservableController } from "@/lib/Observable";
import { Rgb, Vec2 } from "@/lib/Primitives";
import { Camera } from "@/lib/renderer/Camera";
import { Mat4 } from "@/lib/renderer/ShaderProgram";

export enum EditionDirection { Left, Up, Right, Down };



@injectable()
export class CodeEditorService {
    private readonly editionCellStyle: Rgb = [0.21568627450980393, 0.2784313725490196, 0.30980392156862746];
    private editionCell: Vec2 = { x: 0, y: 0 };
    private editionDirection: EditionDirection = EditionDirection.Right;

    private editDirectionObservable = new ObservableController<EditionDirection>();

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) private gl: WebGL2RenderingContext,
        @inject(CodeEditorRenderer) private codeEditorRenderer: CodeEditorRenderer,
        @inject(CodeEditorTooltipService) private tooltipService: CodeEditorTooltipService) {

        this.codeEditorRenderer.Select(this.editionCell.x, this.editionCell.y, this.editionCellStyle);
    }

    get EditDirectionObservable(): Observable<EditionDirection> {
        return this.editDirectionObservable;
    }

    get EditionDirection(): EditionDirection {
        return this.editionDirection;
    }

    set EditionDirection(direction: EditionDirection) {
        this.editionDirection = direction;

        this.editDirectionObservable.Notify(direction);
    }

    Symbol(symbol: string, column: number, row: number): void {
        this.codeEditorRenderer.Symbol(symbol, column, row);
    }

    Select(column: number, row: number, style: Rgb): void {
        this.codeEditorRenderer.Select(column, row, style);
    }

    Unselect(column: number, row: number): void {
        this.codeEditorRenderer.Unselect(column, row);
    }

    Tooltip(column: number, row: number, text: string, position: TooltipPosition): TooltipReleaser {
        return this.tooltipService.Tooltip(column, row, text, position);
    }

    HideAllTooltips(): void {
        this.tooltipService.ReleaseAll();
    }

    Touch(e: MouseEvent): void {
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
    }

    CellInput(e: KeyboardEvent): void {
        this.codeEditorRenderer.Symbol(e.key, this.editionCell.x, this.editionCell.y);

        Inversify.get(SourceCodeMemory).Write(this.editionCell, e.key.charCodeAt(0));

        this.PostCellInputHook(e);

        this.MoveToNextEditionCell();
    }

    Clear(): void {
        for (let row = 0; row < this.codeEditorRenderer.Dimension.Rows; ++row) {
            for (let column = 0; column < this.codeEditorRenderer.Dimension.Columns; ++column) {
                this.Symbol(' ', column, row);
            }
        }
    }

    private PostCellInputHook(e: KeyboardEvent): void {
        this.FollowCodeFlowHelper(e);
    }

    private FollowCodeFlowHelper(e: KeyboardEvent): void {
        if (e.key === '<' && this.editionDirection !== EditionDirection.Left) {
            this.EditionDirection = EditionDirection.Left;
        } else if (e.key === '^' && this.editionDirection !== EditionDirection.Up) {
            this.EditionDirection = EditionDirection.Up;
        } else if (e.key === '>' && this.editionDirection !== EditionDirection.Right) {
            this.EditionDirection = EditionDirection.Right;
        } else if (e.key === 'v' && this.editionDirection !== EditionDirection.Down) {
            this.EditionDirection = EditionDirection.Down;
        }
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

    Draw(): void {
        this.codeEditorRenderer.Draw();
    }

    get Dimension(): EditorGridDimension {
        return this.codeEditorRenderer.Dimension;
    }

    get ViewProjection() {
        return this.codeEditorRenderer.ViewProjection;
    }

    set ViewProjection(proj: Mat4 | Float32Array) {
        this.codeEditorRenderer.ViewProjection = proj;
    }

    get EditionCell(): Vec2 {
        return this.editionCell;
    }
}

Inversify.bind(CodeEditorService).toSelf().inSingletonScope();
