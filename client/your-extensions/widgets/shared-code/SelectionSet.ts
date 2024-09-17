import { JimuMapView } from "jimu-arcgis";
import { getAppStore, ImmutableObject } from "jimu-core";
import { ArcGISJSAPIModuleLoader, FeatureHelper, LayerDefinitionHelper, WidgetStateHelper,  MutableStoreManagerHelper, LayerHelper, SelectionHelper, NotificationHelper, GeometryHelper, DbRegistryLoader } from "widgets/shared-code/helpers";
import { EConstants, EDbRegistryKeys, EFeatureType, ESelectionActionKeys, ESelectionType, ESpatialRelation, ESublayerType } from "widgets/shared-code/enums";

export default class SelectionSet {
    /**
     * - JimuMapView aktivní mapy.
     * - Je potřeba protože aplikace může mít více map, a výběr mezi mapami nelze sdílet.
     * @see {@link https://developers.arcgis.com/experience-builder/api-reference/jimu-arcgis/JimuMapView}.
     */
    private readonly _jimuMapView: JimuMapView;
    public readonly name: string;
    /** - Maximální velikost výběru. */
    private _maxRecordCount = 1000;
    /** - Barva geometrie prvků ve výběru. */
    private _color: __esri.Color;
    private readonly JSAPIModuleLoader = new ArcGISJSAPIModuleLoader(['geometryEngineAsync', "GraphicsLayer"], true);

    constructor(jimuMapView: JimuMapView, name: string) {
        this._jimuMapView = jimuMapView;
        this.name = name;
        this.setInitialSelectability();
        this.loadDbConfig();
    }

    public async getColor(): Promise<__esri.Color> {
        if (!this._color) {
            const [Color, color] = await Promise.all([
                ArcGISJSAPIModuleLoader.getModule("Color"),
                DbRegistryLoader.fetchDbRegistryValue(this._jimuMapView, { name: EDbRegistryKeys.SelectionColor, scope: "g", type: "string" })
            ]);
            this._color = new Color(color || [0, 255, 255, 1]);
        }

        return this._color;
    }
    
    /** - Načtení konfigurace z DB registrů. */
    private async loadDbConfig() {
        try {
            const [maxRecordCount] = await Promise.all([
                DbRegistryLoader.fetchDbRegistryValue(this._jimuMapView, { name: EDbRegistryKeys.MaxSelectionCount, scope: "g", type: "int" }),
                this.getColor()
            ]);

            if (maxRecordCount) {
                this._maxRecordCount = maxRecordCount;
            }
        } catch(err) {
            console.warn(err);
        }
    }

    public get maxRecordCount(): number {
        return this._maxRecordCount;
    }

    /** - Unikátní klíč skupiny výběru složený z názvu skupiny a JimuMapView. */
    public get selectionSetKey(): string {
        return SelectionHelper.getSelectionSetKey(this._jimuMapView, this.name);
    }

    /** - Vrací true pokud ve výběru není žádný grafický prvek. */
    public get isGraphicEmpty(): boolean {
        return this.graphicFeatureSetKeys.every(featureSetKey => {
            let featureSet = MutableStoreManagerHelper.getFeatureSet(featureSetKey);
            return !Array.isArray(featureSet?.features) || featureSet.features.length < 1;
        });
    }

    /** - Současný stav v Reudx store. */
    public get selectionState(): ImmutableObject<HSI.ISelectionSetState> {
        return getAppStore().getState().hsiSelection.selectionSetDictionary[this.selectionSetKey];
    }

    /** - Kolekce identifikátorů všech skupin výběru. */
    private get featureSetKeys(): Array<string> {
        const tableSelectionKeys = Array.isArray(this.selectionState?.tableSelection) ? Object.values(this.selectionState.tableSelection).map(({ featureSetId }) => featureSetId) : [];
        return this.graphicFeatureSetKeys.concat(tableSelectionKeys);
    }

    /** - Kolekce identifikátorů všech skupin výběru grafických prvků (prvky z podvrstev). */
    private get graphicFeatureSetKeys(): Array<string> {
        if (!this.selectionState?.selection) {
            return [];
        }
        return Object.values(this.selectionState.selection).map(({ featureSetId }) => featureSetId);
    }

    /** - Kolekce všech grafických prvků ve výběru. */
    public get features(): Array<__esri.Graphic> {
        const featureCollections = this.graphicFeatureSetKeys.map(featureSetKey => {
            return MutableStoreManagerHelper.getFeatureSet(featureSetKey);
        });

        const features: Array<__esri.Graphic> = [];

        featureCollections.forEach(featureSet => {
            if (featureSet?.features?.length) {
                features.push(...featureSet.features);
            }
        })

        return features;
    }

    /** - Přiblížení se v mapě na vybrané prvky. */
    private async zoom(): Promise<void> {
        const autoZoom = await DbRegistryLoader.fetchDbRegistryValue(this._jimuMapView, { name: EDbRegistryKeys.SelectionAutoZoom, scope: "g", type: "bool" });
        if (autoZoom !== false) {
            return GeometryHelper.zoom(this._jimuMapView, this.features);
        }
    }

    /** - Hláška o překročení maximální velikosti výběru. */
    private maximumRecordCountExceeded(): void {
        NotificationHelper.addNotification({ message: "Byl překročen limit prvků ve výběru. Výběr byl omezen.", type: "warning" });
    }

    /** - Odeslání akce do Redux Store výběru.*/
    private dispatchAction(action: Omit<HSI.SelectionStore.ISelectionStartAction, "selectionSetKey"> | Omit<HSI.SelectionStore.ISelectionEndAction, "selectionSetKey"> | Omit<HSI.SelectionStore.IDropSelectionAction, "selectionSetKey"> | Omit<HSI.SelectionStore.IToggleSelectabilityAction, "selectionSetKey"> | Omit<HSI.SelectionStore.IRerenderAction, "selectionSetKey"> | Omit<HSI.SelectionStore.ISelectionFailAction, "selectionSetKey"> | Omit<HSI.SelectionStore.ITableSelectionEndAction, "selectionSetKey"> | Omit<HSI.SelectionStore.ITableSelectionFailAction, "selectionSetKey"> | Omit<HSI.SelectionStore.ITableSelectionStartAction, "selectionSetKey">) {
        action['selectionSetKey'] = this.selectionSetKey;
        getAppStore().dispatch(action);
    }

