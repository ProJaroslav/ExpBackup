import { JimuMapView, LayerTypes } from "jimu-arcgis";
import { GeometryType } from "@esri/arcgis-rest-types";
import { ArcGISJSAPIModuleLoader, FeatureHelper, LayerDefinitionHelper, NotificationHelper, GlobalSettingHelper } from "widgets/shared-code/helpers";
import { EFeatureType, EKnownLayerExtension, ESublayerType } from "widgets/shared-code/enums";
import translations from "./translations/default";
 
export default class LayerHelper {
    /**
     * - Poskytuje vrstvu typu "feature" podle jeního identifikátoru.
     * @param jimuMapView - JimuMapView mapy ve které je vrstva.
     * @param layerId - Identifikátor vrstvy.
     */
    public static getFetureLayerById(jimuMapView: JimuMapView, layerId: string): __esri.FeatureLayer {
        return LayerHelper.getLayerById(jimuMapView, layerId, LayerTypes.FeatureLayer);
    }
    
    /**
     * - Poskytuje vrstvu typu "map-image" podle jeního identifikátoru.
     * @param jimuMapView - JimuMapView mapy ve které je vrstva.
     * @param layerId - Identifikátor vrstvy.
     */
    public static getMapImageLayerById(jimuMapView: JimuMapView, layerId: string): __esri.MapImageLayer {
        return LayerHelper.getLayerById(jimuMapView, layerId, LayerTypes.MapImageLayer);
    }
    
    /**
     * - Poskytuje vrstvu podle jejího identifikátoru, a kontroluje její typ.
     * @param jimuMapView - JimuMapView mapy ve které je vrstva.
     * @param layerId - Identifikátor vrstvy.
     * @param type - Typ požadované vrstvy.
     */
    public static getLayerById<T extends LayerTypes>(jimuMapView: JimuMapView, layerId: string, type?: T): T extends LayerTypes.FeatureLayer ? __esri.FeatureLayer : T extends LayerTypes.MapImageLayer ? __esri.MapImageLayer : __esri.Layer {
        const layer = jimuMapView.view.map.findLayerById(layerId);
        if (!layer)
            throw new Error(`Data source with id '${jimuMapView.dataSourceId}' does not contain layer with id '${layerId}'`);
    
        if (type && layer.type !== type)
            throw new Error(`Wrong layer type '${layer.type}', expected type is '${type}'`);
    
        //@ts-ignore
        return layer;
    }
    
    /**
     * - Nachází podvrstvu podle jejího GisId
     * @param jimuMapView - JimuMapView mapy, ve které podvrstvu hledáme.
     * @param gisId - GisId podvrstvy (unikátní identifikátor složený z id vrstvy a z id její mapové služby)
     */
    public static getSublayerByGisId(jimuMapView: JimuMapView, gisId: string): __esri.Sublayer {
        const [mapImageLayerId, sublayerId] = gisId.split(".");
    
        const mapImageLayer = LayerHelper.getMapImageLayerById(jimuMapView, mapImageLayerId);
    
        return mapImageLayer.findSublayerById(parseInt(sublayerId));
    }
    
    /**
     * - Vytvoření GisId podvrstvy.
     * @param mapImageLayerId - Identifikátor mapové služby ze které podvrstva pochází.
     * @param layerId - Identifikátor podvrstvy jejíž GisId chceme vytvořit.
     */
    public static geLayerstGisId(mapImageLayerId: string, layerId: number): string {
        return `${mapImageLayerId}.${layerId}`;
    }
    
    /**
     * - Poskytuje zdrojovou podvrstvu {@link feature prvku}.
     * @param feature - Prvek jehož podvrstvu získáváme.
     */
    public static getSublayerFromFeature(feature: __esri.Graphic): __esri.Sublayer {
        if (!feature)
            return null;
    
        return feature['sourceLayer'];
    }
    
    /**
     * - Poskytuje zdrojovou negrafickou vrstvu (tabulku) {@link feature prvku}.
     * @param feature - Prvek jehož vrstvu získáváme.
     */
    public static getTableFromFeature(feature: __esri.Graphic): __esri.FeatureLayer {
        if (!feature)
            throw new Error("Feature is not defined");
    
        const featureLayer = feature['sourceLayer'] as __esri.FeatureLayer;
        const layerType = featureLayer.type;
        if (layerType !== LayerTypes.FeatureLayer) {
            throw new Error(`Unsupported table type '${layerType}'`);
        }
    
        if (!featureLayer.isTable) {
            throw new Error(`Layer is not a table`);
        }
    
        return featureLayer;
    }
    
