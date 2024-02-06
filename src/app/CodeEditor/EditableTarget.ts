import { inject, injectable, interfaces } from "inversify";

import { AppHistory } from "../History/AppHistory";
import type { EditCellCommandFactory } from "../History/Commands/EditCellCommand/EditCellCommand";
import { MoveNextAction as CellMoveNextAction } from "../History/Commands/EditCellCommand/PostActions/MoveNextAction";
import type { EditCellsRegionCommandFactory } from "../History/Commands/EditCellsRegionCommand/EditCellsRegionCommand";
import { MoveNextAction as RegionMoveNextAction } from "../History/Commands/EditCellsRegionCommand/PostActions/MoveNextAction";
import { StayLeftTopAction } from "../History/Commands/EditCellsRegionCommand/PostActions/StayLeftTopAction";
import { AppCommandInjectionToken, EditCellCommandPostAction, EditCellsRegionCommandPostAction } from "../InjectionToken";
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
        @inject(EditCellCommandPostAction.MoveNext) private cellMoveNextPostActionFactory: interfaces.AutoFactory<CellMoveNextAction>,
        @inject(AppCommandInjectionToken.EditCellsRegionFactory) private editCellsRegionCommandFactory: EditCellsRegionCommandFactory,
        @inject(EditCellsRegionCommandPostAction.MoveNext) private regionMoveNextPostActionFactory: interfaces.AutoFactory<RegionMoveNextAction>,
        @inject(EditCellsRegionCommandPostAction.StayLeftTop) private regionStayLeftTopPostActionFactory: interfaces.AutoFactory<StayLeftTopAction>,
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
            this.editionDirection,
            this.cellMoveNextPostActionFactory());

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
            this.editionDirection,
            this.regionMoveNextPostActionFactory());

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

    ContentString(): string {
        let sourceCode = '';
        for (let y = this.editableRegion.lt.y; y <= this.editableRegion.rb.y; ++y) {
            for (let x = this.editableRegion.lt.x; x <= this.editableRegion.rb.x; ++x) {
                sourceCode += String.fromCharCode(this.editorSourceCode.Read({ x: x, y: y }));
            }

            sourceCode += '\n';
        }

        return sourceCode.slice(0, -1);
    }

    InsertSourceCode(sourceCode: string): boolean {
        const linesOfCode = sourceCode.split(/\r?\n/);

        let fragmentWidth = 0;
        const fragmentHeight = linesOfCode.length;
        for (let y = 0; y < linesOfCode.length; ++y) {
            const line = linesOfCode[y];
            if (line.length > fragmentWidth) {
                fragmentWidth = line.length;
            }
        }

        if (!this.IsLocationValid({
            x: this.editableRegion.lt.x + fragmentWidth - 1,
            y: this.editableRegion.lt.y + fragmentHeight - 1
        })) {
            return false;
        }

        const newValue = Array2D.WithProvider(fragmentWidth, fragmentHeight, () => 32);
        for (let row = 0; row < linesOfCode.length; ++row) {
            const line = linesOfCode[row];
            for (let column = 0; column < line.length; ++column) {
                newValue.Set({ column, row }, line[column].charCodeAt(0));
            }
        }

        const oldValue = Array2D.WithProvider(fragmentWidth, fragmentHeight, () => 0);
        for (let y = this.editableRegion.lt.y; y < this.editableRegion.lt.y + fragmentHeight; ++y) {
            for (let x = this.editableRegion.lt.x; x < this.editableRegion.lt.x + fragmentWidth; ++x) {
                oldValue.Set({ column: x - this.editableRegion.lt.x, row: y - this.editableRegion.lt.y }, this.editorSourceCode.Read({ x, y }));
            }
        }

        const command = this.editCellsRegionCommandFactory(
            this.editableRegion,
            oldValue,
            newValue,
            this.editionDirection,
            this.regionMoveNextPostActionFactory());

        command.Apply();

        this.history.Push(command);

        return true;
    }

    Clear(): void {
        const oldValue = Array2D.WithProvider(this.RegionDimension.width, this.RegionDimension.height, () => 0);
        for (let y = this.editableRegion.lt.y; y <= this.editableRegion.rb.y; ++y) {
            for (let x = this.editableRegion.lt.x; x <= this.editableRegion.rb.x; ++x) {
                oldValue.Set({ column: x - this.editableRegion.lt.x, row: y - this.editableRegion.lt.y }, this.editorSourceCode.Read({ x, y }));
            }
        }

        const command = this.editCellsRegionCommandFactory(
            this.editableRegion,
            oldValue,
            Array2D.WithProvider(this.RegionDimension.width, this.RegionDimension.height, () => 32),
            this.editionDirection,
            this.regionStayLeftTopPostActionFactory());

        command.Apply();

        this.history.Push(command);
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

Inversify.bind(EditableTarget).toSelf().inSingletonScope();
