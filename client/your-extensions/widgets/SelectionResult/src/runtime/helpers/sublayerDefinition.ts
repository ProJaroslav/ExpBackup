import { JimuMapView } from "jimu-arcgis";
import { FeatureHelper, LayerHelper } from "widgets/shared-code/helpers";
import { EFeatureType } from "widgets/shared-code/enums";

/**
 * - Vytvoření identifikátoru vrstvy, potřebného pro získání relací.
 * @param jimuMapView - Aktivní view mapy.
 * @param feature - Prvke ze kterého identifikátor získáváme.
 */
export async function getSubLayerDefinitionFromFeature (jimuMapView: JimuMapView, feature: __esri.Graphic): Promise<HSI.ISublayerDefinition | HSI.ITableDefinition> {
    let layerId: number;
    let sourceMapImageLayer: __esri.MapImageLayer;

    const featureType = FeatureHelper.getFeatureType(feature);
    if (featureType === EFeatureType.Sublayer) {
        const sourceSublayer = LayerHelper.getSublayerFromFeature(feature);
        sourceMapImageLayer = sourceSublayer.layer as __esri.MapImageLayer;
        layerId = sourceSublayer.id;
    } else if (featureType === EFeatureType.Table) {
        const table = LayerHelper.getTableFromFeature(feature);
        sourceMapImageLayer = LayerHelper.getMapImageLayerFromTable(jimuMapView, table);
        layerId = table.layerId;
    }

    const sourceSublayerDefinition: HSI.ISublayerDefinition = {
        layerId,
        mapServiceName: LayerHelper.getServiceName(sourceMapImageLayer),
        mapName: await LayerHelper.findMapName(sourceMapImageLayer)
    };

    return sourceSublayerDefinition;
}

/** - Ověřuje zda se hodnoty v definici {@link definition1} rovnají hodnotám v definici {@link definition2}. */
export function equalsDefinition(definition1: HSI.ISublayerDefinition | HSI.ITableDefinition, definition2: HSI.ISublayerDefinition | HSI.ITableDefinition): boolean {
    return definition1.layerId === definition2.layerId && definition1.mapName === definition2.mapName && definition1.mapServiceName === definition2.mapServiceName;
}