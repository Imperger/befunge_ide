import { vec3 } from "gl-matrix";
import { inject, injectable } from "inversify";

import { AppHistory } from "../History/AppHistory";
import type { EditCellCommandFactory } from "../History/Commands/EditCellCommand";
import { AppCommandInjectionToken, InjectionToken } from "../InjectionToken";
import { SourceCodeMemory } from "../SourceCodeMemory";

import { CodeEditorExtension, EmptyExtension } from "./CodeEditorExtension";
import { CodeEditorRenderer } from "./CodeEditorRenderer";
import { CodeEditorTooltipService, TooltipPosition, TooltipReleaser } from "./CodeEditorTooltipService";
import { EditorGridDimension } from "./EditorGridRenderer";

import { Inversify } from "@/Inversify";
import { Pointer } from "@/lib/befunge/memory/Memory";
import { Intersection } from "@/lib/math/Intersection";
import { Observable, ObservableController } from "@/lib/Observable";
import { Rgb, Vec2 } from "@/lib/Primitives";
import { Camera } from "@/lib/renderer/Camera";
import { Mat4 } from "@/lib/renderer/ShaderProgram";

export enum EditionDirection { Left, Up, Right, Down };


export interface EditableCellRect {
    lb: vec3;
    rt: vec3;
}

@injectable()
export class CodeEditorService {
    private readonly editableCellStyle: Rgb = [0.21568627450980393, 0.2784313725490196, 0.30980392156862746];
    private editableCell: Vec2 = { x: 0, y: 0 };
    private editionDirection: EditionDirection = EditionDirection.Right;

    private editDirectionObservable = new ObservableController<EditionDirection>();

    private editableCellLostObservale = new ObservableController<void>();

    private extension: CodeEditorExtension = new EmptyExtension();

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) private gl: WebGL2RenderingContext,
        @inject(CodeEditorRenderer) private codeEditorRenderer: CodeEditorRenderer,
        @inject(SourceCodeMemory) private editorSourceCode: SourceCodeMemory,
        @inject(CodeEditorTooltipService) private tooltipService: CodeEditorTooltipService,
        @inject(AppCommandInjectionToken.EditCellCommandFactory) private editCellCommandFactory: EditCellCommandFactory,
        @inject(AppHistory) private history: AppHistory) {

        this.codeEditorRenderer.Select(this.editableCell.x, this.editableCell.y, this.editableCellStyle);
    }

    get EditDirectionObservable(): Observable<EditionDirection> {
        return this.editDirectionObservable;
    }

    get EditableCellLostObservable(): Observable<void> {
        return this.editableCellLostObservale;
    }

    get EditableCellDirection(): EditionDirection {
        return this.editionDirection;
    }

    set EditableCellDirection(direction: EditionDirection) {
        this.editionDirection = direction;

        this.editDirectionObservable.Notify(direction);
    }

    LoadExtension(extension: CodeEditorExtension): void {
        this.extension.Unload();

        this.extension = extension;
        this.extension.ViewProjection = this.codeEditorRenderer.ViewProjection;
    }

    UnloadExtension(): void {
        this.extension.Unload();

        this.extension = new EmptyExtension();
    }

    EditCell(symbol: string, column: number, row: number): void {
        this.editorSourceCode.Write({ x: column, y: row }, symbol.charCodeAt(0));
        this.codeEditorRenderer.Symbol(symbol, column, row);
    }

    Select(column: number, row: number, style: Rgb): void {
        this.codeEditorRenderer.Select(column, row, style);
    }

    SelectRegion(p0: Vec2, p1: Vec2, color: Rgb): void {
        this.codeEditorRenderer.SelectRegion(p0, p1, color);
    }

    Unselect(column: number, row: number): void {
        this.codeEditorRenderer.Unselect(column, row);
    }

    UnselectRegion(p0: Vec2, p1: Vec2): void {
        this.codeEditorRenderer.UnselectRegion(p0, p1);
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
            this.codeEditorRenderer.Unselect(this.editableCell.x, this.editableCell.y);

            this.editableCell.x = column;
            this.editableCell.y = row;
            this.codeEditorRenderer.Select(this.editableCell.x, this.editableCell.y, this.editableCellStyle);
        }
    }

    Focus(): void {
        this.codeEditorRenderer.Select(this.editableCell.x, this.editableCell.y, this.editableCellStyle);
    }

    Blur(): void {
        this.codeEditorRenderer.Unselect(this.editableCell.x, this.editableCell.y);
    }

    SetEditableCell(location: Pointer): void {
        this.codeEditorRenderer.Unselect(this.editableCell.x, this.editableCell.y);

        this.editableCell.x = location.x;
        this.editableCell.y = location.y;
        this.codeEditorRenderer.Select(this.editableCell.x, this.editableCell.y, this.editableCellStyle);

        if (!this.IsEditableCellVisible) {
            this.editableCellLostObservale.Notify();
        }
    }

    CellInput(e: KeyboardEvent): void {
        const command = this.editCellCommandFactory(
            this.editableCell,
            String.fromCharCode(this.editorSourceCode.Read(this.editableCell)),
            e.key,
            this.editionDirection);

        command.Apply();

        this.history.Push(command);
    }

    Clear(): void {
        this.codeEditorRenderer.Clear();
    }

    Draw(): void {
        this.codeEditorRenderer.Draw();

        this.extension.Draw();
    }

    get Dimension(): EditorGridDimension {
        return this.codeEditorRenderer.Dimension;
    }

    get ViewProjection() {
        return this.codeEditorRenderer.ViewProjection;
    }

    set ViewProjection(proj: Mat4 | Float32Array) {
        this.codeEditorRenderer.ViewProjection = proj;
        this.extension.ViewProjection = proj;
    }

    get EditableCell(): Vec2 {
        return this.editableCell;
    }

    get EditableCellRect(): EditableCellRect {
        const lb: vec3 = [
            this.EditableCell.x * this.codeEditorRenderer.CellSize,
            (this.codeEditorRenderer.Dimension.Rows - this.EditableCell.y - 1) * this.codeEditorRenderer.CellSize,
            0.02];

        const rt: vec3 = [
            (this.EditableCell.x + 1) * this.codeEditorRenderer.CellSize,
            (this.codeEditorRenderer.Dimension.Rows - this.EditableCell.y) * this.codeEditorRenderer.CellSize,
            0.02];

        return { lb, rt };
    }

    get IsEditableCellVisible(): boolean {
        const lb: vec3 = [
            this.editableCell.x * this.codeEditorRenderer.CellSize,
            (this.codeEditorRenderer.Dimension.Rows - this.editableCell.y - 1) * this.codeEditorRenderer.CellSize,
            0.02];

        const lbNDC = vec3.transformMat4(vec3.create(), lb, this.ViewProjection);

        if (lbNDC[0] < -1 || lbNDC[1] < -1) {
            return false;
        }

        const rt: vec3 = [
            (this.editableCell.x + 1) * this.codeEditorRenderer.CellSize,
            (this.codeEditorRenderer.Dimension.Rows - this.editableCell.y) * this.codeEditorRenderer.CellSize,
            0.02];

        const rtNDC = vec3.transformMat4(vec3.create(), rt, this.ViewProjection);

        if (rtNDC[0] > 1 || rtNDC[1] > 1) {
            return false;
        }

        return true;
    }
}

Inversify.bind(CodeEditorService).toSelf().inSingletonScope();