    /**
     * - Poskytuje zdrojovou vrstvu {@link feature prvku}, nehledě na typ.
     * @param feature - Prvek jehož vrstvu získáváme.
     * @param ignoreType - Chceme nekontrovolat validitu zdrojové vrstvy?
     */
    public static getSourceLayerFromFeature(feature: __esri.Graphic, ignoreType: boolean = false): __esri.FeatureLayer | __esri.Sublayer {
        if (ignoreType) {
            return feature['sourceLayer']
        }
        let featureType = FeatureHelper.getFeatureType(feature);
        switch (featureType) {
            case EFeatureType.Sublayer:
                return LayerHelper.getSublayerFromFeature(feature);
            case EFeatureType.Table:
                return LayerHelper.getTableFromFeature(feature);
            default:
                throw new Error(`Unhandled feature type '${featureType}'`);
        }
    }
    
    /**
     * - Poskytuje mapovou službu, v rámci které existuje vrstva, ze které pochází prvek {@link feature}.
     * @param jimuMapView - JimuMapView mapy, ve které je hledaná mapová služba.
     * @param feature - Prvek podle kterého mapovou službu hledáme.
     */
    public static getMapImageLayerFromFeature(jimuMapView: JimuMapView, feature: __esri.Graphic): __esri.MapImageLayer {
        const type = FeatureHelper.getFeatureType(feature);
        switch (type) {
            case EFeatureType.Sublayer:
                return LayerHelper.getSublayerFromFeature(feature).layer as __esri.MapImageLayer;
            case EFeatureType.Table:
                return LayerHelper.getMapImageLayerFromTable(jimuMapView, LayerHelper.getTableFromFeature(feature));
            default:
                throw new Error(`Unhandled feature type '${type}'`);
        }
    }
    
    /**
     * - Poskytuje negrafickou vrstvu (tabulku) podle jejího id.
     * @param jimuMapView - JimuMapView mapy ze které tabulku získáváme.
     * @param tableId - Id negrafické vrstvy.
     */
    public static getTableById(jimuMapView: JimuMapView, tableId: string): __esri.FeatureLayer {
        const table = jimuMapView.view.map.allTables.find(table => table.id === tableId);
    
        if (!table) {
            throw new Error(`Invalid table Id '${tableId}'`);
        }
    
        if (table.type !== LayerTypes.FeatureLayer) {
            throw new Error(`Unexpected table type '${table.type}'`);
        }
    
        return table as __esri.FeatureLayer;
    }
    
    /**
     * - Vytvoření GisId podvrstvy.
     * @param layer - Podvrstva jejíž GisId chceme vytvořit.
     */
    public static getGisIdLayersFromLayer(layer: __esri.Sublayer): string {
        return LayerHelper.geLayerstGisId(layer.layer.id, layer.id);
    }
    
    /**
     * - Poskytuje všechny podvrstvy typu "Feature Layer" ve správném pořadí (z MapImageLayer) v mapě.
     * @param jimuMapView - JimuMapView mapy, ve které podvrstvy hledáme.
     * @param signal - Signalizace zrušení dotazu.
     */
    public static async getAllFeatureSublayers(jimuMapView: JimuMapView, signal?: AbortSignal): Promise<Array<__esri.Sublayer>> {
        const allSublayers = await Promise.all<__esri.Sublayer>(LayerHelper.getAllSublayers(jimuMapView).map(sublayer => sublayer.load(signal)).toArray());
        return allSublayers.filter(sublayer => LayerHelper.getSubLayerType(sublayer) === ESublayerType.Feature);
    }
    
    /**
     * - Poskytuje všechny podvrstvy(z MapImageLayer) v pořadí podle struktury webmapy.
     * @param jimuMapView - JimuMapView mapy, ve které podvrstvy hledáme.
     */
    public static getAllSublayers(jimuMapView: JimuMapView): __esri.Collection<__esri.Sublayer> {
        return LayerHelper.getAllMapImageLayers(jimuMapView)
            .map((layer: __esri.MapImageLayer) => {
                return layer.allSublayers;
            })
            .reduce((sublayerMainCollection, sublayerCollection) => 
                sublayerMainCollection.concat(sublayerCollection)
            );
    }
    
    
    /**
     * - Poskytuje všechny MapImageLayer (mapové služby) v mapě.
     * @param jimuMapView - JimuMapView mapy, ve které vrstvy hledáme.
     * @param load - Chceme načíst dodatečné informace vrstev?
     * @param signal - Signalizace zrušení dotazu.
     */
    public static getAllMapImageLayers(jimuMapView: JimuMapView, load: true, signal?: AbortSignal): Promise<__esri.Collection<__esri.MapImageLayer>>;
    /**
     * - Poskytuje všechny MapImageLayer (mapové služby) v mapě.
     * @param jimuMapView - JimuMapView mapy, ve které vrstvy hledáme.
     * @param load - Chceme načíst dodatečné informace vrstev?
     */
    public static getAllMapImageLayers(jimuMapView: JimuMapView, load?: false): __esri.Collection<__esri.MapImageLayer>;
    /**
     * - Poskytuje všechny MapImageLayer (mapové služby) v mapě.
     * @param jimuMapView - JimuMapView mapy, ve které vrstvy hledáme.
     * @param load - Chceme načíst dodatečné informace vrstev?
     * @param signal - Signalizace zrušení dotazu.
     */
    public static getAllMapImageLayers<T extends boolean>(jimuMapView: JimuMapView, load?: T, signal?: AbortSignal): T extends true ? Promise<__esri.Collection<__esri.MapImageLayer>> : __esri.Collection<__esri.MapImageLayer> {
        if (load) {
            return new Promise(async (resolve, reject) => {
                try {
                    await Promise.all(jimuMapView.view.map.layers.toArray().map(layer => layer.load(signal)));
                    resolve(LayerHelper.getAllMapImageLayers(jimuMapView, false));
                } catch(err) {
                    reject(err);
                }
            }) as T extends true ? Promise<__esri.Collection<__esri.MapImageLayer>>: __esri.Collection<__esri.MapImageLayer>;
        }
        return jimuMapView.view.map.layers
            .filter(layer => 
                layer.type === LayerTypes.MapImageLayer
            ) as T extends true ? Promise<__esri.Collection<__esri.MapImageLayer>>: __esri.Collection<__esri.MapImageLayer>;
    }
    
