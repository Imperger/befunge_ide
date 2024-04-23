import { inject, injectable, interfaces } from "inversify";

import { AppSettings } from "../AppSettings";
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
import { CodeEditorTooltipService, TooltipPosition, TooltipReleaser } from "./CodeEditorTooltipService";

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
    private readonly editableCellStyle: Rgb;

    private editableRegion: EditableRegion = {
        lt: { x: 0, y: 0 },
        rb: { x: 0, y: 0 }
    };

    private editionDirection: EditionDirection = EditionDirection.Right;

    private tooltipReleaser: TooltipReleaser[] = [];

    constructor(
        @inject(AppSettings) settings: AppSettings,
        @inject(SourceCodeMemory) private editorSourceCode: SourceCodeMemory,
        @inject(CodeEditorRenderer) private codeEditorRenderer: CodeEditorRenderer,
        @inject(CodeEditorTooltipService) private tooltipService: CodeEditorTooltipService,
        @inject(AppCommandInjectionToken.EditCellCommandFactory) private editCellCommandFactory: EditCellCommandFactory,
        @inject(EditCellCommandPostAction.MoveNext) private cellMoveNextPostActionFactory: interfaces.AutoFactory<CellMoveNextAction>,
        @inject(AppCommandInjectionToken.EditCellsRegionFactory) private editCellsRegionCommandFactory: EditCellsRegionCommandFactory,
        @inject(EditCellsRegionCommandPostAction.MoveNext) private regionMoveNextPostActionFactory: interfaces.AutoFactory<RegionMoveNextAction>,
        @inject(EditCellsRegionCommandPostAction.StayLeftTop) private regionStayLeftTopPostActionFactory: interfaces.AutoFactory<StayLeftTopAction>,
        @inject(AppHistory) private history: AppHistory) {
        this.editableCellStyle = settings.Visual.editableCellStyle;
        if (this.IsSingleCell) {
            this.codeEditorRenderer.Select(this.editableRegion.lt.x, this.editableRegion.lt.y, this.editableCellStyle);
        } else {
            this.codeEditorRenderer.SelectRegion(this.editableRegion.lt, this.editableRegion.rb, this.editableCellStyle);
        }
    }

    CellInput(keyCode: string): void {
        this.IsSingleCell ? this.CellInputSingle(keyCode) : this.CellInputRegion(keyCode);
    }

    private CellInputSingle(keyCode: string): void {
        if (this.ProcessNavigationSingle(keyCode)) {
            return;
        }

        const oldValue = String.fromCharCode(this.editorSourceCode.Read(this.editableRegion.lt));

        const command = keyCode === 'Backspace' ?
            this.editCellCommandFactory(
                this.editableRegion.lt,
                oldValue,
                ' ',
                this.ReversedDirection(this.editionDirection),
                this.cellMoveNextPostActionFactory()) :
            this.editCellCommandFactory(
                this.editableRegion.lt,
                oldValue,
                keyCode,
                this.editionDirection,
                this.cellMoveNextPostActionFactory());

        command.Apply();

        if (!(keyCode === String.fromCharCode(this.editorSourceCode.Read(this.editableRegion.lt)) ||
            keyCode === 'Backspace' && oldValue === ' ')) {
            this.history.Push(command);
        }
    }

    private ProcessNavigationSingle(keyCode: string): boolean {
        const dirMap = [
            ['ArrowLeft', EditionDirection.Left] as const,
            ['ArrowUp', EditionDirection.Up] as const,
            ['ArrowRight', EditionDirection.Right] as const,
            ['ArrowDown', EditionDirection.Down] as const
        ];

        const dir = dirMap.find(x => keyCode === x[0]);

        if (dir === undefined) {
            return false;
        }

        const prevDir = this.EditionDirection;
        this.EditionDirection = dir[1];

        const value = String.fromCharCode(this.editorSourceCode.Read(this.editableRegion.lt));
        this.editCellCommandFactory(
            this.editableRegion.lt,
            value,
            value,
            this.editionDirection,
            this.cellMoveNextPostActionFactory().DisableCodeFlowHelper).Apply();

        this.EditionDirection = prevDir;

        return true;
    }

    private CellInputRegion(keyCode: string): void {
        const dimension = this.RegionDimension;

        const oldValue = Array2D.WithProvider(dimension.width, dimension.height, () => 0);
        for (let y = this.editableRegion.lt.y; y <= this.editableRegion.rb.y; ++y) {
            for (let x = this.editableRegion.lt.x; x <= this.editableRegion.rb.x; ++x) {
                oldValue.Set({ column: x - this.editableRegion.lt.x, row: y - this.editableRegion.lt.y }, this.editorSourceCode.Read({ x: x, y: y }));
            }
        }

        const command = keyCode === 'Backspace' ?
            this.editCellsRegionCommandFactory(
                this.editableRegion,
                oldValue,
                Array2D.WithProvider(dimension.width, dimension.height, () => ' '.charCodeAt(0)),
                this.ReversedDirection(this.editionDirection),
                this.regionMoveNextPostActionFactory()) :
            this.editCellsRegionCommandFactory(
                this.editableRegion,
                oldValue,
                Array2D.WithProvider(dimension.width, dimension.height, () => keyCode.charCodeAt(0)),
                this.editionDirection,
                this.regionMoveNextPostActionFactory());

        command.Apply();

        if (!(keyCode === 'Backspace' && oldValue.Every(x => String.fromCharCode(x) === ' ') ||
            oldValue.Every(x => String.fromCharCode(x) === keyCode))) {
            this.history.Push(command);
        }
    }

    private ReversedDirection(direction: EditionDirection): EditionDirection {
        switch (direction) {
            case EditionDirection.Left:
                return EditionDirection.Right;
            case EditionDirection.Right:
                return EditionDirection.Left;
            case EditionDirection.Up:
                return EditionDirection.Down;
            case EditionDirection.Down:
                return EditionDirection.Up
        }
    }

    Select(cell: Vec2): void {
        if (!this.IsLocationValid(cell)) {
            return;
        }

        this.ShowTooltips([cell]);
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

        this.ShowTooltips([p0, p1]);
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

        if (!newValue.Equals(oldValue)) {
            this.history.Push(command);
        }

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

        if (!oldValue.Every(x => x === 32)) {
            this.history.Push(command);
        }
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

    private ShowTooltips(locations: Vec2[]): void {
        this.tooltipReleaser.forEach(x => x());
        this.tooltipReleaser.length = 0;

        locations
            .forEach(loc => this.tooltipReleaser.push(this.tooltipService.Tooltip(loc.x, loc.y, this.FormatCellLocation(loc), TooltipPosition.RightBottom)));
    }

    private FormatCellLocation(location: Vec2): string {
        return `${location.x}:${location.y}`;
    }
}

Inversify.bind(EditableTarget).toSelf().inSingletonScope();