    /** - Otevírá widget pro zobrazení výběru. */
    private async openSelectionResultWidgets() {
        try {
            const widgetToOpen = await DbRegistryLoader.fetchDbRegistryValue(this._jimuMapView, { type: "string", scope: "g", name: EDbRegistryKeys.SelectionOpenWidget });
            if (widgetToOpen) {
                WidgetStateHelper.openWidgetsByName(widgetToOpen);
            }
        } catch(err) {
            console.warn(err);
        }
    }

    /**
     * - Poskytuje hodnotu rozšíření vyhledávání bodovou geometrií ve stopách, podle typu podvrstvy {@link sublayer}, nastavení v konfiguraci a podle současného měřítka mapy.
     * @param sublayer - Podvrsva ve které pro kterou hledáme hodnotu rozšíření.
     */
    private async getSublayerFeetDistance(sublayer: __esri.Sublayer): Promise<number> {
        const geometryType = await LayerHelper.getGeometryType(sublayer);

        let distanceInPixels: number;

        switch (geometryType) {
            case "esriGeometryEnvelope":
            case "esriGeometryPolygon":
                distanceInPixels = await DbRegistryLoader.fetchDbRegistryValue(this._jimuMapView, { name: EDbRegistryKeys.SelectionPolygonDistance, scope: "g", type: "double" });
                break;
            case "esriGeometryPolyline":
                distanceInPixels = await DbRegistryLoader.fetchDbRegistryValue(this._jimuMapView, { name: EDbRegistryKeys.SelectionPolylineDistance, scope: "g", type: "double" });
                break;
            case "esriGeometryPoint":
            case "esriGeometryMultipoint":
                distanceInPixels = await DbRegistryLoader.fetchDbRegistryValue(this._jimuMapView, { name: EDbRegistryKeys.SelectionPointDistance, scope: "g", type: "double" });
                break;
        }

        if (!distanceInPixels) {
            return 0;
        }

        if (!this.JSAPIModuleLoader.isLoaded) {
            await this.JSAPIModuleLoader.load();
        }

        const geometryEngine = this.JSAPIModuleLoader.getModule("geometryEngineAsync");

        const randomPoint = this._jimuMapView.view.extent.center;
        const nextPoint = randomPoint.clone();

        nextPoint.x += this._jimuMapView.view.resolution * distanceInPixels;

        return geometryEngine.distance(randomPoint, nextPoint, "feet");
    }

    /**
     * - Vytváří kruhovou geometrii se středem v {@link point}, a poloměrem z konfigurace v DB registrech, podle druhu geometrie podvrstvy {@link sublayer}.
     * @param point - Bod, který chceme obalit.
     * @param sublayer - Podvrsva ve které pro kterou hledáme hodnotu rozšíření.
     */
    private async bufferPointByDistance(point: __esri.Point, sublayer: __esri.Sublayer): Promise<__esri.Polygon | __esri.Point> {
        const feets = await this.getSublayerFeetDistance(sublayer);
        if (!feets) {
            return point;
        }

        if (!this.JSAPIModuleLoader.isLoaded) {
            await this.JSAPIModuleLoader.load();
        }

        const geometryEngine = this.JSAPIModuleLoader.getModule("geometryEngineAsync");

        const polygon = await geometryEngine.buffer(point, feets, "feet");

        if (Array.isArray(polygon)) {
            return polygon[0];
        }

        return polygon;
    }

    //#region Prostorový výběr

    /**
     * - Vytvoření prostorového dotazu.
     * - Z výsledku se vytvoří výběr.
     * @param geometry - Geometrie v jejímž rámci dotaz provádíme. 
     * @param sublayerGisIds - GisId (unikátní identifikátor složený z id vrstvy a z id její mapové služby) vrstev v nichž se dotaz provádí. 
     * @param spatialRelationship - Prostorový operátor. 
     * @param options - Specifikace výběru.
     */
    public async newGraphicSelection(geometry: __esri.Geometry, sublayerGisIds: string[], spatialRelationship: ESpatialRelation, options: HSI.IGraphicSelectionOptions): Promise<void> {
        this.openSelectionResultWidgets();
        const sublayers = this.startAction(sublayerGisIds, options, true);

        const allSublayers = await LayerHelper.getAllFeatureSublayers(this._jimuMapView);

        // Odebrání výběru
        for (let sublayer of allSublayers) {
            MutableStoreManagerHelper.dropFeatureSet(MutableStoreManagerHelper.createSublayerKey(this._jimuMapView, sublayer));
        }
        
        
        /** - Současná velikost výběru. */
        let selectionSize = 0;
        const abortController = new AbortController();

        /** - Prvky, které se zobrazí v pop-upu pokud je {@link options.showPopUp} true. */
        const popFeatures: Array<__esri.Graphic> = [];

        if (options.topOnly) {
            /** - Výsledky výběru z nejvyšší podvrstvy v mapě, ve které se nějaké výsledky podařilo najít. */
            var topFeatureSet: __esri.FeatureSet;
            /** - Podvrstvy ve kterých skončilo vyhledávání. */
            var finishedSublayers: Array<__esri.Sublayer> = [];
        }
        
        await Promise.all(sublayers.map(async sublayer => {
            try {
                const queryProperties: __esri.QueryProperties = {
                    geometry,
                    outFields: ["*"],
                    returnGeometry: true,
                    spatialRelationship,
                    outSpatialReference: this._jimuMapView.view.map.basemap.spatialReference,
                    num: this._maxRecordCount,
                    where: sublayer.definitionExpression,
                    units: "feet"
                };

                if (geometry.type === "point") {
                    queryProperties.distance = await this.getSublayerFeetDistance(sublayer);
                }

                let featureSet = await sublayer.queryFeatures(queryProperties, { signal: abortController.signal });
                if (options.topOnly) {
                    if (featureSet?.features?.length && (!topFeatureSet || LayerHelper.isHigher(this._jimuMapView, sublayer, LayerHelper.getSublayerFromFeature(topFeatureSet.features[0])))) {
                        if (topFeatureSet) {
                            this.dispatchAction({
                                sublayer: LayerHelper.getSublayerFromFeature(topFeatureSet.features[0]),
                                type: ESelectionActionKeys.SelectionEnd,
                                featureSetId: undefined
                            });
                        }
                        topFeatureSet = featureSet;
                        if (LayerHelper.isTopLayer(this._jimuMapView, sublayer, sublayers.filter(s => !finishedSublayers.includes(s)))) {
                            abortController.abort();
                        }
                    } else {
                        this.dispatchAction({
                            sublayer,
                            type: ESelectionActionKeys.SelectionEnd,
                            featureSetId: undefined
                        });
                    }
                    finishedSublayers.push(sublayer);
                } else {
                    let featureSetId: string;
                    if (featureSet?.features?.length) {
                        featureSetId = MutableStoreManagerHelper.createSublayerKey(this._jimuMapView, sublayer);
                        selectionSize += featureSet.features.length;
    
                        if (selectionSize >= this._maxRecordCount) {
                            let extraFeaturesCount = selectionSize - this._maxRecordCount;
                            featureSet.features.length = featureSet.features.length - extraFeaturesCount;
                            this.maximumRecordCountExceeded();
                            abortController.abort();
                        }
    
                        if (sublayer.popupEnabled && sublayer.popupTemplate) {
                            popFeatures.push(...featureSet.features);
                        }
    
    
                        MutableStoreManagerHelper.storeFeatureSet(featureSetId, featureSet);
                    }
                    this.dispatchAction({
                        sublayer,
                        type: ESelectionActionKeys.SelectionEnd,
                        featureSetId
                    });
                }
            } catch(err) {
                if (abortController.signal.aborted) {
                    this.dispatchAction({
                        sublayer,
                        type: ESelectionActionKeys.SelectionEnd,
                        featureSetId: undefined
                    });
                } else {
                    this.dispatchAction({
                        error: err,
                        type: ESelectionActionKeys.SelectionFail,
                        sublayer
                    });
                }
            }
        }));

        if (options.topOnly && topFeatureSet) {
            let sublayer = LayerHelper.getSublayerFromFeature(topFeatureSet.features[0]);
            let featureSetId = MutableStoreManagerHelper.createSublayerKey(this._jimuMapView, sublayer);
            if (topFeatureSet.features.length > this._maxRecordCount) {
                topFeatureSet.fields.length = this._maxRecordCount;
                this.maximumRecordCountExceeded();
            }
            MutableStoreManagerHelper.storeFeatureSet(featureSetId, topFeatureSet);

            popFeatures.push(...topFeatureSet.features);

            this.dispatchAction({
                sublayer,
                type: ESelectionActionKeys.SelectionEnd,
                featureSetId
            });
        }
        
        if (options.showPopUp && this._jimuMapView.view.popupEnabled) {
            if (popFeatures.length > 0) {
                this._jimuMapView.view.openPopup({
                    features: popFeatures.map(feature => feature.clone()),
                    location: geometry.type === "point" ? geometry as __esri.Point : geometry.extent?.center
                });
            } else {
                this._jimuMapView.view.popup.close();
            }
        }
    
        await this.zoom();
    }