    /**
     * - Zjišťuje zda vrstva a všechny její nadřazené vrstvy mají zapnutou viditelnost a jsou viditelné v {@link měříku currentScale}.
     * - Pokud není zadáno {@link měřítko currentScale}, tak se nezohledňuje.
     * @param sublayer - Vrstva jejíž viditelnost chceme zjistit.
     * @param currentScale - Meříko ve kterém chceme zjistit viditelnost.
     */
    public static isVisible(sublayer: __esri.Sublayer, currentScale?: number): boolean {
        try {
            if (!sublayer.visible || (typeof currentScale === "number" && !LayerHelper.isVisibleAtScale(sublayer, currentScale))) {
                return false;
            }
    
            if (sublayer.parent.id === sublayer.layer.id)
                return sublayer.parent.visible;
    
            return LayerHelper.isVisible(sublayer.parent as __esri.Sublayer, currentScale);
        } catch (e) {
            console.warn(e);
            return false;
        }
    }
    
    /**
     * - Poskytuje všechny nadřazené skupinové vrstvy (včetně mapové služby a samotné podvrstvy {@link sublayer}) pro podvrstvu {@link sublayer}.
     * @param sublayer - Podvrstva, ke které se nachází nadřazené vrstvy.
     */
    public static getAllParents(sublayer: __esri.Sublayer): Array<__esri.Sublayer['parent']> {
        const layers: Array<__esri.Sublayer['parent']> = [sublayer];
        
        do {
            layers.push((layers[layers.length - 1] as __esri.Sublayer).parent);
        } while(layers[layers.length - 1].id !== sublayer.layer.id)
    
        return layers;
    }
    
    /**
     * - Poskytuje nadřazenou skupinovu vrstvu podvrstvy {@link sublayer}.
     * - Pokud podvrstva {@link sublayer} není zanořená ve skupivové vrstvě, tak vrátí její mapovou službu.
     * @param sublayer - Podvrstva, ke které se nachází nadřazená vrstva.
     * @deprecated Use {@link __esri.Sublayer.parent}
     */
    public static getParent(sublayer: __esri.Sublayer): __esri.Sublayer | __esri.MapImageLayer {
        const parent = sublayer['parent']

        if (parent.type === "tile") {
            throw new Error("Tile layer is not currently supproted!")
        }

        return parent;
    }
    
    /**
     * - Zjišťuje viditelnost vrstvy v měřítku.
     * @param layer - Vrstva u které chceme zjistit viditelnost.
     * @param currentScale - Meříko ve kterém chceme zjistit viditelnost.
     */
    public static isVisibleAtScale(layer: __esri.Sublayer | __esri.MapImageLayer | __esri.WMSLayer | __esri.FeatureLayer, currentScale: number): boolean {
        const isAboveMin = layer.minScale ? layer.minScale >= currentScale : true;
        const isBeneathMax = layer.maxScale ? layer.maxScale <= currentScale : true;
        return isAboveMin && isBeneathMax;
    }
    
    /**
     * - Poskytuje typ podvrstvy.
     * - Podvrstva musí mít načtěná metadata pomocí layer.load()!
     * @param layer - Podvrstva jejíž typ zjišťujeme.
     */
    public static getSubLayerType(layer: __esri.Sublayer): ESublayerType {
        return layer.sourceJSON?.type
    }
    
    /**
     * - Poskytuje typ podvrstvy.
     * @param layer - Podvrstva jejíž typ zjišťujeme.
     */
    public static async getSubLayerTypeAsync(layer: __esri.Sublayer): Promise<ESublayerType> {
        await layer.load();
        return LayerHelper.getSubLayerType(layer);
    }
    
