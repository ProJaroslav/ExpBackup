import { JimuMapView } from "jimu-arcgis";
import { DbRegistryLoader, FeatureHelper, LayerHelper, RequestHelper, LayerDefinitionHelper } from "widgets/shared-code/helpers";
import { EDbRegistryKeys, EFeatureType, EKnownLayerExtension } from "widgets/shared-code/enums";

export default class RelationHelper {
    /**
     * - Načtení navazbených prvků v relační třídě {@link relationshipClassId} pro prvek {@link feature}.
     * @param jimuMapView - Aktivní view mapy.
     * @param feature - Prvek pro který hledáme navazbené prvky.
     * @param relationshipClassId - Identifikátor relační třídy.
     * @param destinationMapImageLayer - Mapová služba, do které se dotazujeme pro navazbené prvky.
     */
    public static async fetchRelationObjects(jimuMapView: JimuMapView, feature: __esri.Graphic, relationshipClassId: string, destinationMapImageLayer?: __esri.MapImageLayer): Promise<__esri.FeatureSet> {
        /** - Definice vrstvy, ze které pochází {@link feature výchozí prvek}. */
        let originDefinition: HSI.ISublayerDefinition | HSI.ITableDefinition;
        /** - Konfigurace relačních vazeb. */
        let relationConfig: HSI.IRelationshipQueriesDbValue;
        [relationConfig, originDefinition] = await Promise.all([
            DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.RelationshipQueries, scope: "g", type: "json" }),
            LayerDefinitionHelper.getLayerDefinitionFromFeature(jimuMapView, feature)
        ]);
        /** - Konfigurace {@link relationshipClassId této relační vazby}. */
        const attributeRelationship = relationConfig.attributeRelationships.find(attributeRelationship => attributeRelationship.id === relationshipClassId);
        const isOrigin = LayerDefinitionHelper.matchDefinition(attributeRelationship.originLayer, originDefinition);
        
        if (!destinationMapImageLayer) {
            /** - Definice vrstvy, ze které získáváme navazbené prvky. */
            const destinationDefinition = isOrigin ? attributeRelationship.destinationLayer : attributeRelationship.originLayer;
        
            destinationMapImageLayer = await LayerDefinitionHelper.findMapImageLayerByDefinition(jimuMapView, destinationDefinition);
        }
    
        if (!(await LayerHelper.hasExtension(destinationMapImageLayer, EKnownLayerExtension.RelationSoe))) {
            throw new Error(`Service '${destinationMapImageLayer.title}' does not have required extention '${LayerHelper.getExtensionValue(EKnownLayerExtension.RelationSoe)}'`);
        }
    
        //#region - Zajištění, že prvek má všechny nezbytné atributy
        /** - Vazební atributy, které prvek musí obsahovat, aby dotaz úspěšně proběhl. */
        const featureKeys = [];
    
        if (isOrigin) {
            if (!!attributeRelationship.originPrimaryKey) {
                featureKeys.push(attributeRelationship.originPrimaryKey);
            }
        } else {
            if (!!attributeRelationship.destinationPrimaryKey) {
                featureKeys.push(attributeRelationship.destinationPrimaryKey);
            }
            if (!!attributeRelationship.originForeignKey && attributeRelationship.cardinality !== "ManyToMany") {
                featureKeys.push(attributeRelationship.originForeignKey);
            }
        }
    
        if (featureKeys.some(key => !(key in feature.attributes))) {
            const originDefinition = isOrigin ? attributeRelationship.originLayer : attributeRelationship.destinationLayer;
            const originLayer = await LayerDefinitionHelper.findSublayerByDefinition(jimuMapView, originDefinition) || await LayerDefinitionHelper.findTablesByDefinition(jimuMapView, originDefinition);
            const featureSet = await originLayer.queryFeatures({
                objectIds: [feature.getObjectId()],
                outFields: ['*'],
                num: 1,
                returnGeometry: true
            });
    
            if (!!featureSet.features[0]) {
                feature = featureSet.features[0];
            }
        }
        //#endregion
        //#region - Odebrání nulových vlastností - pokud např. geometry je rovno null, tak služba vrací chybu.
        const featureJson = feature.toJSON();
        
        for (let key in featureJson) {
            if (!featureJson[key]) {
                delete featureJson[key];
            }
        }
        //#endregion
    
        const response = await RequestHelper.jsonRequest<HSI.IGetRelatedObjectsResponse>(`${destinationMapImageLayer.url}/exts/${LayerHelper.getExtensionValue(EKnownLayerExtension.RelationSoe)}/Relationships/GetRelatedObjects`, {
            layer: JSON.stringify(originDefinition),
            relationshipClassId: relationshipClassId,
            feature: JSON.stringify(featureJson)
        });
    
        /** - Vrstva ve které se nalezly navazbené prvky. */
        let originLayer: __esri.Sublayer | __esri.FeatureLayer = await LayerDefinitionHelper.findSublayerByDefinition(jimuMapView, response.relatedObjects.layer)
    
        if (!originLayer) {
            originLayer = await LayerDefinitionHelper.findTablesByDefinition(jimuMapView, response.relatedObjects.layer);
        }
    
        if (originLayer.loadStatus !== "loaded") {
            await originLayer.load();
        }
        
        return FeatureHelper.createFeaturesFromJson(originLayer, response.relatedObjects.features, originLayer.fullExtent?.spatialReference || jimuMapView.view.spatialReference);
    }
    
    /**
     * - Načtení relačních tříd pro {@link subayerDefinition vrstvu} (popřípadě pro {@link feature prvek}).
     * @param jimuMapView - Aktivní view mapy.
     * @param subayerDefinition - Definice vrstvy pro kterou hledáme relační třídy.
     * @param feature - Prvek pro upřesnění relačních tříd. {@link subayerDefinition Deinice} musí odpovídat zdrojové vrstvě prvku. Prvek by neměl být potřeba, třídy by se měli najít na základě {@link subayerDefinition vrstvy}, ale možná v SOE dojde ke změně a ničemu to neuškodí.
     */
    public static async getReachableRelationships(jimuMapView: JimuMapView, subayerDefinition: HSI.ISublayerDefinition, feature?: __esri.Graphic): Promise<HSI.RelationHelper.IGetNotEvaluatedReachableRelationshipsResponse> {
        const mapImageLayer = await LayerDefinitionHelper.findMapImageLayerByDefinition(jimuMapView, subayerDefinition);
    
        const response = await RelationHelper.getReachableRelationshipsRequest(mapImageLayer, subayerDefinition, feature, false);
        
        /** - Relačních trídy, které jsou v mapě. */
        const relationshipColectionInMap: HSI.RelationHelper.IGetNotEvaluatedReachableRelationshipsResponse = [];
    
        if (Array.isArray(response?.relationships)) {
            for (let relationship of response.relationships) {
                let table = await LayerDefinitionHelper.findTablesByDefinition(jimuMapView, relationship.layer);
                let featureType: EFeatureType;
                if (!!table) {
                    featureType = EFeatureType.Table;
                } else {
                    let [sublayer] = await LayerDefinitionHelper.findSublayersByDefinition(jimuMapView, relationship.layer);
                    if (!sublayer) {
                        continue;
                    }
                    featureType = EFeatureType.Sublayer;
                }
                relationshipColectionInMap.push({
                    ...relationship,
                    featureType
                });
            }
        }
    
        return relationshipColectionInMap;
    }
    
    /**
     * - Načtení relačních tříd pro {@link subayerDefinition vrstvu} (popřípadě pro {@link feature prvek}).
     * - S relačními třídami se načtou i prvky navazbené na {@link prvek feature}.
     * - Vrací se pouze relační prvky s alespoň jedním navazbeným prvkem.
     * @param jimuMapView - Aktivní view mapy.
     * @param feature - Prvek ke kterému získáváme relace.
     */
    public static async getReachableEvaluatedRelationships(jimuMapView: JimuMapView, feature: __esri.Graphic): Promise<HSI.RelationHelper.IGetEvaluatedReachableRelationshipsResponse> {
        /** - Všechny mapové služby se zaplou SOE pro poskytnutí relací. */
        const mapImageLayers = await LayerHelper.findAllMapImageLayersWithExtensions(jimuMapView, EKnownLayerExtension.RelationSoe);
        /** - Definice zdrojové vrstvy/podvrstvy {@link feature prvku}. */
        const layerDefinition = await LayerDefinitionHelper.getLayerDefinitionFromFeature(jimuMapView, feature);
    
        /** - Odpověď funkce. */
        const response: HSI.RelationHelper.IGetEvaluatedReachableRelationshipsResponse = {
            errors: [],
            success: []
        };
    
        await Promise.all(mapImageLayers.map(async mapImageLayer => {
            try {
                const relationshipColections = await RelationHelper.getReachableRelationshipsRequest(mapImageLayer, layerDefinition, feature, true);
                if (Array.isArray(relationshipColections.relationships)) {
                    for (let relationshipColection of relationshipColections.relationships) {
                        if (Array.isArray(relationshipColection.features) && relationshipColection.features.length > 0) {
                            let layer: __esri.Sublayer | __esri.FeatureLayer = await LayerDefinitionHelper.findTablesByDefinition(jimuMapView, relationshipColection.layer);
                            let featureType: EFeatureType;
                    
                            if (!!layer) {
                                featureType = EFeatureType.Table;
                            } else {
                                [layer] = await LayerDefinitionHelper.findSublayersByDefinition(jimuMapView, relationshipColection.layer);
                                if (!layer) {
                                    continue;
                                }
                                featureType = EFeatureType.Sublayer;
                            }
                    
                            let featureSet = await FeatureHelper.createFeaturesFromJson(layer, relationshipColection.features, layer.fullExtent?.spatialReference || jimuMapView.view.spatialReference);
                    
                            response.success.push({
                                forward: relationshipColection.forward,
                                id: relationshipColection.id,
                                label: relationshipColection.label,
                                layer: relationshipColection.layer,
                                type: relationshipColection.type,
                                featureType,
                                featureSet
                            });
                        }
                
                    }
                }
            } catch(error) {
                console.warn(error);
                response.errors.push({
                    error,
                    mapService: mapImageLayer
                });
            }
        
        }));
    
        return response;
    }
    
    public static async getReachableRelationshipsRequest<T extends false>(mapImageLayer: __esri.MapImageLayer, subayerDefinition: HSI.ISublayerDefinition, feature?: __esri.Graphic, evaluate?: false): Promise<HSI.IGetReachableRelationshipsResponse<T>>
    public static async getReachableRelationshipsRequest<T extends true>(mapImageLayer: __esri.MapImageLayer, subayerDefinition: HSI.ISublayerDefinition, feature: __esri.Graphic, evaluate: true): Promise<HSI.IGetReachableRelationshipsResponse<T>>
    public static async getReachableRelationshipsRequest<T extends boolean>(mapImageLayer: __esri.MapImageLayer, subayerDefinition: HSI.ISublayerDefinition, feature?: __esri.Graphic, evaluate?: boolean): Promise<HSI.IGetReachableRelationshipsResponse<T>> {
        if (!(await LayerHelper.hasExtension(mapImageLayer, EKnownLayerExtension.RelationSoe))) {
            throw new Error(`Service "${subayerDefinition.mapServiceName}" does not have SOE extension "${LayerHelper.getExtensionValue(EKnownLayerExtension.RelationSoe)}"`);
        }
    
        const params: any = {
            layer: JSON.stringify(subayerDefinition),
            evaluate
        }
    
        if (!!feature) {
            const featureJson = feature.toJSON();
            for (let key in featureJson) {
                if (!featureJson[key]) {
                    delete featureJson[key]; //Odebrání nulových vlastností - pokud např. geometry je rovno null, tak služba vrací chybu.
                }
            }
            params.feature = JSON.stringify(featureJson);
        }
    
        return RequestHelper.jsonRequest<HSI.IGetReachableRelationshipsResponse<T>>(`${mapImageLayer.url}/exts/${LayerHelper.getExtensionValue(EKnownLayerExtension.RelationSoe)}/Relationships/GetReachableRelationships`, params);
    }
};