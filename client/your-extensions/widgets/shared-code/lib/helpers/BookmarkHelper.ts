import { JimuMapView } from "jimu-arcgis";
import { RequestHelper, DbRegistryLoader, LayerDefinitionHelper, LayerHelper, FloorHelper } from "widgets/shared-code/helpers";
import ArcGISJSAPIModuleLoader from "./ArcGISJSAPIModuleLoader";
import SelectionManager from "widgets/shared-code/SelectionManager";
import { EConstants, EDbRegistryKeys } from "widgets/shared-code/enums";

export default class BookmarkHelper {
    private static readonly JSAPIModuleLoader = new ArcGISJSAPIModuleLoader(["Extent", "Bookmark", "Viewpoint"]);
    /**
     * - Nastavení viditelnosti a vybíratelnosti podvrstev a aktivního podlaží ze {@link bookmark záložky}.
     * @param jimuMapView - Aktivní view mapy.
     * @param bookmark - Záložka (uživatelské nastavení).
     * @param ignoreFloor - Má se nastavit aktivní podlaží ze {@link bookmark záložky}?
     */
    public static async applyBookmark(jimuMapView: JimuMapView, bookmark: __esri.Bookmark, applyFloor: boolean = true) {
        const layerSettings = BookmarkHelper.getBookmarkLayerSetting(bookmark);
        const selectableLayers: Array<HSI.SelectionStore.ILayerSelectability> = [];
    
        for (let layerSetting of layerSettings) {
            let sublayer = (await LayerDefinitionHelper.findSublayersByDefinition(jimuMapView, layerSetting.definition))[0];
            if (sublayer) {
                sublayer.visible = layerSetting.visible;
                selectableLayers.push({
                    gisId: LayerHelper.getGisIdLayersFromLayer(sublayer),
                    selectable: layerSetting.selectable
                });
            }
        }
    
        SelectionManager.getSelectionSet(jimuMapView).setSelectability(selectableLayers);
        if (applyFloor) {
            FloorHelper.setFloorValues(BookmarkHelper.getFloorValues(bookmark));
        }
    }
    
    /**
     * - Získání stavu viditelnosti a vybíratelnosti podvrstev ze záložky.
     * @param bookmark - Záložka (uživatelské nastavení).
     */
    public static getBookmarkLayerSetting(bookmark: __esri.Bookmark): HSI.DbRegistry.IBookmarksDbValue['userSettings'][0]['layers'] {
        return bookmark.get("hsi_layers_setting");
    }
    
    /**
     * - Získání uložených hodnot podlaží ze záložky.
     * @param bookmark - Záložka (uživatelské nastavení).
     */
    public static getFloorValues(bookmark: __esri.Bookmark): HSI.FloorHelper.IFloorValues {
        return bookmark.get("hsi_floor_setting") || {};
    }
    
    public static async createBookmark(jimuMapView: JimuMapView, userSetting: HSI.DbRegistry.IBookmarksDbValue['userSettings'][0]): Promise<__esri.Bookmark> {
        if (!BookmarkHelper.JSAPIModuleLoader.isLoaded) {
            await BookmarkHelper.JSAPIModuleLoader.load();
        }
        
        const bookmark = new (BookmarkHelper.JSAPIModuleLoader.getModule("Bookmark"))({
            viewpoint: new (BookmarkHelper.JSAPIModuleLoader.getModule("Viewpoint"))({
                rotation: userSetting.viewpoint.rotation,
                scale: userSetting.viewpoint.scale,
                targetGeometry: new (BookmarkHelper.JSAPIModuleLoader.getModule("Extent"))(userSetting.viewpoint.targetGeometry)
            }),
            name: userSetting.title,
            thumbnail: userSetting.thumbnail
        });
    
        BookmarkHelper.setFloors(bookmark, userSetting.floorSetting);
        await BookmarkHelper.setBookmarkLayerSetting(jimuMapView, bookmark, userSetting.layers);
    
        return bookmark;
    }
    
    /**
     * - Uložení stavu viditelnosti a vybíratelnosti podvrstev do záložky.
     * @param jimuMapView - Aktivní view mapy.
     * @param bookmark - Záložka (uživatelské nastavení).
     * @param layers - Viditelnost a vybíratelnost podvrstev.
     */
    public static async setBookmarkLayerSetting(jimuMapView: JimuMapView, bookmark: __esri.Bookmark, layers?: HSI.DbRegistry.IBookmarksDbValue['userSettings'][0]['layers']): Promise<void> {
        try {
            if (!Array.isArray(layers)) {
                const selectableLayers = SelectionManager.getSelectionSet(jimuMapView).selectionState.selectableLayers;
                const sublayers = LayerHelper.getAllSublayers(jimuMapView).toArray();
        
                layers = await Promise.all(sublayers.map(async sublayer => ({
                    visible: sublayer.visible,
                    selectable: selectableLayers.includes(LayerHelper.getGisIdLayersFromLayer(sublayer)),
                    definition: await LayerDefinitionHelper.getSublayerDefiniton(sublayer)
                })));
            }
        } catch(err) {
            console.warn(err);
            layers = [];
        }
        bookmark.set("hsi_layers_setting", layers);
    }
    