    /**
     * - Ověřuje zda vrstva má rozšíření (Např. zaplý FeatureAccess).
     * @param layer - Vrstva ve které rozšíření hledáme.
     * @param extensions - Hledaná rozšíření.
     */
    public static async hasExtension(layer: __esri.MapImageLayer, extensions: EKnownLayerExtension | Array<EKnownLayerExtension>): Promise<boolean> {
        if (!Array.isArray(extensions)) {
            return LayerHelper.hasExtension(layer, [extensions]);
        }

        const sourceJSON = await LayerHelper.sourceJSON(layer);
    
        if (typeof sourceJSON.supportedExtensions !== "string") {
            return false;
        }
    
        for (let extension of extensions) {
            if (!(sourceJSON.supportedExtensions as string).includes(LayerHelper.getExtensionValue(extension))) {
                return false;
            }
        }
    
        return true;
    }
    
    /**
     * - Poskytuje všechny MapImageLayer (mapové služby) v {@link jimuMapView mapě}, které mají {@link extensions rozšíření} (Např. zaplý FeatureAccess nebo SOE).
     * @param jimuMapView - JimuMapView mapy, ve které vrstvy hledáme.
     * @param extensions - Hledaná rozšíření.
     * @param throwIfMissing - Má se vyhodit výjimka poud v {@link jimuMapView mapě} neexistuje služba s {@link extensions rozšířeními}?
     */
    public static async findAllMapImageLayersWithExtensions(jimuMapView: JimuMapView, extensions: EKnownLayerExtension | Array<EKnownLayerExtension>, throwIfMissing: boolean = false): Promise<Array<__esri.MapImageLayer>> {
        const allMapImageLayers = LayerHelper.getAllMapImageLayers(jimuMapView);
        const mapImageLayersWithExtensions: Array<__esri.MapImageLayer> = [];
    
        await Promise.all(allMapImageLayers.map(async mapImageLayer => {
            const hasExtensions = await LayerHelper.hasExtension(mapImageLayer, extensions);
            if (hasExtensions) {
                mapImageLayersWithExtensions.push(mapImageLayer);
            }
        }));

        if (mapImageLayersWithExtensions.length < 1 && throwIfMissing) {
            throw new Error(translations.noServiceWithExtension.replace("{0}", Array.isArray(extensions) ? extensions.map(LayerHelper.getExtensionValue).join(", ") : LayerHelper.getExtensionValue(extensions)));
        }
    
        return mapImageLayersWithExtensions;
    }

    /**
     * - Poskytuje hodnotu {@link extensionKey rozšíření} mapové služby z globálního nastavení.
     * @param extensionKey - Kíč rozšíření mapové služby.
     */
    public static getExtensionValue(extensionKey: EKnownLayerExtension): string {
        const serviceExtensions = GlobalSettingHelper.get("serviceExtensions");
        if (!serviceExtensions) {
            return extensionKey;
        }
        const serviceExtension = serviceExtensions.find(({ key }) => key === extensionKey);
        return !serviceExtension ? extensionKey : serviceExtension.value;
    }
    
    /**
     * - Nachází název mapy v mapové službě.
     * @param mapImageLayer - Mapová služba z níž chceme získat název mapy. 
     */
    public static async findMapName(mapImageLayer: __esri.MapImageLayer): Promise<string> {
        if (!mapImageLayer.loaded) {
            await mapImageLayer.load();
        }
    
        return LayerHelper.getMapName(mapImageLayer);
    }
    
    /**
     * - Nachází název mapy v mapové službě.
     * - Před zavoláním funkce je třeba ujistit, že {@link mapImageLayer služba} má načtené metadata pomocí {@link mapImageLayer.load}
     * @param mapImageLayer - Mapová služba z níž chceme získat název mapy. 
     */
    public static getMapName(mapImageLayer: __esri.MapImageLayer): string {
        return LayerHelper.sourceJSONSync(mapImageLayer).mapName;
    }
    
    /**
     * - Poskytuje název mapové služby.
     * @param mapImageLayer - Mapová služba jejíž název chceme získat.
     */
    public static getServiceName(mapImageLayer: __esri.MapImageLayer): string {
        try {
            return mapImageLayer.url.match(/services\/([\s\S]+)\/MapServer/)[1];
        } catch(err) {
            console.warn(`Failed to resd mapServiceName`, err);
        }
    }

    /**
     * - Načítá a poskytuje metadata {@link mapImageLayer mapové služby}.
     * - Před zavoláním funkce je třeba ujistit, že {@link mapImageLayer služba} má načtené metadata pomocí {@link mapImageLayer.load}
     * @param mapImageLayer - Mapová služba u které hledáme metadata.
     */
    public static async sourceJSON(mapImageLayer: __esri.MapImageLayer): Promise<HSI.IMapServiceSourceJson> {
        if (!mapImageLayer.loaded) {
            await mapImageLayer.load();
        }

        return LayerHelper.sourceJSONSync(mapImageLayer);
    }

    /**
     * - Poskytuje metadata {@link mapImageLayer mapové služby}.
     * @param mapImageLayer - Mapová služba u které hledáme metadata.
     */
    public static sourceJSONSync(mapImageLayer: __esri.MapImageLayer): HSI.IMapServiceSourceJson {
        return mapImageLayer.sourceJSON;
    }

