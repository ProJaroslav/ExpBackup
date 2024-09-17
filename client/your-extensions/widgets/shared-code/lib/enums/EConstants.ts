/** - Konstantní hodnoty používané napříč aplikací. */
export enum EConstants {
    /** - Klíč pod kterým je uložena hodnota aktivního podlaží v {@link AllWidgetProps.stateProps} widgetu "FloorSwitch". */
    floorKey = 'floor',
    /** - URL parametr podle kterého dochází k přidání prvku do výběru. */
    selectUrl = 'select',
    /** - Název atributu, který určuje pomocný prvek, kterým se rotuje geometrie. */
    rotationHelpAttrinbute = "HSI_GEOMETRY_ROTATOR",
    /**
     * - Klíč pod kterým je v konfiguraci widgetu 'Search' uložen klíč, pod kterým je v DB registrech uloženo nastavení zobrazení výsledků vygledávání.
     * - @see {@link ISearchDbValue.resultBehavior}
     */
    selectionSettingKey = 'settingKey',
    /** - Rozšíření klíče pod kterým je v DB registrech uložena {@link ISearchDbValue konfigurace pro vyhledávání}. */
    searchConfigurationKey = 'configurationKey',
    /** - Klíč pod kterým je uloženo GISID vybrané vrstvy v {@link AllWidgetProps.stateProps} widgetu "FloorSwitch". */
    metadataActiveLayer = "selected",
    /**
     * - Hodnota vlastnosti "state" v tabulce {@link __esri.FeatureTable}, určujicí že je tabulka zcela načtena.
     * - Do verze 1.8 tato hodnota byla "ready".
     */
    attributeTableReadyState = "loaded",
    /** - Klíč pod kterým je v konfiguraci widgetu 'TableOfContents' uložen klíč, pod kterým je v DB registrech uloženo pořadí zobrazení vrstev. */
    tocSettingKey = 'dbRegistryConfigKey',
    /** - Název záložky (widget "UserSettings"), která se automaticky aplikuje při startu aplikace. */
    startBookmarkName = "Start",
    /** - URL parametr podle kterého dochází k přiblížení na rozsah mapy. */
    extentUrl = "extent",
    /** - URL parametr podle kterého dochází k přiblížení na rozsah mapy. */
    mapStateUrl = "mapstate",
    /**
     * - URL parametr podle kterého se změní DataSource mapového widgetu.
     * Specifický widget pro SD: environment-processor.
     */
    itemIdUrl = "itemId",
    /** - URL parametr podle kterého dochází k nastavení podlaží. */
    floorUrl = "floor",
    tabChannelRequest = "tab-channel-request"
}

export default EConstants;