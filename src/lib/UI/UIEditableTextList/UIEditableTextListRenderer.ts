import { inject, injectable, interfaces } from "inversify";

import { Dimension } from "../UIComponent";
import { UIObservablePositioningGroup } from "../UIObservablePositioningGroup";
import { UICreator, UIRenderer } from "../UIRenderer";
import { ContainerStyle } from "../UITextList/UITextList";

import { UIEditableTextList } from "./UIEditableTextList";
import FEditableTextListCursor from './UIEditableTextListCursor.frag';
import VEditableTextListCursor from './UIEditableTextListCursor.vert';
import { UIObservableEditableTextList, UIObservableEditableTextListDeleter } from "./UIObservableEditableTextList";

import { InjectionToken } from "@/app/InjectionToken";
import { Inversify } from "@/Inversify";
import { Vec2 } from "@/lib/Primitives";
import { PrimitivesRenderer } from "@/lib/renderer/PrimitivesRenderer";
import { Mat4 } from "@/lib/renderer/ShaderProgram";

@injectable()
export class UIEditableTextListRenderer extends PrimitivesRenderer {
    private uiRenderer!: UICreator;

    constructor(@inject(InjectionToken.WebGLRenderingContext) gl: WebGL2RenderingContext) {

        super(gl,
            { fragment: FEditableTextListCursor, vertex: VEditableTextListCursor },
            [{
                name: 'a_vertex',
                size: 3,
                type: gl.FLOAT,
                normalized: false
            }],
            { indicesPerPrimitive: 6, basePrimitiveType: gl.TRIANGLES });
    }

    Create(position: Vec2,
        dimension: Dimension,
        zIndex: number,
        text: string,
        containerStyle: ContainerStyle,
        lineHeight: number,
        deleter: UIObservableEditableTextListDeleter,
        parent: UIObservablePositioningGroup | null = null): UIEditableTextList {

        return new UIObservableEditableTextList(
            position,
            dimension,
            zIndex,
            text,
            containerStyle,
            lineHeight,
            this.uiRenderer,
            deleter,
            parent);
    }

    get UIRenderer(): UICreator {
        return this.uiRenderer;
    }

    set UIRenderer(renderer: UICreator) {
        this.uiRenderer = renderer;
    }

    set ViewProjection(mat: Mat4 | Float32Array) {
        this.shader.SetUniformMatrix4fv('u_viewProject', mat);
    }
}

Inversify.bind(UIEditableTextListRenderer).toSelf().inTransientScope();

export type UIEditableTextListRendererFactory = (uiRenderer: UIRenderer) => UIEditableTextListRenderer;

Inversify
    .bind<interfaces.Factory<UIEditableTextListRendererFactory>>(InjectionToken.UIEditableTextListRendererFactory)
    .toFactory<UIEditableTextListRenderer, [UIRenderer]>(ctx => (uiRenderer: UIRenderer) => {
        const instance = ctx.container.get(UIEditableTextListRenderer);
        instance.UIRenderer = uiRenderer;

        return instance;
    });