    /**
     * - Vytvoření prostorového dotazu.
     * - Výsledek se přidá do výběru.
     * @param geometry - Geometrie v jejímž rámci dotaz provádíme. 
     * @param sublayerGisIds - GisId (unikátní identifikátor složený z id vrstvy a z id její mapové služby) vrstev v nichž se dotaz provádí. 
     * @param spatialRelationship - Prostorový operátor. 
     * @param options - Specifikace výběru.
     */
    public async expandGraphicSelection(geometry: __esri.Geometry, sublayerGisIds: string[], spatialRelationship: ESpatialRelation, options: HSI.IGraphicSelectionOptions): Promise<void> {
        if (!Array.isArray(sublayerGisIds) || !sublayerGisIds.length)
            return;

        /** - Současná velikost výběru. */
        let selectionSize = this.features.length;

        if (selectionSize >= this._maxRecordCount) {
            return this.maximumRecordCountExceeded();
        }

        /** - Vrstvy ve kterých provádíme výběr seřazené podle struktury webpamy. */
        const sublayers = this.startAction(sublayerGisIds, options);
    
        const abortController = new AbortController();

        /** - Prvky, které se zobrazí v pop-upu pokud je {@link options.showPopUp} true. */
        const popFeatures: Array<__esri.Graphic> = [];
        if (options.topOnly) {
            /** - Nejvyšší podvrstva v mapě, ve které se nějaké výsledky podařilo najít. */
            var topSuccessSublayer: __esri.Sublayer;
            /** - Výsledky výběru z nejvyšší podvrstvy v mapě, ve které se nějaké výsledky podařilo najít {@link topSuccessSublayer}. */
            var topFeatureSet: __esri.FeatureSet;
            /** - Podvrstvy ve kterých skončilo vyhledávání. */
            var finishedSublayers: Array<__esri.Sublayer> = [];
        }

        await Promise.all(sublayers.map(async sublayer => {
            let currentFeatureSet: __esri.FeatureSet;
            let featureSetId: string;
            try {
                let queryProperties: __esri.QueryProperties = {
                    geometry,
                    outFields: ["*"],
                    returnGeometry: true,
                    spatialRelationship,
                    outSpatialReference: this._jimuMapView.view.map.basemap.spatialReference,
                    where: sublayer.definitionExpression,
                    units: "feet"
                }

                if (geometry.type === "point") {
                    queryProperties.distance = await this.getSublayerFeetDistance(sublayer);
                }

                featureSetId = MutableStoreManagerHelper.createSublayerKey(this._jimuMapView, sublayer);
                currentFeatureSet = MutableStoreManagerHelper.getFeatureSet(featureSetId);
                
                if (currentFeatureSet?.features?.length) {
                    let where = `${sublayer.objectIdField} NOT IN (${currentFeatureSet.features.map(feature => feature.getObjectId()).join(",")})`;
                    if (!!queryProperties.where) {
                        where += ` AND (${queryProperties.where})`;
                    }
                    queryProperties.where = where;
                }
                
                let featureSet = await sublayer.queryFeatures(queryProperties, { signal: abortController.signal });
                if (options.topOnly) {
                    /** - Podařilo se v této podvrstvě {@link sublayer} najít nějaké výsledky? */
                    let hasResult = featureSet?.features?.length > 0;
                    //#region - Pokud se nenalezli žádné prvky, mohlo se stát, že by byl vybrán prvkek, který již ve výběru je. V tom případě se chceme zachoval stejně, jako by byli nalezené prvky.
                    if (!hasResult) {
                        currentFeatureSet = MutableStoreManagerHelper.getFeatureSet(featureSetId);
                        if (currentFeatureSet?.features?.length > 0) {
                            let comparisonMethod = await this.getGeometryComparisonMethod(spatialRelationship);
                            let comparisonGeometry = geometry.type === "point" ? await this.bufferPointByDistance(geometry as __esri.Point, sublayer) : geometry;

                            for (let index = 0; currentFeatureSet.features.length > index && !hasResult; index++) {
                                hasResult = await comparisonMethod(comparisonGeometry, currentFeatureSet.features[index].geometry);
                            }
                        }
                    }
                    //#endregion

                    if (hasResult && (!topSuccessSublayer || LayerHelper.isHigher(this._jimuMapView, sublayer, topSuccessSublayer))) {
                        //#region - Odeslání akce o ukončení výběru v dosud nejvyšší vrstvě.
                        if (!!topSuccessSublayer) {
                            let currentTopSublayerKey = MutableStoreManagerHelper.createSublayerKey(this._jimuMapView, topSuccessSublayer); 
                            this.dispatchAction({
                                sublayer: topSuccessSublayer,
                                type: ESelectionActionKeys.SelectionEnd,
                                featureSetId: MutableStoreManagerHelper.getFeatureSet(currentTopSublayerKey)?.features?.length ? currentTopSublayerKey : undefined
                            });
                        }
                        //#endregion
                        topFeatureSet = featureSet;
                        topSuccessSublayer = sublayer;
                    } else {
                        this.dispatchAction({
                            sublayer,
                            type: ESelectionActionKeys.SelectionEnd,
                            featureSetId: currentFeatureSet?.features?.length ? featureSetId : undefined
                        });
                    }
                    finishedSublayers.push(sublayer); 
                    if (LayerHelper.isTopLayer(this._jimuMapView, topSuccessSublayer, sublayers.filter(s => !finishedSublayers.includes(s)))) {
                        abortController.abort(); // Pokud nejvišší vrstva, ve které se podařilo najít nějaké výsledky, je výše než nedokončené vrstvy, tak se ukončí výběr.
                    }
                } else {
                    selectionSize += featureSet.features.length;
                    
                    if (selectionSize >= this._maxRecordCount) {
                        abortController.abort();
                        let extraFeaturesCount = selectionSize - this._maxRecordCount;
                        featureSet.features.length = featureSet.features.length - extraFeaturesCount;
                        this.maximumRecordCountExceeded();
                    }
    
                    popFeatures.push(...featureSet.features);
    
                    currentFeatureSet = MutableStoreManagerHelper.getFeatureSet(featureSetId);
                    if (currentFeatureSet?.features?.length) {
                        featureSet.features.push(...currentFeatureSet.features);
                    }
    
                    MutableStoreManagerHelper.storeFeatureSet(featureSetId, featureSet);
    
                    this.dispatchAction({
                        sublayer,
                        type: ESelectionActionKeys.SelectionEnd,
                        featureSetId
                    });
                }
            } catch(err) {
                if (abortController.signal.aborted) {
                    this.dispatchAction({
                        sublayer,
                        type: ESelectionActionKeys.SelectionEnd,
                        featureSetId: currentFeatureSet?.features?.length ? featureSetId : undefined
                    });
                } else {
                    this.dispatchAction({
                        error: err,
                        type: ESelectionActionKeys.SelectionFail,
                        sublayer
                    });
                }
            }
        }));

        if (options.topOnly && !!topFeatureSet && !!topSuccessSublayer) {
            const featureSetId = MutableStoreManagerHelper.createSublayerKey(this._jimuMapView, topSuccessSublayer);
            const currentFeatureSet = MutableStoreManagerHelper.getFeatureSet(featureSetId);
            selectionSize += topFeatureSet.features.length;
            if (selectionSize > this._maxRecordCount) {
                let extraFeaturesCount = selectionSize - this._maxRecordCount;
                topFeatureSet.features.length = topFeatureSet.features.length - extraFeaturesCount;
                this.maximumRecordCountExceeded();
            }

            if (currentFeatureSet?.features?.length) {
                topFeatureSet.features.push(...currentFeatureSet.features);
            }
            MutableStoreManagerHelper.storeFeatureSet(featureSetId, topFeatureSet);

            popFeatures.push(...topFeatureSet.features);

            this.dispatchAction({
                sublayer: topSuccessSublayer,
                type: ESelectionActionKeys.SelectionEnd,
                featureSetId
            });
        }
        
        if (options.showPopUp && this._jimuMapView.view.popupEnabled) {
            if (popFeatures.length > 0) {
                this._jimuMapView.view.openPopup({
                    features: popFeatures.map(feature => feature.clone()),
                    location: geometry.type === "point" ? geometry as __esri.Point : geometry.extent?.center
                });
            } else {
                this._jimuMapView.view.popup.close();
            }
        }
    
        await this.zoom();
    }