    /**
     * - Vytvoření Feature vrtvy v {@link mapService mapové službě}.
     * - Používá se např. pokud v {@link mapService mapové službě} (na severu) je negrafická tabulka, ale není ve webové mapě.
     * @param mapService - Mapová služba, která obsahuje {@link layerId vrtvu}. 
     * @param layerId - Id vrtvy v {@link mapService mapové službě}.
     */
    public static async createFeatureLayerFromMapService(mapService: __esri.MapImageLayer, layerId: number): Promise<__esri.FeatureLayer> {
        const FeatureLayer = await ArcGISJSAPIModuleLoader.getModule("FeatureLayer");
        const featureLayer = new FeatureLayer({ url: mapService.url, layerId });

        await featureLayer.load();

        return featureLayer;
    }
    
    /**
     * - Vytvoření FeatureLayer z podvrstvy.
     * - Pokud má mapová služba zaplý FeatureAccess, načte vrstvu z Feature Serveru, jinak ji načte z Mapové Služby.
     * @see {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-FeatureLayer.html}
     * @param sublayer - Podvrstva z níž FeatureLayer vytváříme.
     * @param load - Chceme načíst metadata?
     */
    public static async createFeatureLayer(sublayer: __esri.Sublayer, load: boolean = true): Promise<__esri.FeatureLayer> {
        if (sublayer.loadStatus !== "loaded") {
            await sublayer.load()
        }
    
        let featureLayer: __esri.FeatureLayer;
    
        const hasFeatureAccess = await LayerHelper.hasExtension(sublayer.layer as __esri.MapImageLayer, EKnownLayerExtension.FeatureServer);
    
        try {
            if (hasFeatureAccess) {
                const url = sublayer.url.replace("MapServer", "FeatureServer");
                const FeatureLayer = await ArcGISJSAPIModuleLoader.getModule("FeatureLayer");
                featureLayer = new FeatureLayer({ url });
            }
        } catch(err) {
            console.warn(err);
        } finally {
            if (!featureLayer) {
                featureLayer = await sublayer.createFeatureLayer();
            }
    
            if (load && !featureLayer.loaded) {
                await featureLayer.load();
            }
        
            return featureLayer;
        }
    }
    
    /**
     * - Vytvoření kopie negrafické vrstvy.
     * - Pokud má mapová služba zaplý FeatureAccess, načte vrstvu z Feature Serveru, jinak ji načte z Mapové Služby.
     * @see {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-FeatureLayer.html}
     * @param jimuMapView - Aktivní view mapy.
     * @param layer - Vrstva, kterou duplikujeme.
     * @param load - Chceme načíst metadata?
     */
    public static async duplicateTable(jimuMapView: JimuMapView, layer: __esri.FeatureLayer, load: boolean = true): Promise<__esri.FeatureLayer> {
        if (!layer.loaded) {
            await layer.load();
        }
    
        const FeatureLayer = await ArcGISJSAPIModuleLoader.getModule("FeatureLayer");
    
        let featureLayer: __esri.FeatureLayer;
    
        const mapImageLayer = LayerHelper.getMapImageLayerFromTable(jimuMapView, layer);
    
        const hasFeatureAccess = await LayerHelper.hasExtension(mapImageLayer, EKnownLayerExtension.FeatureServer);
    
        try {
            if (hasFeatureAccess && LayerHelper.isServerLayer(layer, "MapServer")) {
                featureLayer = new FeatureLayer({ url: `${layer.url.replace("MapServer", "FeatureServer")}/${layer.layerId}` });
            }    
        } catch(err) {
            console.warn(err);
        } finally {
            if (!featureLayer) {
                featureLayer = new FeatureLayer({ url: `${layer.url}/${layer.layerId}` });
            }
    
            if (load && !featureLayer.loaded) {
                await featureLayer.load();
            }
        
            return featureLayer;
        }
    }
    
    /**
     * - Zjišťujje zda podvrstva {@link sublayer} odpovídá definici {@link definition}. 
     * - Mapová služba, ze které {@link sublayer} pochází musí mít načtěná metadata pomocí {@link __esri.MapImageLayer.load}
     * @param sublayer - Podvrstva.
     * @param definition - Definice podvrstvy.
     */
    public static matchSublayerDefinition(sublayer: __esri.Sublayer, definition: HSI.ISublayerDefinition) {
        return LayerDefinitionHelper.matchSublayerDefinition(sublayer, definition);
    }
    
