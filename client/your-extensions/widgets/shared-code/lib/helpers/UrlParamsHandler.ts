import { JimuMapView } from "jimu-arcgis";
import { DbRegistryLoader, ArcGISJSAPIModuleLoader, NotificationHelper, LayerDefinitionHelper, LayerHelper, FloorHelper, FeatureHelper, GeometryHelper, WidgetStateHelper } from "widgets/shared-code/helpers";
import SelectionManager from "widgets/shared-code/SelectionManager";
import { ImmutableObject, UrlParameters, appActions, getAppStore } from "jimu-core";
import { EConstants, EDbRegistryKeys } from "widgets/shared-code/enums";

export default class UrlParamsHandler {
    /**
     * - Vyvolání akcí na základě url parametrů.
     * - Po vyvolání akcí parametry odebere z URL.
     * @param jimuMapView - Aktivní view mapy, které widget používá.
     * @param queryObject - URL parametry. Pokud není definováno, tak se použijí parametry ze stavu aplikace.
     */
    public static async handleUrlParams(jimuMapView: JimuMapView, queryObject?: ImmutableObject<UrlParameters>) {
        try {
            const selection = UrlParamsHandler.parseUrlQueryJson<HSI.Feature.ISelectUrlQuery>(EConstants.selectUrl, queryObject);
            if (selection !== undefined) {
                await UrlParamsHandler.handleSelect(jimuMapView, selection);
                UrlParamsHandler.deleteUrlParameter(EConstants.selectUrl);
            }
            
            const extent = UrlParamsHandler.parseUrlQueryJson<__esri.ExtentProperties>(EConstants.extentUrl, queryObject);
            if (extent !== undefined) {
                await UrlParamsHandler.handleExtentParams(jimuMapView, extent);
                UrlParamsHandler.deleteUrlParameter(EConstants.extentUrl);
            }
    
            const floor = UrlParamsHandler.parseUrlQueryJson<HSI.FloorHelper.IFloorValues>(EConstants.floorUrl, queryObject);
            if (floor !== undefined) {
                FloorHelper.setFloorValues(floor);
                UrlParamsHandler.deleteUrlParameter(EConstants.floorUrl);
            }
        } catch(err) {
            console.warn(err);
            NotificationHelper.addNotification({ message: "Nastala chyba při čtení url parametrů", type: "error"});
        }
    }
    
    /**
     * - Odebrání {@link urlParameter parametru} z URL.
     * @param urlParameter - Parametr, který chceme odebrat z URL.
     */
    public static deleteUrlParameter(urlParameter: string): void {
        // const queryObject = getAppStore().getState().queryObject.asMutable();
        // delete queryObject[urlParameter];
        // getAppStore().dispatch(appActions.queryObjectChanged(queryObject));
        let url = new URL(location.href);
        url.searchParams.delete(urlParameter);
        history.pushState("", "", url);
    }
    
    /**
     * - Rozparsování objektu v URL.
     * @param parameterName - Klíč pod kterým je objekt v URL zapsán.
     * @param queryObject - URL parametry. Pokud není definováno, tak se použijí parametry ze stavu aplikace.
     */
    public static parseUrlQueryJson<T extends Object>(parameterName: string, queryObject?: ImmutableObject<UrlParameters> ): T {
        try {
            if (!queryObject) {
                queryObject = getAppStore().getState().queryObject;
            }
            const stringifiedQuery = queryObject?.getIn([parameterName]);
    
            if (typeof stringifiedQuery === "string") {
                const query = JSON.parse(stringifiedQuery);
                return query;
            }
        } catch(err) {
            console.warn(err);
            NotificationHelper.addNotification({ message: `URL parametr '${parameterName}' je ve špatném formátu`, type: "error" });
        }
    }
    
