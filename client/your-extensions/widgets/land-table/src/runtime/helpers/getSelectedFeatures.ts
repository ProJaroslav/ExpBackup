import { type JimuMapView } from "jimu-arcgis";
import { LayerInfoHelper } from "widgets/shared-code/helpers";
import locateFeatures from "./locateFeatures";

/**
 * - Poskytuje prvky vybrané v {@link table tabulce}.
 * @param table - Tabulka ve které vyhledáváme prvky.
 * @param jimuMapView - Aktivní view mapy.
 * @param queryResponse - Prvky v tabulce.
 * @param noLayerWithSoeMessage - Chybová hláška pokud neexistuje potřebné SOE.
 * @param noClassNameLayerMessage - Chybová hláška pokud v {@link jimuMapView mapě} není vrstva s potřebnou třídou prvků.
 */
export default async function(table: __esri.FeatureTable, jimuMapView: JimuMapView, queryResponse: HSI.UseLandQueries.IExecuteQueryResponse, noLayerWithSoeMessage: string, noClassNameLayerMessage: string) {
    const response = await locateFeatures(table, jimuMapView, queryResponse, noLayerWithSoeMessage);

    const oids: { [className: string]: Array<number>; } = {};

    for (let { ClassName, ObjectId } of Object.values(response)) {
        if (!Array.isArray(oids[ClassName])) {
            oids[ClassName] = [];
        }
        oids[ClassName].push(ObjectId);
    }

    const promises: Array<Promise<__esri.FeatureSet>> = [];
    
    for (let className of Object.keys(oids)) {
        const layers = await LayerInfoHelper.findLayersByDataset(jimuMapView, className);
        if (layers.length < 1) {
            throw new Error(noClassNameLayerMessage.replace("{0}", className))
        }
        for (let layer of layers) {
            promises.push(layer.queryFeatures({ objectIds: oids[className], returnGeometry: true, outFields: [layer.objectIdField] }));
        }
    }

    return Promise.all(promises);
}