    /**
     * - Poskytuje všechny negrafické vrstvy v mapě.
     * @param jimuMapView - Aktivní view mapy.
     * @param load - Chceme načíst dodatečné informace vrstev?
     * @param signal - Signalizace zrušení dotazu.
     */
    public static getAllTables(jimuMapView: JimuMapView, load: true, signal?: AbortSignal): Promise<__esri.Collection<__esri.FeatureLayer>>;
    /**
     * - Poskytuje všechny negrafické vrstvy v mapě.
     * @param jimuMapView - Aktivní view mapy.
     * @param load - Chceme načíst dodatečné informace vrstev?
     */
    public static getAllTables(jimuMapView: JimuMapView, load?: false): __esri.Collection<__esri.FeatureLayer>;
    /**
     * - Poskytuje všechny negrafické vrstvy v mapě.
     * @param jimuMapView - Aktivní view mapy.
     * @param load - Chceme načíst dodatečné informace vrstev?
     * @param signal - Signalizace zrušení dotazu.
     */
    public static getAllTables<T extends boolean>(jimuMapView: JimuMapView, load?: T, signal?: AbortSignal): T extends true ? Promise<__esri.Collection<__esri.FeatureLayer>> : __esri.Collection<__esri.FeatureLayer> {
        let tables = jimuMapView.view.map.allTables as __esri.Collection<__esri.FeatureLayer>;
    
        tables = tables.filter(table => {
            if (table.type !== LayerTypes.FeatureLayer) {
                console.warn(`Unexpected table type '${table.type}'`);
                return false;
            }
            return true;
        })
    
        if (load) {
            return Promise.all(tables.map(async table => {
                try {
                    if (!table.loaded) {
                        await table.load(signal)
                    }
                } catch(err) {
                    if (!signal.aborted) {
                        console.warn(err);
                    }
                }
            }).toArray())
                .then(() => {
                    return tables.filter(table => table.loaded && table.isTable);
                }) as T extends true ? Promise<__esri.Collection<__esri.FeatureLayer>> : __esri.Collection<__esri.FeatureLayer>;
        }
        
        return tables as T extends true ? Promise<__esri.Collection<__esri.FeatureLayer>> : __esri.Collection<__esri.FeatureLayer>;
    
    }
    
    /**
     * - Získání mapové služby z negrafické vrstvy (tabulky).
     * @param jimuMapView - Aktivní view mapy.
     * @param table - Tabulka z níž mapovou službu chceme získat.
     */
    public static getMapImageLayerFromTable(jimuMapView: JimuMapView, table: __esri.FeatureLayer): __esri.MapImageLayer {
        const allMapImageLayers = LayerHelper.getAllMapImageLayers(jimuMapView);
        return allMapImageLayers.find(mapImageLayer => mapImageLayer.url === table.url);
    }
    
    /**
     * - Získání typu geometrie z podvrstvy.
     * @param sublayer - Podvrstva jejíž typ geometrie zjišťujeme.
     * @param signal - Signalizace zrušení dotazu.
     */
     public static async getGeometryType(sublayer: __esri.Sublayer, signal?: AbortSignal): Promise<GeometryType> {
        await sublayer.load(signal);
        return sublayer.sourceJSON.geometryType;
    }
    
    /**
     * - Poskytnutí hodnoty 'displayField' z metadat podvrstvy ({@link sublayer.sourceJSON}).
     * @param sublayer - Podvrstva z níž hodnotu získáváme.
     * @param signal - Signalizace zrušení dotazu.
     */
     public static async getDisplayField(sublayer: __esri.Sublayer, signal?: AbortSignal): Promise<string> {
        await sublayer.load(signal);
        return LayerHelper.getDisplayFieldSinc(sublayer);
    }
    
    /**
     * - Poskytnutí hodnoty 'displayField' z metadat podvrstvy ({@link sublayer.sourceJSON}).
     * - Před zavoláním funkce je nutné načíst metadata pomocí {@link sublayer.load}
     * @param sublayer - Podvrstva z níž hodnotu získáváme.
     */
     public static getDisplayFieldSinc(sublayer: __esri.Sublayer): string {
        return sublayer.sourceJSON?.displayField;
    }
    
    /**
     * - Seřazuje podvrstvy {@link sublayers} typu podle pořadí v mapě.
     * @param jimuMapView - Aktivní view mapy.
     * @param sublayers - Podvrstvy, nebo jejich GisId pro které pořadí zjišťujeme.
     */
    public static orderLayer(jimuMapView: JimuMapView, sublayers: Array<__esri.Sublayer>): Array<__esri.Sublayer>;
    public static orderLayer(jimuMapView: JimuMapView, sublayers: Array<string>): Array<string>;
    public static orderLayer(jimuMapView: JimuMapView, sublayers: Array<__esri.Sublayer> | Array<string>): Array<__esri.Sublayer> | Array<string>;
    public static orderLayer(jimuMapView: JimuMapView, sublayers: Array<__esri.Sublayer> | Array<string>): Array<__esri.Sublayer> | Array<string> {
        const allSublayers = LayerHelper.getAllSublayers(jimuMapView);
    
        let filteredSublayers = allSublayers.filter(sublayer => {
            return sublayers.includes(typeof sublayers[0] === "string" ? LayerHelper.getGisIdLayersFromLayer(sublayer) : sublayer as any);
        }).toArray();
    
        filteredSublayers = filteredSublayers.reverse();
    
        if (typeof sublayers[0] === "string") {
            return filteredSublayers.map(LayerHelper.getGisIdLayersFromLayer);
        }
        return filteredSublayers;
    }
    
