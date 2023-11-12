import { injectable } from "inversify";

import { TextureCacheId } from "./TextureCacheId";

import { Inversify } from "@/Inversify";
import { FontAtlas, FontAtlasBuilder } from "@/lib/font/FontAtlasBuilder";
import { TextureCache } from "@/lib/renderer/TextureCache";


@injectable()
export class AppResource {
    private fontAtlas: FontAtlas;

    public readonly TextureCache = new TextureCache<TextureCacheId>();

    constructor() {
        this.fontAtlas = FontAtlasBuilder.Build({ ASCIIRange: { Start: ' ', End: '~' }, Font: { Name: 'Roboto', Size: 72 } });
    }

    get FontAtlas(): FontAtlas {
        return this.fontAtlas;
    }
}

Inversify.bind(AppResource).toSelf().inSingletonScope();
