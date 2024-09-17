import { type JimuMapView } from "jimu-arcgis";
import { RequestHelper, LayerHelper } from "widgets/shared-code/helpers";
import { EKnownLayerExtension } from "widgets/shared-code/enums";

/**
 * - Helper pro získání zdrojových tříd prvků vrstvy, a dalších metadat.
 * - Funkcionalita se používá pouze na SD a je na to potřeba speciální SOE funkce.
 */
export default class LayerInfoHelper {
    private static promises: Array<{
        layer: __esri.MapImageLayer;
        promise: Promise<HSI.SdMapServerSoe.ILayerInfoResponse>;
    }> = [];

    /**
     * - Poskytuje metadata {@link mapImageLayer mapové služby} včetně zdrojových tříd prvků jejích podvrstev.
     * @param mapImageLayer - Mapová služba ke které hledáme metadata.
     */
    private static load(mapImageLayer: __esri.MapImageLayer): Promise<HSI.SdMapServerSoe.ILayerInfoResponse> {
        const existingPromise = LayerInfoHelper.promises.find(({ layer }) => layer === mapImageLayer);

        if (!!existingPromise) {
            return existingPromise.promise;
        }

        const promise = LayerHelper
            .hasExtension(mapImageLayer, EKnownLayerExtension.SdSoe)
            .then(hasExtension => {
                if (hasExtension) {
                    return RequestHelper.jsonRequest<HSI.SdMapServerSoe.ILayerInfoResponse>(`${mapImageLayer.url}/exts/${LayerHelper.getExtensionValue(EKnownLayerExtension.SdSoe)}/LayerInfo`, {});
                }

                const emptyResponse: HSI.SdMapServerSoe.ILayerInfoResponse = {
                    layers: [],
                    workspaces: []
                };

                return emptyResponse;
            });

        LayerInfoHelper.promises.push({ layer: mapImageLayer, promise });

        return promise;
    }

    /**
     * - Poskytuje zdrojovou třídu prvků {@link sublayer podvrstvy}
     * @param sublayer - Podvrstva ukteré hledáme zdrojovou třídu prvků. 
     */
    public static async findMatchingLayerBySublayer(sublayer: __esri.Sublayer) {
        
        const mapImageLayer = sublayer.layer as __esri.MapImageLayer
        const hasExtensions = await LayerHelper.hasExtension(mapImageLayer, EKnownLayerExtension.SdSoe);
        
        if (!hasExtensions) {
            throw new Error("Mapová služba nemá nastavené SOE")
        }
        
        const loadedMapService =  await LayerInfoHelper.load(mapImageLayer)

        const matchingLayer = loadedMapService.layers.find(layer => layer.layerId === sublayer.id);
        if (matchingLayer) {
            return matchingLayer;  
        }

        return null;
    }
    
    /**
     * - Poskytuje všechny podvrstvy v {@link jimuMapView mapě}, které mají zdrojovou třídu prvků {@link dataset}.
     * @param jimuMapView - Aktivní view mapy.
     * @param dataset - Třída prvků ke které hledáme podvrstvy.
     */
    public static async findLayersByDataset(jimuMapView: JimuMapView, dataset: string): Promise<Array<__esri.Sublayer>> {
        const mapImageLayers = await LayerHelper.findAllMapImageLayersWithExtensions(jimuMapView, EKnownLayerExtension.SdSoe); 
        const layerInfos = await Promise.all(mapImageLayers.map(LayerInfoHelper.load));

        return layerInfos.reduce((prev, current, index) => {
            return prev.concat(
                ...current.layers
                    .filter(({ datasetName }) => datasetName === dataset)
                    .map(({ layerId }) => mapImageLayers[index].findSublayerById(layerId))
            );
        }, [] as Array<__esri.Sublayer>);
    }
}