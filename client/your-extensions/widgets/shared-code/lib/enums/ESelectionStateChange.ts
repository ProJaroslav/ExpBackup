/** - Typy změn state ve výběru. */
export enum ESelectionStateChange {
    /** - Načetl se seznam vrstev v mapě ve kterých lze provádět výběr. */
    LayersLoaded = "layers-loaded",
    /** - Zmenila se viditelnost vrstev. */
    LayerVisibilityChanged = "layers-visibility",
    /** - Nastala chyba při načítání seznamu vrstev v mapě ve kterých lze provádět výběr. */
    LayersLoadFailed = "layers-load-failed",
    /** - Začalo načítání seznamu vrstev v mapě ve kterých lze provádět výběr. */
    LayersLoadStart = "layers-load-start",
    /** - Uživatel kliknul na tlačítko pro zahájení výběru. */
    OnSelctButtonClicked = 'on-selct-button-clicked',
    /** - Přepnutí hodnoty {@link IGraphicSelectionState.keepActive}. */
    ToggleSelectionLock = 'toggle-selection-lock',
    /** - Byla vykreslena geometrie pro grafický výběr. */
    OnGeometryDraw = "on-geometry-draw",
    /** - Započal grafický výběr pomocí geometrie prvku/ů. */
    OnCopyFeatureStart = "on-geometry-draw",
    /** - Změna způsobu volby vrstev ve kterých se bude prováďet výběr. */
    SelectInOption = "select-in-option",
    /** - Změna typu geometrie podle které se prování výběr. */
    GeometryType = "geometry-type",
    /** - Změna způsobu získaní geometrie podle které se prování výběr. */
    GeometrySelect = "geometry-select",
    /** - Výběr prvku podle jehož geometrie se provede výběr. */
    SelectFeature = "select-feature",
    /** - Vybrání vrstvy ve které se bude prováďet výběr. */
    SelectLayer = "select-layer",
    /** - Změna aplikace výběru. */
    SelectionType = 'selection-type',
    /**
     * - Změna {@link IGraphicSelectionState.selectionType aplikace výběru} na {@link ESelectionType.Add přidat k výběru}.
     * - Pokud již hodnota je {@link ESelectionType.Add přidat k výběru} tak se přepne na {@link ESelectionType.New nový výběr}
     */
    AddSelectionType = "add-selection-type",
    /** - Změna {@link IGraphicSelectionState.selectionType prostorového operátoru}. */
    SelectionOperator = "selection-operator",
    /** - Změna velikosti {@link IGraphicSelectionState.bufferSize obalové zóny}. */
    Buffer = "buffer",
    /** - Byl smazán, nebo naplněn výběr. */
    SelectionChange = 'selection-change',
    /** - Změna stavu vykreslení geometrie bufferu do mapy {@link IGraphicSelectionState.drowBufferStatus}. */
    DrawBufferState = "draw-buffer",
    /** - Změna {@link IGraphicSelectionState.activeGeometrySelect způsobu získaní geometrie} a {@link IGraphicSelectionState.activeSelectInOption vrtev ve kterých se vyhledává} na výchozí hodnoty. */
    DefaultSetting = "reset",
    /** - Ukončení {@link IGraphicSelectionState.isSelecting aktivity} nástroje na grafický výběr. */
    ForceEndSelection = "force-end-selection"
};

export default ESelectionStateChange;