    /**
     * - Zjišťuje zda je podvrstva {@link sublayer} nevjíše z podvrstev {@link sublayers} ve struktuře webmapy.
     * @param jimuMapView - Aktivní view mapy.
     * @param sublayer - Podvrstva, nebo její GisId. 
     * @param sublayers - Podvrstvy, nebo jejich GisId.
     */
    public static isTopLayer(jimuMapView: JimuMapView, sublayer: __esri.Sublayer, sublayers: Array<__esri.Sublayer>): boolean;
    public static isTopLayer(jimuMapView: JimuMapView, sublayer: string, sublayers: Array<string>): boolean;
    public static isTopLayer(jimuMapView: JimuMapView, sublayer: __esri.Sublayer | string, sublayers: Array<__esri.Sublayer> | Array<string>): boolean {
        return LayerHelper.orderLayer(jimuMapView, sublayers)[0] === sublayer;
    }
    
    /**
     * Zjišťuje zda je podvrstva {@link sublayer} víše ve struktuře mapy než {@link sublayer2}.
     * @param jimuMapView - Aktivní view mapy.
     * @param sublayer - Podvrstva.
     * @param sublayer2 - Druhá podvrstva.
     */
    public static isHigher(jimuMapView: JimuMapView, sublayer: __esri.Sublayer, sublayer2: __esri.Sublayer): boolean {
        return LayerHelper.orderLayer(jimuMapView, [sublayer, sublayer2])[0] === sublayer;
    }
    
    /**
     * - Ověřuje zda má vrstva {@link layer} zaplou archivaci.
     * @param layer - Vrstva/Podvrstva u které zjišťujeme archivaci.
     */
    public static async supportsArchiving(layer: __esri.FeatureLayer | __esri.Sublayer): Promise<boolean> {
        if (layer.loadStatus !== "loaded") {
            await layer.load();
        }
    
        return layer.sourceJSON?.archivingInfo?.supportsQueryWithHistoricMoment || false;
    }
    
    /**
     * - Ověřuje zda {@link služba layer} povolenou operaci dynamicLayer.
     * @param layer - Služba u které zjišťujeme dynamicLayer.
     */
    public static async supportsDynamicLayers(layer: __esri.MapImageLayer | __esri.TileLayer): Promise<boolean> {
        if (layer.loadStatus !== "loaded") {
            await layer.load();
        }
    
        return layer.sourceJSON?.supportsDynamicLayers || false;
    }
    
    /**
     * - Vytvoří kopii {@link layer vrstvy}, změní její URL na FeatureServer a zavolá metodu applyEdits.
     * - Důvod je ten, že vrstvy s URL MapServer nelze editovat.
     * - Doporučuje se pro editaci negrafických záznamů.
     * @param layer - Vrstva ve které chceme editovat prvky.
     * @param edits - Změny v prvcích.
     * @param options
     */
    public static async applyFeatureLayerEdits(layer: __esri.FeatureLayer, edits: __esri.FeatureLayerBaseApplyEditsEdits, options?: __esri.FeatureLayerBaseApplyEditsOptions): Promise<__esri.EditsResult> {
        const FeatureLayer = await ArcGISJSAPIModuleLoader.getModule("FeatureLayer");
        const layerCopy = new FeatureLayer({
            url: layer.url.replace("MapServer", "FeatureServer"),
            layerId: layer.layerId
        });
    
        await layerCopy.load();
    
        return layerCopy.applyEdits(edits, options);
    }
    
    /**
     * - Dotaz pro všechny prvky odpovídající {@link query parametrům dotazu}, nehledě na omezení počtu prvků na straně serveru/služby (provede se více dotazů).
     * - Silně doporučuji v {@link query parametrech dotazu} mít vyplněný parametr {@link __esri.QueryProperties.num}, a nemít tam moc vysoké číslo. Funkce by mohla vrátit i stovky tisíc prvků.
     * @param layer - Vrstva, ze které získávámě prvky.
     * @param query - Parametry dotazu.
     */
    public static async queryTopFeatures(layer: __esri.Sublayer | __esri.FeatureLayer, query: __esri.Query | __esri.QueryProperties, options?: __esri.SublayerQueryFeaturesOptions): Promise<__esri.FeatureSet> {
        /** - Maximální počet nalezených prvků. */
        const num = query.num;
    
        if (!!num && num <= 1000) {
            return layer.queryFeatures(query);
        }
    
        const featureLayer = "layerId" in layer ? layer : await layer.createFeatureLayer();
    
        /** - Parametry dotazu pro získání identifikátorů všech odpovídajících prvků. */
        const idsQuery = { ...query };
        // Odebrání nežádoucích parametrů. Nějaké ještě mohou přibýt
        delete idsQuery.num;
        delete idsQuery.outFields;
        delete idsQuery.outSpatialReference;
        delete idsQuery.returnGeometry;
        /** - Identifikátory všech prvků odpovídajících {@link query parametrům}. */
        const ids  = await featureLayer.queryObjectIds(idsQuery, options);
    
        if (!Array.isArray(ids) || ids.length <= 1000) {
            return layer.queryFeatures(query);
        }
    
        if (ids.length > num) {
            ids.length = num;
        }
    
        /** - Identifikátory všech prvků odpovídajících {@link query parametrům} rozdělené po 1000. */
        const splitedIds: Array<typeof ids> = [];
    
        while (ids.length > 0) {
            splitedIds.push(ids.splice(0, 1000));
        }
    
        const featuresQuery = { ...query };
        // Odebrání nežádoucích parametrů. Nějaké ještě mohou přibýt
        delete featuresQuery.objectIds;
        delete featuresQuery.where;
        delete featuresQuery.geometry;
        delete featuresQuery.num;
    
        const featureSets = await Promise.all(splitedIds.map(objectIds => {
            return layer.queryFeatures({
                ...featuresQuery,
                objectIds
            }, options);
        }));
    
        const featureSet = featureSets[0];
    
        for (let i = 1; i < featureSets.length; i++) {
            if (Array.isArray(featureSets[i].features)) {
                featureSet.features.push(...featureSets[i].features);
            }
        }
    
        return featureSet;
    }
    
