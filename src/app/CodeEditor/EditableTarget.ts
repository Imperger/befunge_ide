import { inject, injectable } from "inversify";

import { AppHistory } from "../History/AppHistory";
import type { EditCellCommandFactory } from "../History/Commands/EditCellCommand";
import type { EditCellsRegionCommandFactory } from "../History/Commands/EditCellsRegionCommand";
import { AppCommandInjectionToken } from "../InjectionToken";
import { SourceCodeMemory } from "../SourceCodeMemory";

import { CodeEditorRenderer } from "./CodeEditorRenderer";
import { EditionDirection } from "./CodeEditorService";

import { Inversify } from "@/Inversify";
import { Array2D } from "@/lib/containers/Array2D";
import { MathUtil } from "@/lib/math/MathUtil";
import { Rgb, Vec2 } from "@/lib/Primitives"

export interface EditableRegion {
    lt: Vec2;
    rb: Vec2
}

export interface RegionDimension {
    width: number;
    height: number;
}

@injectable()
export class EditableTarget {
    private readonly editableCellStyle: Rgb = [0.21568627450980393, 0.2784313725490196, 0.30980392156862746];

    private editableRegion: EditableRegion = {
        lt: { x: 0, y: 0 },
        rb: { x: 0, y: 0 }
    };

    private editionDirection: EditionDirection = EditionDirection.Right;

    constructor(
        @inject(SourceCodeMemory) private editorSourceCode: SourceCodeMemory,
        @inject(CodeEditorRenderer) private codeEditorRenderer: CodeEditorRenderer,
        @inject(AppCommandInjectionToken.EditCellCommandFactory) private editCellCommandFactory: EditCellCommandFactory,
        @inject(AppCommandInjectionToken.EditCellsRegionFactory) private editCellsRegionCommandFactory: EditCellsRegionCommandFactory,
        @inject(AppHistory) private history: AppHistory) {
        if (this.IsSingleCell) {
            this.codeEditorRenderer.Select(this.editableRegion.lt.x, this.editableRegion.lt.y, this.editableCellStyle);
        } else {
            this.codeEditorRenderer.SelectRegion(this.editableRegion.lt, this.editableRegion.rb, this.editableCellStyle);
        }
    }

    CellInput(symbol: string): void {
        this.IsSingleCell ? this.CellInputSingle(symbol) : this.CellInputRegion(symbol);
    }

    private CellInputSingle(symbol: string): void {
        const command = this.editCellCommandFactory(
            this.editableRegion.lt,
            String.fromCharCode(this.editorSourceCode.Read(this.editableRegion.lt)),
            symbol,
            this.editionDirection);

        command.Apply();

        this.history.Push(command);
    }

    private CellInputRegion(symbol: string): void {
        const dimension = this.RegionDimension;
        const oldValue = Array2D.WithProvider(dimension.width, dimension.height, () => 0);
        for (let y = this.editableRegion.lt.y; y <= this.editableRegion.rb.y; ++y) {
            for (let x = this.editableRegion.lt.x; x <= this.editableRegion.rb.x; ++x) {
                oldValue.Set({ column: x - this.editableRegion.lt.x, row: y - this.editableRegion.lt.y }, this.editorSourceCode.Read({ x: x, y: y }));
            }
        }

        const command = this.editCellsRegionCommandFactory(
            this.editableRegion,
            oldValue,
            Array2D.WithProvider(dimension.width, dimension.height, () => symbol.charCodeAt(0)),
            this.editionDirection);

        command.Apply();

        this.history.Push(command);
    }

    Select(cell: Vec2): void {
        if (!this.IsLocationValid(cell)) {
            return;
        }

        this.Unselect();

        this.editableRegion.lt.x = cell.x;
        this.editableRegion.lt.y = cell.y;
        this.editableRegion.rb.x = cell.x;
        this.editableRegion.rb.y = cell.y;

        this.codeEditorRenderer.Select(this.editableRegion.lt.x, this.editableRegion.lt.y, this.editableCellStyle);
    }

    SelectRegion(p0: Vec2, p1: Vec2): void {
        if (!(this.IsLocationValid(p0) && this.IsLocationValid(p1))) {
            return;
        }

        this.Unselect();

        const normalized = MathUtil.Extremum([p0, p1]);
        const region = { lt: normalized.min, rb: normalized.max };

        this.editableRegion.lt = { ...region.lt };
        this.editableRegion.rb = { ...region.rb };

        this.codeEditorRenderer.SelectRegion(region.lt, region.rb, this.editableCellStyle);
    }

    private IsLocationValid(point: Vec2): boolean {
        return point.x >= 0 && point.y >= 0 && point.x < this.codeEditorRenderer.Dimension.Columns && point.y < this.codeEditorRenderer.Dimension.Rows;
    }

    private Unselect(): void {
        this.IsSingleCell ?
            this.codeEditorRenderer.Unselect(this.editableRegion.lt.x, this.editableRegion.lt.y) :
            this.codeEditorRenderer.UnselectRegion(this.editableRegion.lt, this.editableRegion.rb);
    }

    Focus(): void {
        this.codeEditorRenderer.SelectRegion(this.editableRegion.lt, this.editableRegion.rb, this.editableCellStyle);
    }

    Blur(): void {
        this.codeEditorRenderer.UnselectRegion(this.editableRegion.lt, this.editableRegion.rb);
    }

    get IsSingleCell(): boolean {
        return this.editableRegion.lt.x === this.editableRegion.rb.x &&
            this.editableRegion.lt.y === this.editableRegion.rb.y;
    }

    get RegionDimension(): RegionDimension {
        return {
            width: this.editableRegion.rb.x - this.editableRegion.lt.x + 1,
            height: this.editableRegion.rb.y - this.editableRegion.lt.y + 1
        };
    }

    get Target(): EditableRegion {
        return this.editableRegion;
    }

    get EditionDirection(): EditionDirection {
        return this.editionDirection;
    }

    set EditionDirection(direction: EditionDirection) {
        this.editionDirection = direction;
    }
}

Inversify.bind(EditableTarget).toSelf().inRequestScope();
