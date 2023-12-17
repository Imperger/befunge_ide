export const InjectionToken = {
    WebGLRenderingContext: Symbol('webgl2 rendering context'),
    FontAtlas: Symbol('Font atlas'),
    IconAtlas: Symbol('Icon atlas'),
    FontAtlasTexture: Symbol('Font texture'),
    IconAtlasTexture: Symbol('Icon texture'),
    FontGlyphCollectionFactory: Symbol('Font glyph collection factory'),
    HeatmapGridRendererFactory: Symbol('Heatmap grid renderer factory'),
    HeatmapExtensionFactory: Symbol('Heatmap extension factory')
};


export const UILabelRendererTargetName = {
    Perspective: Symbol('UILabel perspective renderer'),
    TextList: Symbol('UILabel for UITextList')
}
