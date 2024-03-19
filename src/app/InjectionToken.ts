export const InjectionToken = {
    WebGLRenderingContext: Symbol('webgl2 rendering context'),
    FontAtlas: Symbol('Font atlas'),
    IconAtlas: Symbol('Icon atlas'),
    FontAtlasTexture: Symbol('Font texture'),
    IconAtlasTexture: Symbol('Icon texture'),
    FontGlyphCollectionFactory: Symbol('Font glyph collection factory'),
    HeatmapGridRendererFactory: Symbol('Heatmap grid renderer factory'),
    HeatmapExtensionFactory: Symbol('Heatmap extension factory'),
    UITextListRendererFactory: Symbol('UITetList renderer factory'),
    CodeEditorServiceInputReceiverFactory: Symbol('CodeEditorServiceInputReceiver factory'),
    UIEditableTextListRendererFactory: Symbol('UIEditableTextListRenderer factory'),
    FileStorage: Symbol('File storage')
};


export const UILabelRendererTargetName = {
    Perspective: Symbol('UILabel perspective renderer'),
    Unique: Symbol('UILabel unique')
}

export const AppCommandInjectionToken = {
    EditCellCommandFactory: Symbol('EditCellCommand factory'),
    EditCellsRegionFactory: Symbol('EditCellsRegion factory')
};

export const EditCellCommandPostAction = {
    MoveNext: Symbol('MoveNext post action')
};

export const EditCellsRegionCommandPostAction = {
    MoveNext: Symbol('MoveNext post action'),
    StayLeftTop: Symbol('StayLeftTop post action')
};
