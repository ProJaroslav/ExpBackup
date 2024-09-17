import { JimuMapView, LayerTypes } from "jimu-arcgis";
import { FeatureHelper, LayerHelper, NotificationHelper } from "widgets/shared-code/helpers";
import { EFeatureType } from "widgets/shared-code/enums";
import translations from "./translations/default";

export default class LayerDefinitionHelper {
    /**
     * - Poskytuje definici zdrojové podvrstvy/ negrafické vrstvy tohoto {@link feature prvku}.
     * @param jimuMapView - Aktivná view mapy.
     * @param feature - Prvek, který pochází z vrstevy jejíž definici hledáme.
     */
    public static async getLayerDefinitionFromFeature(jimuMapView: JimuMapView, feature: __esri.Graphic): Promise<HSI.ISublayerDefinition | HSI.ITableDefinition> {
        let featureType = FeatureHelper.getFeatureType(feature);
        switch(featureType) {
            case EFeatureType.Sublayer:
                return LayerDefinitionHelper.getSublayerDefiniton(LayerHelper.getSublayerFromFeature(feature))
            case EFeatureType.Table:
                return LayerDefinitionHelper.getTableDefiniton(jimuMapView, LayerHelper.getTableFromFeature(feature));
            default:
                throw new Error(`Unsupported feature type '${featureType}'`);
        }
    }
    
    /**
     * - Poskytuje definici podvrstvy {@link sublayer}.
     * @param sublayer - Podvrstva pro kterou hledábe definici.
     */
    public static async getSublayerDefiniton(sublayer: __esri.Sublayer): Promise<HSI.ISublayerDefinition> {
        const mapImageLayer = sublayer.layer as __esri.MapImageLayer;
        return { layerId: sublayer.id, mapName: await LayerHelper.findMapName(mapImageLayer), mapServiceName: LayerHelper.getServiceName(mapImageLayer) };
    }
    
    /**
     * - Poskytuje definici podvrstvy {@link sublayer}.
     * - Před zavoláním funkce je třeba ujistit, že funkce má načtené metadata pomocí {@link mapImageLayer.load}.
     * @param sublayer - Podvrstva pro kterou hledábe definici.
     */
    public static getSublayerDefinitonSync(sublayer: __esri.Sublayer): HSI.ISublayerDefinition {
        const mapImageLayer = sublayer.layer as __esri.MapImageLayer;
        return { layerId: sublayer.id, mapName: LayerHelper.getMapName(mapImageLayer), mapServiceName: LayerHelper.getServiceName(mapImageLayer) };
    }
    
    /**
     * - Poskytuje definici negrafické vrstvy {@link table}.
     * @param jimuMapView - Aktivná view mapy.
     * @param table - Tabulka pro kterou hledábe definici.
     */
    public static async getTableDefiniton(jimuMapView: JimuMapView, table: __esri.FeatureLayer): Promise<HSI.ITableDefinition> {
        const mapImageLayer = LayerHelper.getMapImageLayerFromTable(jimuMapView, table);
        return { layerId: table.layerId, mapName: await LayerHelper.findMapName(mapImageLayer), mapServiceName: LayerHelper.getServiceName(mapImageLayer) };
    }
    
    /**
     * - Poskytuje definici negrafické vrstvy {@link table}.
     * - Před zavoláním funkce je třeba ujistit, že funkce má načtené metadata pomocí {@link mapImageLayer.load}.
     * @param jimuMapView - Aktivná view mapy.
     * @param table - Tabulka pro kterou hledábe definici.
     */
    public static getTableDefinitonSync(jimuMapView: JimuMapView, table: __esri.FeatureLayer): HSI.ITableDefinition {
        const mapImageLayer = LayerHelper.getMapImageLayerFromTable(jimuMapView, table);
        if (!mapImageLayer) {
            return null;
        }
        return { layerId: table.layerId, mapName: LayerHelper.getMapName(mapImageLayer), mapServiceName: LayerHelper.getServiceName(mapImageLayer) };
    }
    
    /** - Porovnání dvou definic(identifikací) vrstev. */
    public static matchDefinition(firstDefinition: HSI.ISublayerDefinition | HSI.ITableDefinition, secondDefinition: HSI.ISublayerDefinition | HSI.ITableDefinition): boolean {
        return firstDefinition.layerId === secondDefinition.layerId && LayerDefinitionHelper.matchMapImageLayerDefinition(firstDefinition, secondDefinition);
    }
    
    /** - Porovnání dvou definic(identifikací) mapových služeb. */
    public static matchMapImageLayerDefinition(firstDefinition: HSI.ILayerDefinition, secondDefinition: HSI.ILayerDefinition): boolean {
        return firstDefinition.mapName === secondDefinition.mapName && firstDefinition.mapServiceName === secondDefinition.mapServiceName;
    }
    