    /**
     * - Filtrace prvků ve výběru.
     * @param geometry - Geometrie v jejímž rámci dotaz provádíme. Prvky mimo tuto geometrii budou odebrány z výběru. 
     * @param sublayerGisIds - GisId (unikátní identifikátor složený z id vrstvy a z id její mapové služby) vrstev v nichž se dotaz provádí. Prvky z ostatních vrstev budou odebrány z výběru.
     * @param spatialRelationship - Prostorový operátor. 
     */
    public async reduceGraphicSelection(geometry: __esri.Geometry, sublayerGisIds: string[], spatialRelationship: ESpatialRelation, options: Pick<HSI.IGraphicSelectionOptions, "topOnly">): Promise<void> {
        sublayerGisIds = LayerHelper.orderLayer(this._jimuMapView, sublayerGisIds);
        const sublayers = sublayerGisIds.map(sublayerGisId => LayerHelper.getSublayerByGisId(this._jimuMapView, sublayerGisId));
        const featureSetKeys = sublayers.map(sublayer => MutableStoreManagerHelper.createSublayerKey(this._jimuMapView, sublayer));

        this.featureSetKeys
            .filter(featureSetKey => featureSetKey && !featureSetKeys.includes(featureSetKey))
            .forEach(MutableStoreManagerHelper.dropFeatureSet);

        this.dispatchAction({
            sublayers,
            type: ESelectionActionKeys.SelectionStart,
            dropSelection: true
        });

        const comparisonMethod = await this.getGeometryComparisonMethod(spatialRelationship);

        /**
         * - Má se zbytek výběru vynulovat?
         * - Používá se pouze pokud je {@link options.topOnly}.
         */
        let dropRest = false;

        for (let sublayer of sublayers) {
            try {
                let featureSetId = MutableStoreManagerHelper.createSublayerKey(this._jimuMapView, sublayer);
                let featureSet = MutableStoreManagerHelper.getFeatureSet(featureSetId);

                if (dropRest) {
                    MutableStoreManagerHelper.dropFeatureSet(featureSetId);
                    featureSet = null;
                    featureSetId = undefined;
                } else if (featureSet?.features?.length) {
                    let features: Array<__esri.Graphic> = [];

                    let comparisonGeometry = geometry.type === "point" ? await this.bufferPointByDistance(geometry as __esri.Point, sublayer) : geometry;
                    
                    await Promise.all(featureSet.features.map(async feature => {
                        let contains = await comparisonMethod(comparisonGeometry, feature.geometry);
                        if (contains) {
                            features.push(feature);
                        }
                    }));

                    if (features.length > 0) {
                        featureSet.features = features;
                        if (options.topOnly) {
                            dropRest = true;
                        }
                    } else {
                        MutableStoreManagerHelper.dropFeatureSet(featureSetId);
                        featureSet = null;
                        featureSetId = undefined;
                    }
                }
    
                this.dispatchAction({
                    featureSetId,
                    sublayer,
                    type: ESelectionActionKeys.SelectionEnd
                });
    
                if (featureSet) {
                    MutableStoreManagerHelper.storeFeatureSet(featureSetId, featureSet);
                }
            } catch(err) {
                this.dispatchAction({
                    error: err,
                    type: ESelectionActionKeys.SelectionFail,
                    sublayer
                });
            }
        }

        await this.zoom();
    }

