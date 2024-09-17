import { JimuMapView } from "jimu-arcgis";
import { RequestHelper, LayerHelper, LayerDefinitionHelper } from "widgets/shared-code/helpers";
import { EKnownLayerExtension, EFeatureType } from "widgets/shared-code/enums";

/**
 * - Získání relačních tříd.
 * @see {@link https://hsi0916.atlassian.net/wiki/spaces/CETINWGIS/pages/2829352969/Vlastn+implementace+rela+n+ch+t+d#GetReachableRelationships}
 */
export default async function(jimuMapView: JimuMapView, subayerDefinition: HSI.ISublayerDefinition): Promise<HSI.SelectionResultWidget.IRelationship[]> {
    //#region - Staré řešení - ptá se do všech mapových služeb v mapě
    // /** - Všechny mapové služby se zaplou SOE pro poskytnutí relací. */
    // const mapImageLayers = await findAllMapImageLayersWithExtensions(jimuMapView, EKnownLayerExtension.RelationSoe);

    // /** - Všechny nalezené relační třídy. */
    // const relationshipCoolections = await Promise.all<Array<Omit<IRelationship, "layerType">>>(mapImageLayers.map(async mapImageLayer => {
    //     const response = await jsonRequest<IGetReachableRelationshipsResponse>(`${mapImageLayer.url}/exts/${EKnownLayerExtension.RelationSoe}/Relationships/GetReachableRelationships`, {
    //         layer: JSON.stringify(subayerDefinition)
    //     });

    //     return response.relationships;
    // }));

    // /** - Relačních trídy, které jsou v mapě. */
    // const relationshipColectionInMap: Array<IRelationship> = [];

    // //#region - Filtrace relačních tríd, které jsou v mapě.
    // for (let relationshipColections of relationshipCoolections) {
    //     for (let relationshipColection of relationshipColections) {
    //         let table = await findTablesByDefinition(jimuMapView, relationshipColection.layer);
    //         if (!!table) {
    //             relationshipColectionInMap.push({
    //                 ...relationshipColection,
    //                 featureType: EFeatureType.Table
    //             });
    //         } else {
    //             let [sublayer] = await findSublayersByDefinition(jimuMapView, relationshipColection.layer);
    //             if (!!sublayer) {
    //                 relationshipColectionInMap.push({
    //                     ...relationshipColection,
    //                     featureType: EFeatureType.Sublayer
    //                 });
    //             }
    //         }
    //     }
    // }
    // //#endregion

    // return relationshipColectionInMap;

    //#endregion
    //#region - Nové řešení ptá se pouze do mapové služby ze které pochází subayerDefinition

    const mapImageLayer = await LayerDefinitionHelper.findMapImageLayerByDefinition(jimuMapView, subayerDefinition);

    if (!(await LayerHelper.hasExtension(mapImageLayer, EKnownLayerExtension.RelationSoe))) {
        throw new Error(`Service "${subayerDefinition.mapServiceName}" does not has SOE extension "${LayerHelper.getExtensionValue(EKnownLayerExtension.RelationSoe)}"`);
    }

    const response = await RequestHelper.jsonRequest<HSI.SelectionResultWidget.IGetReachableRelationshipsResponse>(`${mapImageLayer.url}/exts/${LayerHelper.getExtensionValue(EKnownLayerExtension.RelationSoe)}/Relationships/GetReachableRelationships`, {
        layer: JSON.stringify(subayerDefinition)
    });
    
    /** - Relačních trídy, které jsou v mapě. */
    const relationshipColectionInMap: Array<HSI.SelectionResultWidget.IRelationship> = [];

    if (Array.isArray(response?.relationships)) {
        for (let relationship of response.relationships) {
            let table = await LayerDefinitionHelper.findTablesByDefinition(jimuMapView, relationship.layer);
            if (!!table) {
                relationshipColectionInMap.push({
                    ...relationship,
                    featureType: EFeatureType.Table
                });
            } else {
                let [sublayer] = await LayerDefinitionHelper.findSublayersByDefinition(jimuMapView, relationship.layer);
                if (!!sublayer) {
                    relationshipColectionInMap.push({
                        ...relationship,
                        featureType: EFeatureType.Sublayer
                    });
                }
            }
        }
    }

    return relationshipColectionInMap;
    //#endregion
}