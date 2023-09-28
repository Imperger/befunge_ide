import { EditorGridCellsOutlineRenderer } from "./EditorGridCellsOutlineRenderer";
import { EditorGridDimension, EditorGridRenderer } from "./EditorGridRenderer";
import { SelectionRenderer } from "./SelectionRenderer";

import { Rgb } from "@/lib/Primitives";
import { Mat4 } from "@/lib/renderer/ShaderProgram";

export class CodeEditorRenderer {
    private editorGridRenderer: EditorGridRenderer;
    private editorGridCellsOutlineRenderer: EditorGridCellsOutlineRenderer;
    private selectionRenderer: SelectionRenderer;
    private viewProjection!: Mat4 | Float32Array;

    constructor(gl: WebGL2RenderingContext) {
        this.editorGridRenderer = new EditorGridRenderer(gl);
        this.editorGridCellsOutlineRenderer = new EditorGridCellsOutlineRenderer(gl, this.editorGridRenderer);
        this.selectionRenderer = new SelectionRenderer(gl, this.editorGridRenderer.Dimension, this.editorGridRenderer.CellSize);
    }

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

    Unselect(column: number, row: number): void {
        this.selectionRenderer.Unselect(column, row);
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