    /**
     * - Odebrání prvků z výběru.
     * @param geometry - Geometrie v jejímž rámci odebíráme prvky. 
     * @param sublayerGisIds - GisId (unikátní identifikátor složený z id vrstvy a z id její mapové služby) vrstev ve kterých odebíráme prvky. 
     * @param spatialRelationship - Prostorový operátor.  
     */
    public async removeGraphicSelection(geometry: __esri.Geometry, sublayerGisIds: string[], spatialRelationship: ESpatialRelation, options: Pick<HSI.IGraphicSelectionOptions, "topOnly">): Promise<void> {
        const sublayers = this.startAction(sublayerGisIds);

        const comparisonMethod = await this.getGeometryComparisonMethod(spatialRelationship);

        /**
         * - Má zbytek výběru zůstat v původním stavu?.
         * - Používá se pouze pokud je {@link options.topOnly}.
         */
        let ignoreRest = false;

        for (let sublayer of sublayers) {
            try {
                let featureSetId = MutableStoreManagerHelper.createSublayerKey(this._jimuMapView, sublayer);
                let featureSet = MutableStoreManagerHelper.getFeatureSet(featureSetId);
    
                if (!ignoreRest && featureSet?.features?.length) {
                    let features: Array<__esri.Graphic> = [];
                    let featuresToDestroy: Array<__esri.Graphic> = [];
    
                    let comparisonGeometry = geometry.type === "point" ? await this.bufferPointByDistance(geometry as __esri.Point, sublayer) : geometry;
    
                    await Promise.all(featureSet.features.map(async feature => {
                        let contains = await comparisonMethod(comparisonGeometry, feature.geometry);
                        if (contains) {
                            featuresToDestroy.push(feature);
                        } else {
                            features.push(feature);
                        }
                    }));
    
                    featureSet.features = features;
                    MutableStoreManagerHelper.storeFeatureSet(featureSetId, featureSet);
                    if (options.topOnly && featuresToDestroy.length > 0) {
                        ignoreRest = true;
                    }
                } else {
                    MutableStoreManagerHelper.dropFeatureSet(featureSetId);
                    featureSetId = undefined;
                }
    
                this.dispatchAction({
                    featureSetId,
                    sublayer,
                    type: ESelectionActionKeys.SelectionEnd
                });
            } catch(err) {
                this.dispatchAction({
                    error: err,
                    type: ESelectionActionKeys.SelectionFail,
                    sublayer
                });
            }
        }

        await this.zoom();
    }

    /**
     * - Grafický výběr prvků.
     * @param geometry - Geometrie v jejímž rámci dotaz provádíme. 
     * @param sublayerGisIds - GisId (unikátní identifikátor složený z id vrstvy a z id její mapové služby) vrstev v nichž se dotaz provádí. 
     * @param spatialRelationship - Prostorový operátor. 
     * @param selectionType - Aplikace vybraných prvků.
     * @param options - Specifikace výběru.
     */
    public async graphicSelection(geometry: __esri.Geometry, sublayerGisIds: string[], spatialRelationship: ESpatialRelation, selectionType: ESelectionType, options: HSI.IGraphicSelectionOptions = {}): Promise<void> {
        switch(selectionType) {
            case ESelectionType.Add:
                return this.expandGraphicSelection(geometry, sublayerGisIds, spatialRelationship, options);
            case ESelectionType.New:
                return this.newGraphicSelection(geometry, sublayerGisIds, spatialRelationship, options);
            case ESelectionType.Reduce:
                return this.reduceGraphicSelection(geometry, sublayerGisIds, spatialRelationship, options);
            case ESelectionType.Remove:
                return this.removeGraphicSelection(geometry, sublayerGisIds, spatialRelationship, options);
            default:
                throw new Error(`Unhandled selection type '${selectionType}'`);
        }
    }

    //#endregion

    /**
     * - Přepnutí vybíratelnosti vrstev.
     * @param layers - Kolekce změn vybíratelnosti.
     */
    public setSelectability(layers: Array<HSI.SelectionStore.ILayerSelectability>): void {
        this.dispatchAction({
            layers,
            type: ESelectionActionKeys.ToggleSelectability
        });
    }

    /**
     * - Poskytuje výběr {@link gisId podvrtvy}.
     * @param gisId - GisId podvrtvy ke které hledáme výběr.
     */
    public getFeatureSetBySublayerId(gisId: string): __esri.FeatureSet {
        const sublayer = LayerHelper.getSublayerByGisId(this._jimuMapView, gisId);

        const featureSetId = MutableStoreManagerHelper.createSublayerKey(this._jimuMapView, sublayer);

        return MutableStoreManagerHelper.getFeatureSet(featureSetId);
    }