    /**
     * - Podle Url parametrů se přidají prvky do výběru, a nastaví se podle nich aktivní patro ve widgetu "FloorSwitch"
     * @param jimuMapView - Aktivní view mapy, které widget používá.
     * @param select - Parametry podle kterých se prvek vyhledá.
     */
    public static async handleSelect(jimuMapView: JimuMapView, select: HSI.Feature.ISelectUrlQuery): Promise<void> {
        if (!UrlParamsHandler.validate(select)) {
            return;
        }
    
        const layerInfo = await UrlParamsHandler.findLayerInfo(jimuMapView, select);
    
        if (!layerInfo) {
            return;
        }
    
        /** - Podmínka vyhledávání. */
        const where = await UrlParamsHandler.getWhereClause(jimuMapView, select, layerInfo.layer);
    
        if (!where) {
            return;
        }
    
        try {
    
            if (!layerInfo.isTable) {
                LayerHelper.toggleVisibility(layerInfo.layer as __esri.Sublayer, true);
            }
    
            //#region - Vyhledání prvků
            const featureSet = await layerInfo.layer.queryFeatures({ 
                where,
                returnGeometry: true,
                outSpatialReference: jimuMapView.view.spatialReference,
                outFields: ["*"],
                num: "featureId" in select ? 1 : undefined // Pokud je definováno 'featureId', pak očekáváme pouze jeden prvek.
            });
    
            if (featureSet.features.length < 1) {
                return NotificationHelper.addNotification({ type: "warning", message: `Parametry v url neodpovídají žádnému prvku.` });
            }
    
            /** - Prvky na které provedeme zoom, a podle kterých nastavíme podlaží. */
            let geometryFeatureSet: __esri.FeatureSet;
    
            if (layerInfo.isTable && featureSet.features.length === 1) {
                geometryFeatureSet = await FeatureHelper.queryGeometryFeatures(jimuMapView, featureSet.features[0]);
                if (!Array.isArray(geometryFeatureSet?.features)) {
                    geometryFeatureSet = featureSet;
                }
            } else {
                geometryFeatureSet = featureSet;
            }
    
            //#endregion
    
            //#region - Nastavení patra.
            FloorHelper.setFloorByFeatureSet(jimuMapView, geometryFeatureSet)
                .catch(err => {
                    console.warn(err);
                });
            //#endregion
    
            Promise.all([
                UrlParamsHandler.selectResult(jimuMapView, featureSet, geometryFeatureSet, layerInfo.isTable),
                UrlParamsHandler.drawResult(jimuMapView, geometryFeatureSet, layerInfo.isTable)
            ]);
    
        } catch(err) {
            console.warn(err);
            NotificationHelper.addNotification({ type: "error", message: `Při vyhledávíní prvků podle URL parametrů nastala chyba` });
        }
    }
    
    /**
     * - Nastavení rozsahu mapy.
     * @param jimuMapView - Aktivní view mapy, které widget používá.
     * @param extentJson - Parametry rozsahu mapy.
     */
    private static async handleExtentParams(jimuMapView: JimuMapView, extentJson: __esri.ExtentProperties): Promise<void> {
        try {
            await GeometryHelper.zoom(jimuMapView, [new (await ArcGISJSAPIModuleLoader.getModule("Extent"))(extentJson)], 1);
        } catch(err) {
            console.warn(err);
            NotificationHelper.addNotification({
                message: `Nepodařilo se nastavit výchozí rozsah mapy podle url parametrů`,
                type: "error"
            });
        }
    }
    
    /**
     * - Validace {@link select URL parametrů}.
     * - Pokud jsou parametry validní, vrací `true`, jinak vrací `false`.
     * @param select - URL parametry.
     */
    private static validate(select: HSI.Feature.ISelectUrlQuery): boolean {
        if (!("layerId" in select)) {
            NotificationHelper.addNotification({ type: "error", message: `Url parametr 'select' neobsahuje identifikaci vrstvy` });
            return false;
        }
    
        if (!("featureId" in select) && !("where" in select)) {
            NotificationHelper.addNotification({ type: "error", message: `Url parametr 'select' neobsahuje vyhledávací parametry` });
            return false;
        }
        return true;
    }
    