    /**
     * - Ověřuje zda je {@link layer vrstva} načtená přes {@link serverType MapServer/FeatureServer}
     * @param layer - Feature vrstva.
     * @param serverType - Typ serveru, který ověřujeme.
     */
    public static isServerLayer(layer: __esri.FeatureLayer, serverType: "MapServer" | "FeatureServer"): boolean {
        return layer.url.includes(serverType);
    }
    
    /**
     * - Poskytuje všechny vrstvy typu {@link type} v {@link jimuMapView mapě}.
     * @param jimuMapView - JimuMapView mapy, ve které vrstvy hledáme.
     * @param type - Typ vrstev, které hledáme.
     */
    public static getAllLayersOfType<T extends LayerTypes>(jimuMapView: JimuMapView, type: T): __esri.Collection<T extends LayerTypes.FeatureLayer ? __esri.FeatureLayer : T extends LayerTypes.MapImageLayer ? __esri.MapImageLayer : T extends LayerTypes.WMSLayer ? __esri.WMSLayer : __esri.Layer> {
        return jimuMapView.view.map.layers.filter(layer => layer.type === type) as __esri.Collection<any>;
    }
    
    public static async loadAccessibleLayers(jimuMapView: JimuMapView, displayNotification: boolean = false): Promise<void> {
        const notAccesibleLayers: Array<__esri.Layer> = [];
    
        await Promise.all(jimuMapView.view.map.layers.map(layer => {
            if (!layer.loaded) {
                return layer
                    .load()
                    .catch(err => {
                        notAccesibleLayers.push(layer);
                        console.warn(err);
                    });
            }
        }).toArray());
    
        if (notAccesibleLayers.length > 0) {
            jimuMapView.view.map.layers.removeMany(notAccesibleLayers);
    
            if (displayNotification) {
                NotificationHelper.addNotification({
                    type: "warning",
                    message: notAccesibleLayers.length === 1 ? `Vrstva "${notAccesibleLayers[0].title}" není dostupná. Byla odebrána z webové mapy.` : `Vrstvy "${notAccesibleLayers.map(l => l.title).join(`", "`)}" nejsou dostupné. Byly odebrány z webové mapy.`
                });
            }
        }
    }
    
    /**
     * - Rekurzivně mení viditelnost {@link layer podvrstvy} a všech jejích nadřazených skupinových vrstev.
     * @param layer - Podvrstva které měníme viditelnost.
     * @param visible - Hodnota viditelnosti na kterou měníme.
     */
    public static toggleVisibility(layer: __esri.Sublayer, visible: boolean) {
        layer.visible = visible;
        layer.layer.visible = visible;
    
        if (layer.layer.id !== layer.parent.id) {
            LayerHelper.toggleVisibility(layer.parent as __esri.Sublayer, visible);
        }
    }

    /**
     * - Vytvoření Feature vrstvy přes {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-FeatureLayer.html#dynamicDataSource dynamicDataSource}.
     * @param url - URL mapové služby.
     * @param workspaceId - ID GDB zaregistrované v AGS.
     * @param dataSourceName - Název zdrojové tabulky.
     * @param load - Mají se načíst metadata vrstvy?
     */
    public static async createDynamicDataSourceLayer(url: string, workspaceId: string, dataSourceName: string, load?: boolean): Promise<__esri.FeatureLayer> {
        const FeatureLayer = await ArcGISJSAPIModuleLoader.getModule("FeatureLayer");   

        const layer = new FeatureLayer({
            definitionExpression: "1=1",
            url,
            dynamicDataSource: {
                type: "data-layer",
                dataSource: {
                    gdbVersion: null,
                    type: "table",
                    workspaceId,
                    dataSourceName
                },
                fields: undefined
            }
        });

        if (load) {
            await layer.load();
        }

        return layer;
    }
};