    /**
     * - Nalezení negrafickkých vrstev (tabulek) podle jejich definice.
     * @param jimuMapView - Aktivní view mapy.
     * @param tableDefinitions - Definice gerafickkých vrstev, které chceme vyhledat.
     * @param signal - Signalizace zrušení dotazu.
     */
    public static async findTablesByDefinition<T extends HSI.ITableDefinition | Array<HSI.ITableDefinition>>(jimuMapView: JimuMapView, tableDefinitions: T, signal?: AbortSignal): Promise<T extends HSI.ITableDefinition ? __esri.FeatureLayer : T extends Array<HSI.ITableDefinition> ? __esri.Collection<__esri.FeatureLayer> : never> {
        if (!Array.isArray(tableDefinitions)) {
            const tables = await LayerDefinitionHelper.findTablesByDefinition(jimuMapView, [tableDefinitions], signal) as __esri.Collection<__esri.FeatureLayer>;
            return tables.getItemAt(0) as any;
        }
    
        const [allMapImageLayers, allTables] = await Promise.all([LayerHelper.getAllMapImageLayers(jimuMapView, true, signal), LayerHelper.getAllTables(jimuMapView, true, signal)]);
    
        const tablesInMap = allTables.filter(table => {
            let mapImageLayer = allMapImageLayers.find(mapImageLayer => mapImageLayer.url === table.url);
            if (!mapImageLayer) {
                return false;
            }
            let mapName = LayerHelper.getMapName(mapImageLayer);
            let serviceName = LayerHelper.getServiceName(mapImageLayer);
            let index = tableDefinitions.findIndex(tableDefinition => tableDefinition.layerId === table.layerId && tableDefinition.mapServiceName === serviceName && tableDefinition.mapName === mapName);
    
            return index !== -1;
        });

        const unusedTableDefinitions = tableDefinitions.filter(tableDefinition => !tablesInMap.some(table => LayerDefinitionHelper.matchDefinition(LayerDefinitionHelper.getTableDefinitonSync(jimuMapView, table), tableDefinition)));

        //#region - Pokud tabulka není v mapě, ale existuje zdrojová mapová služba, tak se tabulka vytvoří a přidá do mapy
        await Promise.all(unusedTableDefinitions.map(async tableDefinition => {
            try {
                const mapImageLayer = await LayerDefinitionHelper.findMapImageLayerByDefinition(jimuMapView, tableDefinition);
                if (!!mapImageLayer) {
                    const metadata = await LayerHelper.sourceJSON(mapImageLayer);
                    if (Array.isArray(metadata.tables) && metadata.tables.some(({ id }) => id === tableDefinition.layerId)) {
                        const featureLayer = await LayerHelper.createFeatureLayerFromMapService(mapImageLayer, tableDefinition.layerId);
                        //#region - Odebrání názvu mapové služby
                        /** @todo - konfiguračně? */
                        if (featureLayer.title.includes(" - ")) {
                            const parts = featureLayer.title.split(" - ");
                            parts.splice(0, 1);
                            featureLayer.title = parts.join(" - ").trim();
                        }
                        //#endregion END - Odebrání názvu mapové služby
                        // Zajištění, že se během vytváření tabulky již identická tabulka nepřidala do mapy.
                        let existingTable = LayerHelper.getAllTables(jimuMapView, false).find(table => {
                            let def = LayerDefinitionHelper.getTableDefinitonSync(jimuMapView, table);
                            return !!def && LayerDefinitionHelper.matchDefinition(def, tableDefinition);
                        });
                        if (!existingTable) {
                            tablesInMap.add(featureLayer);
                            jimuMapView.view.map.tables.add(featureLayer);
                        } else {
                            tablesInMap.add(existingTable);
                        }
                    }
                }
            } catch(err) {
                console.warn(err)
                let { layerId, mapServiceName } = tableDefinition
                NotificationHelper.addNotification({ message: translations.failedToCreateTable.replace("{0}", JSON.stringify({ layerId, mapServiceName })), type: "warning" });
            }
        }));
        //#endregion END - Pokud tabulka není v mapě, ale existuje zdrojová mapová služba, tak se tabulka vytvoří a přidá do mapy
    
        return tablesInMap as any;
    }
    