    /**
     * - Poskytuje výběr {@link id nechrafické vrtvy}.
     * @param id - ID vrtvy/tabulky ke které hledáme výběr.
     */
    public getFeatureSetByTableId(gisId: string): __esri.FeatureSet {
        const table = LayerHelper.getTableById(this._jimuMapView, gisId);

        const featureSetId = MutableStoreManagerHelper.createTableKey(this._jimuMapView, table);

        return MutableStoreManagerHelper.getFeatureSet(featureSetId);
    }

    /**
     * - Přidání / odebrání prvků z jedné podvrstvy.
     * @param layer - GisId podvrstvy ze které prvky pochází.
     * @param featuresToAdd - Identifikátory prvků, které chceme přidat do výběru.
     * @param featuresToRemove - Identifikátory prvků, které chceme odebrat z výběru.
     */
    public async updateByFeatureIds(layer: string, featuresToAdd: Array<number>, featuresToRemove: Array<number> = []) {
        if (!Array.isArray(featuresToAdd) || featuresToAdd.length < 1) {
            featuresToAdd = null;
        }

        if (!Array.isArray(featuresToRemove) || featuresToRemove.length < 1) {
            featuresToRemove = null;
        }

        if (!featuresToAdd && !featuresToRemove) {
            return;
        }

        const sublayer = LayerHelper.getSublayerByGisId(this._jimuMapView, layer);

        const featureSetId = MutableStoreManagerHelper.createSublayerKey(this._jimuMapView, sublayer);

        const featureSet = MutableStoreManagerHelper.getFeatureSet(featureSetId);

        const features = featureSet?.features || [];

        const toRemove = Array.isArray(featuresToRemove) ? features.filter(feature => featuresToRemove.includes(feature.getObjectId())) : [];
        featuresToAdd = featuresToAdd?.filter(featureId => features.findIndex(feature => feature.getObjectId() === featureId) === -1);

        if (toRemove.length > 0) {
            await this.destroyFeature(toRemove);
        }

        if (featuresToAdd?.length > 0) {
            try {
                this.dispatchAction({
                    type: ESelectionActionKeys.SelectionStart,
                    sublayers: [sublayer],
                    dropSelection: false
                });
    
                const newFeatureSet = await sublayer.queryFeatures({
                    objectIds: featuresToAdd,
                    returnGeometry: true,
                    outFields: ["*"]
                });
                
                newFeatureSet.features.push(...features);

                MutableStoreManagerHelper.storeFeatureSet(featureSetId, newFeatureSet);
    
                this.dispatchAction({
                    type: ESelectionActionKeys.SelectionEnd,
                    featureSetId,
                    sublayer
                });
            } catch(err) {
                this.dispatchAction({
                    type: ESelectionActionKeys.SelectionFail,
                    error: err,
                    sublayer
                });                
            }
        }
    }

    /**
     * - Přidání / odebrání prvků z jedné negrafické vrstvy (tabulky).
     * @param tableId - Identifikátor vrstvy.
     * @param featuresToAdd - Identifikátory prvků, které chceme přidat do výběru. 
     * @param featuresToRemove - Identifikátory prvků, které chceme odebrat z výběru. 
     */
    public async updateByTableFeatureIds(tableId: string, featuresToAdd: Array<number>, featuresToRemove: Array<number> = []): Promise<void> {
        if (!Array.isArray(featuresToAdd)) {
            featuresToAdd = null;
        }

        if (!Array.isArray(featuresToRemove)) {
            featuresToRemove = null;
        }

        if (!featuresToAdd && !featuresToRemove) {
            return;
        }
        
        const table = LayerHelper.getTableById(this._jimuMapView, tableId);

        const featureSetId = MutableStoreManagerHelper.createTableKey(this._jimuMapView, table);

        const featureSet = MutableStoreManagerHelper.getFeatureSet(featureSetId);

        const features = featureSet?.features || [];
        const toRemove = features.filter(feature => featuresToRemove.includes(feature.getObjectId()));
        featuresToAdd = featuresToAdd?.filter(featureId => features.findIndex(feature => feature.getObjectId() === featureId) === -1);

        if (toRemove.length > 0) {
            this.destroyTableFeature(toRemove);
        }

        if (featuresToAdd?.length > 0) {
            try {
                this.dispatchAction({
                    type: ESelectionActionKeys.TableSelectionStart,
                    tables: [table],
                    dropSelection: false
                });
        
                const newFeatureSet = await table.queryFeatures({
                    objectIds: featuresToAdd,
                    returnGeometry: true,
                    outFields: ["*"]
                });
    
                newFeatureSet.features.push(...features);
        
                MutableStoreManagerHelper.storeFeatureSet(featureSetId, newFeatureSet);
        
                this.dispatchAction({
                    type: ESelectionActionKeys.TableSelectionEnd,
                    featureSetId,
                    table
                });
            } catch(error) {
                this.dispatchAction({
                    type: ESelectionActionKeys.TableSelectionFail,
                    error,
                    table
                });
            }
        }

    } 

    /** - Odebrání všech prvků z výběru. */
    public async dropSelection(): Promise<void> {
        for (let featureSetKey of this.featureSetKeys) {
            MutableStoreManagerHelper.dropFeatureSet(featureSetKey);
        }

        this.dispatchAction({ type: ESelectionActionKeys.DropSelection });

        const closeWidgetName = await DbRegistryLoader.fetchDbRegistryValue(this._jimuMapView, { name: EDbRegistryKeys.SelectionDropWidget, scope: "g", type: "string" });
        if (closeWidgetName) {
            WidgetStateHelper.closeWidgetsByName(closeWidgetName);
        }

    }

