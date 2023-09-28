import FDebugRenderer from './DebugRenderer.frag';
import VDebugRenderer from './DebugRenderer.vert';

import { PrimitivesRenderer } from "@/lib/renderer/PrimitivesRenderer";
import { Mat4 } from '@/lib/renderer/ShaderProgram';
import { TypeSizeResolver } from '@/lib/renderer/TypeSizeResolver';

export class DebugRenderer extends PrimitivesRenderer {
    constructor(gl: WebGL2RenderingContext) {
        const floatSize = TypeSizeResolver.Resolve(gl.FLOAT);
        
        super(
            gl,
            { vertex: VDebugRenderer, fragment: FDebugRenderer },
            [{
                name: 'a_vertex',
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride: 3 * floatSize,
                offset: 0
            }],
            { indicesPerPrimitive: 3, basePrimitiveType: gl.LINES });
    }

    set ViewProjection(mat: Mat4 | Float32Array) {
        this.shader.SetUniformMatrix4fv('u_viewProject', mat);
    }
}