    /**
     * - Nalezení vrtvy ve které se vyhledává prvek.
     * @param jimuMapView - Aktivní view mapy, které widget používá.
     * @param select - Parametry podle kterých se prvek vyhledá.
     */
    public static async findLayerInfo(jimuMapView: JimuMapView, select: HSI.Feature.ISelectUrlQuery): Promise<ILayerInfo> {
        /** - Všechny mapové služby v mapě. */
        const allMapImageLayers = LayerHelper.getAllMapImageLayers(jimuMapView);
        /** - Podvrstva / Negrafická vrstva ve které hledáme prvek. */
        let layer: __esri.Sublayer | __esri.FeatureLayer;
        /** - Zdrojová mapová služba {@link layer vrstvy} ve které hledáme prvek. */
        let mapImageLayer: __esri.MapImageLayer;
    
        if (typeof select.mapServiceName === "string") {
            mapImageLayer = LayerHelper.getAllMapImageLayers(jimuMapView).find(layer => LayerHelper.getServiceName(layer) === select.mapServiceName);
    
            if (!mapImageLayer) {
                NotificationHelper.addNotification({ type: "error", message: `Mapová služba '${select.mapServiceName}' není v mapě` });
                return;
            }
        
            layer = mapImageLayer.findSublayerById(select.layerId);
        
            if (!!layer) {
                return { layer, isTable: false };
            }
        
            const mapImageLayerDefinition = await LayerDefinitionHelper.getMapImageLayerDefinition(mapImageLayer);
            
            layer = await LayerDefinitionHelper.findTablesByDefinition(jimuMapView, { ...mapImageLayerDefinition, layerId: select.layerId });
            if (!!layer) {
                return { isTable: true, layer };
            }
    
            NotificationHelper.addNotification({ type: "error", message: `Vrstva s id '${select.layerId}' není v mapové službě '${select.mapServiceName}'` });
        } else {
            for (let mapImageLayer of allMapImageLayers) {
                layer = mapImageLayer.findSublayerById(select.layerId);
                if (!!layer) {
                    return { layer, isTable: false };
                }
            
                const mapImageLayerDefinition = await LayerDefinitionHelper.getMapImageLayerDefinition(mapImageLayer);
                
                layer = await LayerDefinitionHelper.findTablesByDefinition(jimuMapView, { ...mapImageLayerDefinition, layerId: select.layerId });
                if (!!layer) {
                    return { isTable: true, layer };
                }
            }
            NotificationHelper.addNotification({ type: "error", message: `Vrstva s id '${select.layerId}' není ve webové mapě` });
        }
    
    }
    
