import { inject, injectable } from "inversify";

import { EditorGridCellsOutlineRenderer } from "./EditorGridCellsOutlineRenderer";
import { EditorGridDimension, EditorGridRenderer } from "./EditorGridRenderer";
import { SelectionRenderer } from "./SelectionRenderer";

import { Inversify } from "@/Inversify";
import { Rgb, Vec2 } from "@/lib/Primitives";
import { Mat4 } from "@/lib/renderer/ShaderProgram";

@injectable()
export class CodeEditorRenderer {
    private viewProjection!: Mat4 | Float32Array;

    constructor(
        @inject(EditorGridRenderer) private editorGridRenderer: EditorGridRenderer,
        @inject(EditorGridCellsOutlineRenderer) private editorGridCellsOutlineRenderer: EditorGridCellsOutlineRenderer,
        @inject(SelectionRenderer) private selectionRenderer: SelectionRenderer) { }

    set ViewProjection(mat: Mat4 | Float32Array) {
        this.viewProjection = mat;

        this.editorGridRenderer.ViewProjection = mat;
        this.editorGridCellsOutlineRenderer.ViewProjection = mat;
        this.selectionRenderer.ViewProjection = mat;
    }

    get ViewProjection(): Mat4 | Float32Array {
        return this.viewProjection;
    }

    Symbol(symbol: string, column: number, row: number): void {
        this.editorGridRenderer.Symbol(symbol, column, row);
    }

    Select(column: number, row: number, color: Rgb): void {
        this.selectionRenderer.Select(column, row, color);
    }

    SelectRegion(p0: Vec2, p1: Vec2, color: Rgb): void {
        this.selectionRenderer.SelectRegion(p0, p1, color);
    }

    Unselect(column: number, row: number): void {
        this.selectionRenderer.Unselect(column, row);
    }

    UnselectRegion(p0: Vec2, p1: Vec2): void {
        this.selectionRenderer.UnselectRegion(p0, p1);
    }

    Draw(): void {
        this.editorGridRenderer.Draw();
        this.editorGridCellsOutlineRenderer.Draw();
        this.selectionRenderer.Draw();
    }

    get Dimension(): EditorGridDimension {
        return this.editorGridRenderer.Dimension;
    }

    get CellSize(): number {
        return this.editorGridRenderer.CellSize;
    }
}

Inversify.bind(CodeEditorRenderer).toSelf().inSingletonScope();
