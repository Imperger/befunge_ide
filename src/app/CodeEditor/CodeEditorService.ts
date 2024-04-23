import { vec3 } from "gl-matrix";
import { inject, injectable } from "inversify";

import { MouseSelectEvent } from "../AppEventTransformer";
import { InjectionToken } from "../InjectionToken";
import { OverlayService } from "../Overlay/OverlayService";
import { SourceCodeMemory } from "../SourceCodeMemory";

import { CodeEditorExtension, EmptyExtension } from "./CodeEditorExtension";
import { CodeEditorRenderer } from "./CodeEditorRenderer";
import { CodeEditorTooltipService, TooltipPosition, TooltipReleaser } from "./CodeEditorTooltipService";
import { EditableTarget } from "./EditableTarget";
import { EditorGridDimension } from "./EditorGridRenderer";

import { Inversify } from "@/Inversify";
import { Pointer } from "@/lib/befunge/memory/Memory";
import { AsyncExceptionTrap } from "@/lib/ExceptionTrap";
import { Intersection } from "@/lib/math/Intersection";
import { Observable, ObservableController } from "@/lib/Observable";
import { Rgb, Vec2 } from "@/lib/Primitives";
import { Camera } from "@/lib/renderer/Camera";
import { Mat4 } from "@/lib/renderer/ShaderProgram";
import { SelfBind } from "@/lib/SelfBind";
import { MyInputEvent } from "@/lib/UI/InputReceiver";

export enum EditionDirection { Left, Up, Right, Down };


export interface EditableCellRect {
    lb: vec3;
    rt: vec3;
}

interface TouchBehavior {
    Touch(cell: Vec2): TouchBehavior;
    get PivotTouch(): Vec2;
}

class SelectCellBehaiver implements TouchBehavior {
    constructor(
        private editableCell: EditableTarget,
        private pivotTouch: Vec2) { }

    Touch(cell: Vec2): TouchBehavior {
        this.editableCell.Select(cell);

        this.pivotTouch = cell;

        return this;
    }

    get PivotTouch(): Vec2 {
        return this.pivotTouch;
    }
}

class SelectCellsRegion implements TouchBehavior {
    constructor(
        private editableCell: EditableTarget,
        private pivotTouch: Vec2) { }

    Touch(cell: Vec2): TouchBehavior {
        this.editableCell.SelectRegion(this.pivotTouch, cell);

        return new SelectCellBehaiver(this.editableCell, this.pivotTouch);
    }

    get PivotTouch(): Vec2 {
        return this.pivotTouch;
    }
}

@injectable()
export class CodeEditorService {
    private editDirectionObservable = new ObservableController<EditionDirection>();

    private editableCellLostObservale = new ObservableController<void>();

    private extension: CodeEditorExtension = new EmptyExtension();

