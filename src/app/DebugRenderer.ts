import FDebugRenderer from './DebugRenderer.frag';
import VDebugRenderer from './DebugRenderer.vert';

import { PrimitivesRenderer } from "@/lib/renderer/PrimitivesRenderer";
import { Mat4 } from '@/lib/renderer/ShaderProgram';

export class DebugRenderer extends PrimitivesRenderer {
    constructor(gl: WebGL2RenderingContext) {

        super(
            gl,
            { vertex: VDebugRenderer, fragment: FDebugRenderer },
            [{
                name: 'a_vertex',
                size: 3,
                type: gl.FLOAT,
                normalized: false
            }],
            { indicesPerPrimitive: 3, basePrimitiveType: gl.LINES });
    }

    set ViewProjection(mat: Mat4 | Float32Array) {
        this.shader.SetUniformMatrix4fv('u_viewProject', mat);
    }
}