    /**
     * - Nalezení podvrstev podle jejich definice.
     * @param jimuMapView - JimuMapView mapy, ve které vrstvy hledáme.
     * @param sublayerDefinitions - Definice podvrstev. 
     */
    public static async findSublayersByDefinition(jimuMapView: JimuMapView, sublayerDefinitions: HSI.ISublayerDefinition | Array<HSI.ISublayerDefinition>): Promise<Array<__esri.Sublayer>> {
        if (!Array.isArray(sublayerDefinitions)) {
            return LayerDefinitionHelper.findSublayersByDefinition(jimuMapView, [sublayerDefinitions]);
        }
    
        /** - Všechny mapové služby v současném prostředí. */
        const mapImageLayers = LayerHelper.getAllMapImageLayers(jimuMapView);
        /** - Podvrstvy nalezené podle {@link sublayerDefinitions}, které jsou v současném prostředí. */
        const sublayers: Array<__esri.Sublayer> = [];
    
        for (let sublayerDefinition of sublayerDefinitions) {
            /**
             * - Mapové služby s názvěm rovnajicím se {@link sublayerDefinition.mapServiceName}
             * - Nemělo by se stát, že je v mapě více než jedna, ale pro jistotu..
             */
            let mapImageLayersWithName = mapImageLayers.filter(layer => LayerHelper.getServiceName(layer) === sublayerDefinition.mapServiceName);
            /** - Mapová služba malezená podle {@link sublayerDefinition}. */
            let mapImageLayer: __esri.MapImageLayer;
    
            for (let layer of mapImageLayersWithName) {
                let mapName = await LayerHelper.findMapName(layer);
                if (mapName === sublayerDefinition.mapName) {
                    mapImageLayer = layer;
                    break;
                }
            }
    
            if (mapImageLayer) {
                let sublayer = mapImageLayer.findSublayerById(sublayerDefinition.layerId);
                if (sublayer) {
                    sublayers.push(sublayer);
                }
            }
        }
    
        return sublayers;
    }
    
    /**
     * - Nalezení podvrstvy podle její definice.
     * @param jimuMapView - JimuMapView mapy, ve které vrstvu hledáme.
     * @param sublayerDefinition - Definice podvrstvy.
     */
    public static async findSublayerByDefinition(jimuMapView: JimuMapView, sublayerDefinition: HSI.ISublayerDefinition): Promise<__esri.Sublayer> {
        const [sublayer] = await LayerDefinitionHelper.findSublayersByDefinition(jimuMapView, sublayerDefinition);
        return sublayer;
    }
    
    /**
     * - Poskytuje podvrstvu / negrafickou vrstvu podle její definice {@link definition}.
     * @param jimuMapView - Aktivní view mapy.
     * @param definition - Definice vrstvy.
     */
    public static async findLayerByDefinition(jimuMapView: JimuMapView, definition: HSI.ISublayerDefinition | HSI.ITableDefinition): Promise<__esri.Sublayer | __esri.FeatureLayer> {
        const [sublayer] = await LayerDefinitionHelper.findSublayersByDefinition(jimuMapView, definition);
    
        return sublayer || LayerDefinitionHelper.findTablesByDefinition(jimuMapView, definition);
    }
    
    /**
     * - Poskytuje podvrstvy / negrafické vrstvy podle jejich {@link definitions definicí}.
     * @param jimuMapView - Aktivní view mapy.
     * @param definitions - Definice vrstev.
     */
    public static async findLayersByDefinition<
        D extends HSI.ISublayerDefinition | HSI.ITableDefinition,
        T extends D | Array<D>,
        R extends (T extends D ? __esri.Sublayer | __esri.FeatureLayer : T extends Array<D> ? Array<__esri.Sublayer | __esri.FeatureLayer> : never)
    >(jimuMapView: JimuMapView, definitions: T): Promise<R> {
        if (!Array.isArray(definitions)) {
            return LayerDefinitionHelper.findLayerByDefinition(jimuMapView, definitions) as Promise<R>;
        }
    
        const layers = await Promise.all(definitions.map(definition => LayerDefinitionHelper.findLayerByDefinition(jimuMapView, definition)));
    
        return layers.filter(layer => !!layer) as R;
    }
    
    /**
     * - Poskytuje vrstvu typu {@link LayerTypes.VectorTileLayer} podle jení definice {@link definition}.
     * @param jimuMapView - Aktivní view mapy.
     * @param definition - Definice vrstvy.
     */
    public static getVectorTileLayerByDefinition(jimuMapView: JimuMapView, definition: HSI.IVectorTyleLayerDefinition): __esri.VectorTileLayer {
        return jimuMapView.view.map.layers.find((layer: __esri.VectorTileLayer) => layer.type === LayerTypes.VectorTileLayer && layer.url.includes(`services/${definition.mapServiceName}/VectorTileServer`)) as __esri.VectorTileLayer;
    }
    
    /** - Poskytuje definici pro {@link mapImageLayer mapovou službu}. */
    public static async getMapImageLayerDefinition(mapImageLayer: __esri.MapImageLayer): Promise<HSI.ILayerDefinition> {
        return { mapName: await LayerHelper.findMapName(mapImageLayer), mapServiceName: LayerHelper.getServiceName(mapImageLayer) };
    }
    