    private touchBehavior: TouchBehavior;

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) private gl: WebGL2RenderingContext,
        @inject(OverlayService) private overlay: OverlayService,
        @inject(EditableTarget) private editableCell: EditableTarget,
        @inject(CodeEditorRenderer) private codeEditorRenderer: CodeEditorRenderer,
        @inject(SourceCodeMemory) private editorSourceCode: SourceCodeMemory,
        @inject(CodeEditorTooltipService) private tooltipService: CodeEditorTooltipService) {
        this.touchBehavior = new SelectCellBehaiver(this.editableCell, { x: 0, y: 0 });
        this.overlay.EditControls.SelectObservable.Attach(() => this.OnSetEditableRegion());
        this.overlay.EditControls.CutObservable.Attach(() => this.OnCut());
        this.overlay.EditControls.CopyObservable.Attach(() => this.OnCopyEditableRegion());
        this.overlay.EditControls.PasteObservable.Attach(() => this.OnPaste());
        this.overlay.EditControls.DeleteObservable.Attach(() => this.OnDelete());
        this.editableCell.Select({ x: 0, y: 0 });
    }

    get EditDirectionObservable(): Observable<EditionDirection> {
        return this.editDirectionObservable;
    }

    get EditableCellLostObservable(): Observable<void> {
        return this.editableCellLostObservale;
    }

    get EditableCellDirection(): EditionDirection {
        return this.editableCell.EditionDirection;
    }

    set EditableCellDirection(direction: EditionDirection) {
        this.editableCell.EditionDirection = direction;

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

    Touch(e: MouseSelectEvent): void {
        const posNear = Camera.Unproject({ x: e.offsetX, y: e.offsetY, z: 0 }, this.ViewProjection, this.gl.canvas);
        const posFar = Camera.Unproject({ x: e.offsetX, y: e.offsetY, z: 1 }, this.ViewProjection, this.gl.canvas);

        const intersection = Intersection.PlaneLine(
            { a: 0, b: 0, c: 1, d: 0 },
            { a: [posNear[0], posNear[1], posNear[2]], b: [posFar[0], posFar[1], posFar[2]] });

        const x = Math.floor(intersection[0] / this.codeEditorRenderer.CellSize);
        const y = this.codeEditorRenderer.Dimension.Rows - Math.floor(intersection[1] / this.codeEditorRenderer.CellSize) - 1;

        const nextBehaivor = this.touchBehavior.Touch({ x, y });

        if (nextBehaivor !== this.touchBehavior) {
            this.touchBehavior = nextBehaivor;
        }
    }

    Focus(): void {
        this.editableCell.Focus();
    }

    Blur(): void {
        this.editableCell.Blur();
    }

    SetEditableCell(location: Pointer): void {
        this.editableCell.Select(location);

        if (!this.IsEditableCellVisible) {
            this.editableCellLostObservale.Notify();
        }
    }

    SetEditableRegion(p0: Vec2, p1: Vec2): void {
        this.editableCell.SelectRegion(p0, p1);
    }

    CellInput(e: MyInputEvent): void {
        this.editableCell.CellInput(e.key);
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
        return this.editableCell.Target.lt;
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
            this.editableCell.Target.lt.x * this.codeEditorRenderer.CellSize,
            (this.codeEditorRenderer.Dimension.Rows - this.editableCell.Target.lt.y - 1) * this.codeEditorRenderer.CellSize,
            0.02];

        const lbNDC = vec3.transformMat4(vec3.create(), lb, this.ViewProjection);

        if (lbNDC[0] < -1 || lbNDC[1] < -1) {
            return false;
        }

        const rt: vec3 = [
            (this.editableCell.Target.lt.x + 1) * this.codeEditorRenderer.CellSize,
            (this.codeEditorRenderer.Dimension.Rows - this.editableCell.Target.lt.y) * this.codeEditorRenderer.CellSize,
            0.02];

        const rtNDC = vec3.transformMat4(vec3.create(), rt, this.ViewProjection);

        if (rtNDC[0] > 1 || rtNDC[1] > 1) {
            return false;
        }

        return true;
    }

    get CellSize(): number {
        return this.codeEditorRenderer.CellSize;
    }

    private OnSetEditableRegion(): void {
        if ((this.editableCell.Target.lt.x === this.touchBehavior.PivotTouch.x || this.editableCell.Target.rb.x === this.touchBehavior.PivotTouch.x) &&
            (this.editableCell.Target.lt.y === this.touchBehavior.PivotTouch.y || this.editableCell.Target.rb.y === this.touchBehavior.PivotTouch.y)) {
            this.touchBehavior = new SelectCellsRegion(this.editableCell, this.touchBehavior.PivotTouch);
        } else {
            this.touchBehavior = new SelectCellsRegion(this.editableCell, this.editableCell.Target.lt);
        }
    }

    private OnCut(): void {
        navigator.clipboard.writeText(this.editableCell.ContentString());

        this.editableCell.Clear();
    }

    private OnCopyEditableRegion(): void {
        navigator.clipboard.writeText(this.editableCell.ContentString());
    }

    private async OnPaste(): Promise<void> {
        const data = await AsyncExceptionTrap
            .Try(SelfBind(navigator.clipboard, 'readText'))
            .CatchValue('');

        if (data.length === 0) {
            return;
        }

        if (!this.editableCell.InsertSourceCode(data)) {
            this.overlay.Snackbar.ShowWarning('Not enough space to insert the fragment')
        }
    }

    private OnDelete(): void {
        this.editableCell.Clear();
    }
}

Inversify.bind(CodeEditorService).toSelf().inSingletonScope();
