import { type JimuMapView } from "jimu-arcgis";
import { EKnownLayerExtension } from "widgets/shared-code/enums";
import { LayerHelper, RequestHelper } from "widgets/shared-code/helpers";

/**
 * - Zavolání metody "Locate" pro prvky vybrané v {@link table tabulce}.
 * @param table - Tabulka ve které vyhledáváme prvky.
 * @param jimuMapView - Aktivní view mapy.
 * @param queryResponse - Prvky v tabulce.
 * @param noLayerWithSoeMessage - Chybová hláška pokud neexistuje potřebné SOE.
 */
export default async function(table: __esri.FeatureTable, jimuMapView: JimuMapView, queryResponse: HSI.LandTableWidget.IQueryState['response'], noLayerWithSoeMessage: string) {
    const layers = await LayerHelper.findAllMapImageLayersWithExtensions(jimuMapView, EKnownLayerExtension.SdSoe, true);

    return RequestHelper.jsonRequest<{ [id: string]: ILocateResponse; }>(`${layers[0].url}/exts/${LayerHelper.getExtensionValue(EKnownLayerExtension.SdSoe)}/Pozemky/Locate`, {
        Identifiers: table.highlightIds.map(id => queryResponse.DataRows.find(({ Values }) => Values[0] === id.toString()).id)
    });
}

interface ILocateResponse {
    ClassName: string;
    HasCoords: boolean;
    ObjectId: number;
    XMax: number;
    XMin: number;
    YMax: number;
    YMin: number;
}