    /**
     * - Přidání skupiny prvků {@link featureSet} do výběru.
     * - Skukpina může být složená z grafikých nebo negrafických prvků (ne obojí).
     * @param featureSet - Skupina prvků.
     * @param drop - Chceme odstranit předchozí výběr vrstvy, ze které pochází prvky {@link featureSet}.
     */
    public async addFetureSet(featureSet: __esri.FeatureSet, drop: boolean = false): Promise<void> {
        if (!featureSet?.features?.length) {
            return;
        }

        if (featureSet.exceededTransferLimit || featureSet.features.length > this.maxRecordCount) {
            this.maximumRecordCountExceeded();
            if (featureSet.features.length > this.maxRecordCount) {
                featureSet.features.length = this.maxRecordCount;
            } 
        }

        if (FeatureHelper.getFeatureType(featureSet.features[0]) === EFeatureType.Sublayer) {
            const sublayer = LayerHelper.getSublayerFromFeature(featureSet.features[0]);
    
            try {
                this.dispatchAction({ type: ESelectionActionKeys.SelectionStart, sublayers: [sublayer] });
    
                const featureSetId = MutableStoreManagerHelper.createSublayerKey(this._jimuMapView, sublayer);
                let originalFeatureSet = MutableStoreManagerHelper.getFeatureSet(featureSetId);
                if (!originalFeatureSet) {
                    originalFeatureSet = featureSet;
                } else if (drop) {
                    await this.destroyFeature(originalFeatureSet.features);
                    originalFeatureSet = featureSet;
                } else {
                    const originalIds = originalFeatureSet.features.map(feature => feature.getObjectId());
                    featureSet.features = featureSet.features.filter(feature => !originalIds.includes(feature.getObjectId()));
                    originalFeatureSet.features.push (...featureSet.features);
                }
                
                MutableStoreManagerHelper.storeFeatureSet(featureSetId, originalFeatureSet);
    
                this.dispatchAction({ type: ESelectionActionKeys.SelectionEnd, featureSetId, sublayer });
            } catch(err) {
                console.warn(err);
                this.dispatchAction({
                    error: err,
                    type: ESelectionActionKeys.SelectionFail,
                    sublayer
                });
            }
        } else {
            const table = LayerHelper.getTableFromFeature(featureSet.features[0]);
    
            try {
                this.dispatchAction({ type: ESelectionActionKeys.TableSelectionStart, tables: [table] });
    
                const featureSetId = MutableStoreManagerHelper.createTableKey(this._jimuMapView, table);
                let originalFeatureSet = MutableStoreManagerHelper.getFeatureSet(featureSetId);
                if (!originalFeatureSet || drop) {
                    originalFeatureSet = featureSet;
                } else {
                    const originalIds = originalFeatureSet.features.map(feature => feature.getObjectId());
                    featureSet.features = featureSet.features.filter(feature => !originalIds.includes(feature.getObjectId()));
                    originalFeatureSet.features.push (...featureSet.features);
                }
                
                MutableStoreManagerHelper.storeFeatureSet(featureSetId, originalFeatureSet);
    
                this.dispatchAction({ type: ESelectionActionKeys.TableSelectionEnd, featureSetId, table });
            } catch(err) {
                console.warn(err);
                this.dispatchAction({
                    error: err,
                    type: ESelectionActionKeys.TableSelectionFail,
                    table
                });
            }

        }
    }

    /**
     * - Odebrání grafického prvku nebo prvků z výběru.
     * @param feature - Prvek který chceme odebrat z výběru.
     */
    public async destroyFeature(feature: __esri.Graphic): Promise<void>;
    /**
     * - Odebrání grafických prvků z výběru.
     * - Všechny prvky musejí pocházet z jedné podvrstvy!
     * @param features - Prvky které chceme odebrat z výběru.
     */
    public async destroyFeature(features: Array<__esri.Graphic>): Promise<void>;
    /**
     * - Odebrání grafického prvku / grafických prvků z výběru.
     * - Všechny prvky musejí pocházet z jedné podvrstvy!
     * @param features - Prvky které chceme odebrat z výběru.
     */
    public async destroyFeature(features: __esri.Graphic | Array<__esri.Graphic>): Promise<void> {
        if (!Array.isArray(features)) {
            return this.destroyFeature([features]);
        }

        if (!features[0]) {
            return;
        }

        const key = MutableStoreManagerHelper.createSublayerKey(this._jimuMapView, LayerHelper.getSublayerFromFeature(features[0]));
        const featureSet = MutableStoreManagerHelper.getFeatureSet(key);
        featureSet.features = featureSet.features.filter(graphic => !features.includes(graphic));

        this.dispatchAction({ type: ESelectionActionKeys.Rerender });
    }

    /**
     * - Odebrání negrafického prvku z výběru.
     * - Všechny prvky musejí pocházet z jedné vrstvy!
     * @param feature - Prvek který chceme odebrat z výběru.
     */
    public destroyTableFeature(feature: __esri.Graphic | Array<__esri.Graphic>): void {
        if (!Array.isArray(feature)) {
            return this.destroyTableFeature([feature]);
        }

        const key = MutableStoreManagerHelper.createTableKey(this._jimuMapView, LayerHelper.getTableFromFeature(feature[0]));
        const featureSet = MutableStoreManagerHelper.getFeatureSet(key);
        featureSet.features = featureSet.features.filter(graphic => !feature.includes(graphic));

        this.dispatchAction({ type: ESelectionActionKeys.Rerender });
    }

    /**
     * - Odebrání všech prvků ve výběru z jedné podvrstvy.
     * @param gisId - GisId podvrstvy.
     */
    public async destroyFeatureSet(gisId: string): Promise<void> {
        const sublayer = LayerHelper.getSublayerByGisId(this._jimuMapView, gisId);
        const featureSetKey = MutableStoreManagerHelper.createSublayerKey(this._jimuMapView, sublayer);

        MutableStoreManagerHelper.dropFeatureSet(featureSetKey);

        this.dispatchAction({
            featureSetId: null,
            sublayer,
            type: ESelectionActionKeys.SelectionEnd
        });
    }

    /**
     * - Odebrání všech prvků ve výběru z jedné negrafické vrstvy (tabulky).
     * @param id - Id vrstvy.
     */
    public async destroyTableFeatureSet(id: string): Promise<void> {
        const table = LayerHelper.getTableById(this._jimuMapView, id);
        const featureSetKey = MutableStoreManagerHelper.createTableKey(this._jimuMapView, table);

        MutableStoreManagerHelper.dropFeatureSet(featureSetKey);

        this.dispatchAction({
            featureSetId: null,
            table,
            type: ESelectionActionKeys.TableSelectionEnd
        });
    }