    /**
     * - Nalezení mapové služby podle {@link mapImageLayerDefinition její definice}.
     * @param jimuMapView - Aktivní view mapy.
     * @param mapImageLayerDefinition - Definice mapové služby. 
     */
    public static async findMapImageLayerByDefinition(jimuMapView: JimuMapView, mapImageLayerDefinition: HSI.ILayerDefinition): Promise<__esri.MapImageLayer> {
        const allMapImageLayers = await LayerHelper.getAllMapImageLayers(jimuMapView, true);
    
        return allMapImageLayers.find(mapImageLayer => LayerDefinitionHelper.matchMapImageLayerDefinition(mapImageLayerDefinition, { mapName: LayerHelper.getMapName(mapImageLayer), mapServiceName: LayerHelper.getServiceName(mapImageLayer) }));
    }
    
    /**
     * - Nalezení WMS služby v {@link jimuMapView mapě} podle {@link wmsLayerDefinition její definice}.
     * @param jimuMapView - Aktivní view mapy.
     * @param wmsLayerDefinition - Definice mapové služby. 
     */
    public static async findWmsLayerByDefinition(jimuMapView: JimuMapView, wmsLayerDefinition: HSI.IWmsLayerDefinition): Promise<__esri.WMSLayer> {
        return jimuMapView.view.map.layers.find(layer => {
            return layer.type === LayerTypes.WMSLayer && (layer as __esri.WMSLayer).url === wmsLayerDefinition.url;
        }) as __esri.WMSLayer;
    }
    
    /**
     * - Nalezení grafické Feature vrstvy v {@link jimuMapView mapě} podle {@link featureLayerDefinition její definice}.
     * - V tomto řešení se rozlišují grafické a negrafické Feature vrstvy (V ExB je obojí {@link __esri.FeatureLayer}). Pokud je nalezená vrstva tabulkou, tak se vyhodí výjimka. Pro vyhledání negrafické vrstvy použíjte {@link findTablesByDefinition tuto funkci}.
     * @param jimuMapView - Aktivní view mapy.
     * @param featureLayerDefinitions - Definice mapové služby. 
     */
    public static async findFeatureLayersByDefinition<D extends HSI.IFeatureLayerDefinition, T extends D | Array<D>>(jimuMapView: JimuMapView, featureLayerDefinitions: T): Promise<T extends D ? __esri.FeatureLayer : Array<__esri.FeatureLayer>> {
        if (!Array.isArray(featureLayerDefinitions)) {
            const featureLayers = await LayerDefinitionHelper.findFeatureLayersByDefinition(jimuMapView, [featureLayerDefinitions]);
            return featureLayers[0];
        }
    
        const featureLayers: Array<__esri.FeatureLayer> = [];
    
        featureLayerDefinitions.forEach(featureLayerDefinition => {
            const featureLayer = jimuMapView.view.map.layers.find((layer: __esri.FeatureLayer) => {
                if (layer.type !== LayerTypes.FeatureLayer) {
                    return false;
                }
                let layerUrl = layer.url;
    
                if (typeof layer.layerId === "number") {
                    layerUrl += layerUrl[0] ===  "/" ? layer.layerId : `/${layer.layerId}`;
                }
    
                return featureLayerDefinition.url === layerUrl || layerUrl.includes(featureLayerDefinition.url) || featureLayerDefinition.url.includes(layerUrl);
            }) as __esri.FeatureLayer;
        
            if (featureLayer?.isTable) {
                throw new Error(`Layer '${featureLayer.title}' is not graphic!`);
            }
    
            featureLayers.push(featureLayer);
        });
    
    
        return featureLayers as T extends D ? __esri.FeatureLayer : Array<__esri.FeatureLayer>;
    }

    /**
     * - Zjišťujje zda podvrstva {@link sublayer} odpovídá definici {@link definition}. 
     * - Mapová služba, ze které {@link sublayer} pochází musí mít načtěná metadata pomocí {@link __esri.MapImageLayer.load}
     * @param sublayer - Podvrstva.
     * @param definition - Definice podvrstvy.
     */
    public static matchSublayerDefinition(sublayer: __esri.Sublayer, definition: HSI.ISublayerDefinition) {
        const mapImageLayer = sublayer.layer as __esri.MapImageLayer;
    
        if (!mapImageLayer.loaded) {
            throw new Error("Layer's metadata are not loaded");
        }
    
        let mapName = LayerHelper.getMapName(mapImageLayer);
        let mapServiceName = LayerHelper.getServiceName(mapImageLayer);
        return definition.layerId === sublayer.id && definition.mapName === mapName && definition.mapServiceName === mapServiceName;
    }
};