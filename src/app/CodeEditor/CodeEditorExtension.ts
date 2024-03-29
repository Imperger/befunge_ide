import { Mat4 } from "@/lib/renderer/ShaderProgram";

export interface CodeEditorExtension {
    Draw(): void;

    Unload(): void;

    set ViewProjection(mat: Mat4 | Float32Array);
};

export class EmptyExtension implements CodeEditorExtension {
    Draw(): void { }

    Unload(): void { }

    set ViewProjection(mat: Mat4 | Float32Array) { }
}