    /**
     * - Uložení incormace o probíhajicím výběru do Redux store.
     * - Vrací vrstvy ve kterých provádíme výběr seřazené podle struktury webpamy.
     * @param sublayerGisIds - GisId (unikátní identifikátor složený z id vrstvy a z id její mapové služby) vrstev ve kterých provádíme výběr. 
     * @param options - Specifikace výběru.
     * @param dropSelection - Chceme odebrat záznamy o výběru z ostatních vrstev?
     */
    private startAction(sublayerGisIds: string[], options: HSI.IGraphicSelectionOptions = {}, dropSelection?: boolean): Array<__esri.Sublayer> {
        if (options.selectableOnly) {
            let selectableIds = this.selectionState.selectableLayers;
            sublayerGisIds = sublayerGisIds.filter(gisId => selectableIds.includes(gisId));
        }

        let sublayers = sublayerGisIds.map(sublayerGisId => LayerHelper.getSublayerByGisId(this._jimuMapView, sublayerGisId));

        if (options.vissibleOnly) {
            sublayers = sublayers.filter(sublayer => LayerHelper.isVisible(sublayer, this._jimuMapView.view.scale));
        }

        this.dispatchAction({
            sublayers,
            type: ESelectionActionKeys.SelectionStart,
            dropSelection
        });

        return LayerHelper.orderLayer(this._jimuMapView, sublayers);
    }

    /**
     * - Poskytuje metodu na porovnání geometrií.
     * @param spatialRelationship - Prostorový operátor.
     */
    private async getGeometryComparisonMethod(spatialRelationship: ESpatialRelation): Promise<(g1: __esri.Geometry, g2: __esri.Geometry) => Promise<boolean>> {
        if (!this.JSAPIModuleLoader.isLoaded) {
            await this.JSAPIModuleLoader.load();
        }
    
        switch(spatialRelationship) {
            case ESpatialRelation.Contains:
                return this.JSAPIModuleLoader.getModule("geometryEngineAsync").contains;
            case ESpatialRelation.Intersects:
                return this.JSAPIModuleLoader.getModule("geometryEngineAsync").intersects;
            default:
                throw new Error(`Unhandled statial relationship '${spatialRelationship}'`);
        }
    }

    /** - Naslavení vybíratelnosti podvrstev podle jejich viditelnosti. */
    private async setInitialSelectability() {
        try {
            await LayerHelper.loadAccessibleLayers(this._jimuMapView);
            /** - Všechny podvrstvy v mapě. */
            const allSublayers = LayerHelper.getAllSublayers(this._jimuMapView);
            /** - Všechny podvrstvy v mapě, které jsou ve výchozím stavu vybíratelné. */
            const selectableSublayers: Array<__esri.Sublayer> = [];
            await Promise.all(LayerHelper.getAllSublayers(this._jimuMapView)
                .map(sublayer => sublayer.load())
                .toArray()
            );

            /** - Proběhno naplnění {@link selectableSublayers vybíratelných vrstev}? */
            let isVisibilityFilled = false;
            if (WidgetStateHelper.containsWidgetWithName("TableOfContents")) {
                /** - Konfigurace z DB registrů pro widget 'TableOfContents' */
                const tocConfig = await DbRegistryLoader.fetchDbRegistryValue(this._jimuMapView, { name: EDbRegistryKeys.TableOfContents, scope: "g", type: "json" });
                if (!!tocConfig) {
                    /** - Konfigurace všech widgetů "TableOfContents" widgetů v aplikaci. */
                    const tocConfigs = WidgetStateHelper.getWidgetConfigurationByName("TableOfContents");
                    /** - Klíč pod kterým je v {@link tocConfig DB registech} definována {@link tocSetting struktura widgetu "TableOfContents"}. */
                    const settingKey = tocConfigs?.find(config => !!config?.[EConstants.tocSettingKey] && config?.[EConstants.tocSettingKey] in tocConfig)?.[EConstants.tocSettingKey] as string;
                    /** - Struktura widgetu "TableOfContents". */
                    const tocSetting = tocConfig[settingKey];

                    if (!!tocSetting) {
                        const allSublayersDefinitions = await Promise.all(allSublayers.map(LayerDefinitionHelper.getSublayerDefiniton));
                        
                        function selectabilityChecker(layerStructureChildren: typeof tocSetting.layerStructure) {
                            if (Array.isArray(layerStructureChildren)) {
                                for (let layerStructureItem of layerStructureChildren) {
                                    if (!!layerStructureItem && "selectableByDefault" in layerStructureItem) {
                                        isVisibilityFilled = true; // Pokud je v nastavení nějaké vrstvy "selectableByDefault", víme, že se vybíratelnost má řídit konfigurací z DB registů.
                                        if (layerStructureItem.selectableByDefault) {
                                            const selectableSublayerIndex = allSublayersDefinitions.findIndex(sublayerDefinition => "layerId" in layerStructureItem.layer && LayerDefinitionHelper.matchDefinition(sublayerDefinition, layerStructureItem.layer));
    
                                            if (selectableSublayerIndex !== -1) {
                                                selectableSublayers.push(allSublayers.getItemAt(selectableSublayerIndex));
                                            }
                                        }
                                    }
                                    selectabilityChecker(layerStructureItem?.children);
                                }
                            }
                        }

                        selectabilityChecker(tocSetting.layerStructure);
                    }
                }
            }

            if (!isVisibilityFilled) { // Pokud není naplěna vybíratelnost vrstev, tak se výchozí vybíratelnost řídí viditelností 
                selectableSublayers.push(
                    ...allSublayers.filter(sublayer => sublayer.visible)
                );
            }
            
            this.setSelectability(
                allSublayers
                    .filter(sublayer => {
                        let type = LayerHelper.getSubLayerType(sublayer);
                        return type === ESublayerType.Feature || type === ESublayerType.Annotation || type === ESublayerType.Dimension;
                    })
                    .map(sublayer => ({
                        gisId: LayerHelper.getGisIdLayersFromLayer(sublayer),
                        selectable: selectableSublayers.includes(sublayer)
                    }))
                    .toArray()
            );

        } catch(err) {
            console.warn(err);
        }
        
    }

    /**
     * - Poskytuje prvek z výběru podle jeho GisId
     * @param gisId - GisId prvku.
     */
    public getFeatureByGisId(gisId: string): __esri.Graphic {
        return this.features.find(feature => FeatureHelper.getFeatureGisId(feature) === gisId);
    }
}