    /**
     * - Uložení hodnot podlaží do záložky.
     * @param bookmark - Záložka (uživatelské nastavení).
     */
    public static setFloors(bookmark: __esri.Bookmark, values: HSI.FloorHelper.IFloorValues): void {
        bookmark.set("hsi_floor_setting", values);
    }
    
};

/** - Objekt pro načítání a ukládání záložek. */
export class BookmarkConfigManager {
    /** - Aktuální view mapy. */
    private readonly _jimumapView: JimuMapView;
    /** - Klíč pod kterým je v databázovém registru uloženo nastavení pro toto prostředí. */
    private readonly _dbRegistryConfigKey: string;

    /** - Načtené záložky v databázovém registru. */
    private _bookmarkSettings: HSI.DbRegistry.IBookmarksDbValue;

    /**
     * - Objekt pro načítání a ukládání záložek.
     * @param jimumapView - Aktuální view mapy.
     * @param dbRegistryConfigKey - Klíč pod kterým je v databázovém registru uloženo nastavení pro toto prostředí.
     */
    constructor(jimumapView: JimuMapView, dbRegistryConfigKey: string) {
        this._jimumapView = jimumapView;
        this._dbRegistryConfigKey = dbRegistryConfigKey;
    }

    /** - Načtené záložky v databázovém registru. */
    public get bookmarkSettings(): typeof this._bookmarkSettings {
        return this._bookmarkSettings;
    }

    /** - Načtené záložky v databázovém registru. */
    private set bookmarkSettings(value: typeof this._bookmarkSettings) {
        this._bookmarkSettings = value;
    }

    /** - Načtění záložek z databázového registru. */
    public async loadBookmarkSettings(signal?: AbortSignal): Promise<void> {
        this.bookmarkSettings = await DbRegistryLoader.fetchDbRegistryValue(this._jimumapView, { type: "json", scope: "u", name: EDbRegistryKeys.Bookmarks, nameExtension: this._dbRegistryConfigKey }, signal);
    }

    /**
     * - Uložení záložek do databázového registru.
     * - Pokud byla přidána záložka s názvem {@link EConstants.startBookmarkName Start} a záložka s tímto názvem již existuje, zobrazí se notifikace uživateli a záložka se odstraní.
     * - Pokud byl upraven název záložky na {@link EConstants.startBookmarkName Start} a záložka s tímto názvem již existuje, zobrazí se notifikace uživateli a záložka se přejmenuje na původní název.
     * @param bookmarks - Záložky, které uklíádáme do databázového registru.
     * @param notifyDuplicitStartName - Funkce, která se zavolá pokud mají záložky duplicitní název {@link EConstants.startBookmarkName Start}.
     * @param signal - Signalizace zrušení dotazu.
     */
    public async saveBookmarks(bookmarks: __esri.Collection<__esri.Bookmark>, notifyDuplicitStartName: Function, signal?: AbortSignal): Promise<void> {
        /** - Mají záložky duplicitní název {@link EConstants.startBookmarkName Start}? */
        let duplicitStartName = false;

        if (bookmarks.length > 0 && Array.isArray(this.bookmarkSettings?.userSettings)) {
            /** - Počet záložek s názvem {@link EConstants.startBookmarkName Start}. */
            let startBookmarksCount = bookmarks.filter(bookmark => bookmark.name === EConstants.startBookmarkName).length;

            while (startBookmarksCount > 1) {
                /** - Index změněné záložky s názvem {@link EConstants.startBookmarkName Start}. */
                let startBookmarkIndex = bookmarks.findIndex((bookmark, index) => bookmark.name === EConstants.startBookmarkName && bookmark.name !== this.bookmarkSettings.userSettings[index]?.title);

                if (startBookmarkIndex !== -1) {
                    duplicitStartName = true;
                    let originalUserSetting = this.bookmarkSettings.userSettings[startBookmarkIndex];

                    if (!originalUserSetting) {
                        bookmarks.removeAt(startBookmarkIndex);
                    } else {
                        bookmarks.getItemAt(startBookmarkIndex).name = originalUserSetting.title;
                    }
                }
                startBookmarksCount--;
            }
        }

        const newBookmarkSettings: typeof this.bookmarkSettings = {
            userSettings: bookmarks.toArray().map(bookmark => ({
                viewpoint: bookmark.viewpoint.toJSON(),
                title: bookmark.name,
                floorSetting: BookmarkHelper.getFloorValues(bookmark),
                layers: BookmarkHelper.getBookmarkLayerSetting(bookmark),
                thumbnail: bookmark.thumbnail
            }))
        };

        await RequestHelper.setDbRegistryValue(this._jimumapView, { type: "json", scope: "u", name: EDbRegistryKeys.Bookmarks, value: newBookmarkSettings, nameExtension: this._dbRegistryConfigKey }, signal);

        this.bookmarkSettings = newBookmarkSettings;

        if (duplicitStartName) {
            notifyDuplicitStartName();
        }
    }
}