    /**
     * - Vytvoření where klauzule z {@link select URL parametrů} podle které se vyhledává prvek.
     * @param jimuMapView - Aktivní view mapy, které widget používá. 
     * @param select - Parametry podle kterých se prvek vyhledá.
     * @param layer - Vrstva ve které se vyhlhedává prvek.
     */
    private static async getWhereClause(jimuMapView: JimuMapView, select: HSI.Feature.ISelectUrlQuery, layer: ILayerInfo['layer']): Promise<string> {
        if ("featureId" in select) {
            try {
                let IdFieldName = await DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.SelectFeatureIdAttribute, scope: "g", type: "string" });
    
                if (!IdFieldName) {
                    NotificationHelper.addNotification({ type: "warning", message: "V databázovém registru není uložený název atribitu, podle kterého se objekt vyhledává" });
                    return;
                }
    
                if (layer.loadStatus !== "loaded") {
                    await layer.load();
                }
    
                const IdField = layer.fields.find(field => FeatureHelper.compareFieldName(field, IdFieldName));
    
                if (!IdField) {
                    NotificationHelper.addNotification({ type: "warning", "message": `Vrstva '${layer.title}' neobsahuje pole '${IdFieldName}'` });
                    return;
                }
    
                return `${IdField.name}=${select.featureId}`;
            } catch(err) {
                console.warn(err);
                NotificationHelper.addNotification({ type: "error", message: "Při vyhledávání prvku nastala chyba" });
                return;
            }
        } else {
            return select.where;
        }
    }
    
    /**
     * - Přidání prvků do výběru a do pop-upu
     * @param jimuMapView - Aktivní view mapy, které widget používá. 
     * @param featureSet - Vyhledané prvky.
     * @param geometryFeatureSet - Prvky na které provedeme zoom, a podle kterých nastavíme podlaží.
     * @param isTable - Vyhledáváme negrafický prvek?.
     */
    private static async selectResult(jimuMapView: JimuMapView, featureSet: __esri.FeatureSet, geometryFeatureSet: __esri.FeatureSet, isTable: boolean) {
        await SelectionManager.getSelectionSet(jimuMapView).dropSelection();
        const [resultBehavior] = await Promise.all([
            UrlParamsHandler.getResultBehavior(jimuMapView, isTable),
            GeometryHelper.zoom(jimuMapView, geometryFeatureSet.features)
        ]);
    
        if (resultBehavior?.select !== false) {
            await SelectionManager.getSelectionSet(jimuMapView).addFetureSet(featureSet);
        }
    
        if (jimuMapView.view.popupEnabled) {
            const popupOptions: __esri.PopupOpenOptions = { features: featureSet.features };
    
            if (isTable) {
                const featuresWithGeometry = geometryFeatureSet.features.filter(feature => !!feature.geometry);
                if (featuresWithGeometry.length > 0) {
                    popupOptions.location = await ArcGISJSAPIModuleLoader.getModule("geometryEngineAsync")
                        .then(geometryEngine => {
                            return geometryEngine.union(featuresWithGeometry.map(feature => feature.geometry));
                        })
                        .then(geometry => {
                            return GeometryHelper.getExtent(geometry);
                        })
                        .then(extent => {
                            return extent.center;
                        })
                        .catch(err => {
                            console.warn(err);
                            return undefined;
                        })
                }
            }
    
            jimuMapView.view.popup.open(popupOptions);
        }
    }
    
    /**
     * - Poskytnutí nastavení zpracování výsledků.
     * @param jimuMapView - Aktivní view mapy, které widget používá.
     * @param isTable - Vyhledáváme negrafický prvek?.
     */
    private static async getResultBehavior(jimuMapView: JimuMapView, isTable: boolean) {
        const searchConfig = WidgetStateHelper.getWidgetConfigurationByName("Search")[0];
    
        const searchConfiguration = await DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.Search, scope: "g", type: "json", nameExtension: searchConfig?.[EConstants.searchConfigurationKey] });
    
        if (!!searchConfiguration?.resultBehavior) {
            const selectionSettingKey = searchConfig?.[EConstants.selectionSettingKey];
            let searchSetting = selectionSettingKey && selectionSettingKey in searchConfiguration.resultBehavior ? searchConfiguration.resultBehavior[selectionSettingKey] : searchConfiguration.resultBehavior.default;
            /** - Nastavení zobrazení výsledků vygledávání.*/
            return isTable ? searchSetting?.notGraphics : searchSetting?.graphics;
        }
    }
    
    /**
     * - Vykreslení geometrie do mapy, a odebrání geometrie při zavření pop-upu.
     * @param jimuMapView - Aktivní view mapy, které widget používá.  
     * @param geometryFeatureSet - Prvky na které provedeme zoom, a podle kterých nastavíme podlaží. 
     * @param isTable - Vyhledáváme negrafický prvek?. 
     */
    private static async drawResult(jimuMapView: JimuMapView, geometryFeatureSet: __esri.FeatureSet, isTable: boolean) {
        const [resultBehavior, searchConfiguration] = await Promise.all([
            UrlParamsHandler.getResultBehavior(jimuMapView, isTable),
            DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.Search, scope: "g", type: "json" })
        ]);
        if (resultBehavior?.display) {
            const symbol = await GeometryHelper.getFeatureSetSymbology(geometryFeatureSet, { color: new (await ArcGISJSAPIModuleLoader.getModule("Color"))(searchConfiguration.color) });
    
            const graphicsLayer = new (await ArcGISJSAPIModuleLoader.getModule("GraphicsLayer"))({
                graphics: geometryFeatureSet.features.map(feature => {
                    let featureCopy = feature.clone();
                    featureCopy.symbol = symbol;
                    return featureCopy;
                })
            });
    
            jimuMapView.view.map.add(graphicsLayer);
    
            const onClose = jimuMapView.view.popup.close.bind(jimuMapView.view.popup);
            const listener = jimuMapView.view.popup.watch("selectedFeature", () => {
                listener.remove();
                jimuMapView.view.map.remove(graphicsLayer);
                jimuMapView.view.popup.close = onClose;
            });
    
            jimuMapView.view.popup.close = (...args) => {
                listener.remove();
                jimuMapView.view.map.remove(graphicsLayer);
                jimuMapView.view.popup.close = onClose;
                onClose(...args);
            }
        }
    }
};


interface ILayerInfo {
    /**
     * - Je vrstva {@link layer} tabulkou?
     * - Vyhledáváme negrafický prvek?
     */
    isTable: boolean;
    /** - Podvrstva / Negrafická vrstva ve které hledáme prvek. */
    layer: __esri.Sublayer | __esri.FeatureLayer
}