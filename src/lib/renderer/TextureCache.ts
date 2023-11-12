import { NotNull } from "../NotNull";

export class TextureCache<T> {
    private cache = new Map<T, WebGLTexture>();

    Create(id: T, gl: WebGL2RenderingContext): WebGLTexture {
        const texture = gl.createTexture() ?? NotNull('Failed to create texture');

        this.cache.set(id, texture);

        return texture;
    }

    Find(id: T): WebGLTexture | null {
        return this.cache.get(id) ?? null;
    }
}
