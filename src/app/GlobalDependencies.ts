import { inject, injectable } from "inversify";

import { InjectionToken } from "./InjectionToken";

import { Inversify } from "@/Inversify";
import { AsyncConstructable, AsyncConstructorActivator } from "@/lib/DI/AsyncConstructorActivator";
import { FontAtlas, FontAtlasBuilder } from "@/lib/font/FontAtlasBuilder";
import { NotNull } from "@/lib/NotNull";
import { UIIconAtlas } from "@/lib/UI/UIIcon";

@injectable()
export class GlobalDependencies implements AsyncConstructable {
    constructor(@inject(InjectionToken.WebGLRenderingContext) private gl: WebGL2RenderingContext) { }

    async AsyncConstructor(): Promise<void> {
        await this.SetupGlobalDependencies();
    }

    private async SetupGlobalDependencies(): Promise<void> {
        Inversify
            .bind<FontAtlas>(InjectionToken.FontAtlas)
            .toConstantValue(FontAtlasBuilder.Build({ ASCIIRange: { Start: ' ', End: '~' }, Font: { Name: 'Roboto', Size: 72 } }));

        Inversify
            .bind<WebGLTexture>(InjectionToken.FontAtlasTexture)
            .toConstantValue(this.BuildTexture(Inversify.get<FontAtlas>(InjectionToken.FontAtlas).Image));

        Inversify
            .bind<UIIconAtlas>(InjectionToken.IconAtlas)
            .toConstantValue(await Inversify.getAsync(UIIconAtlas));

        Inversify
            .bind<WebGLTexture>(InjectionToken.IconAtlasTexture)
            .toConstantValue(this.BuildTexture(Inversify.get<UIIconAtlas>(InjectionToken.IconAtlas).Image));
    }

    private BuildTexture(data: TexImageSource): WebGLTexture {
        const texture = this.gl.createTexture() ?? NotNull('Failed to create texture');

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);

        return texture;
    }
}

Inversify.bind(GlobalDependencies).toSelf().inSingletonScope().onActivation(AsyncConstructorActivator);
