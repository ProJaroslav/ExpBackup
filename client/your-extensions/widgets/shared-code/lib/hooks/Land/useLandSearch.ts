import { React, utils } from "jimu-core";
import { ELoadStatus, EKnownLayerExtension } from "widgets/shared-code/enums";
import { LayerHelper, NotificationHelper, RequestHelper } from "widgets/shared-code/helpers";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import translations from "../translations/default";

const { useState, useRef, useContext } = React;

/**
 * - Poskytuje funkci pro vyvolání dotazu pozemku a stav vyvolaného dotazu.
 * - Speciální funkcionalita pro SD.
 */
export default function(): HSI.UseLandQueries.ILandSearchReturn {
    const [landSearchState, setState] = useState<HSI.UseLandQueries.ILandSearchReturn['landSearchState']>();
    /** - ID probíhajícího dotazu. */
    const pendingQueryIdRef = useRef<string>();
    const jimuMapView = useContext(JimuMapViewContext);
    const messageFormater = useMessageFormater(translations);

    async function searchLand(queryParams: HSI.UseLandQueries.ILandSearchParams) {
        const queryId = pendingQueryIdRef.current = utils.getUUID();
        try {
            setState({ loadStatus: ELoadStatus.Pending });

            const layers = await LayerHelper.findAllMapImageLayersWithExtensions(jimuMapView, EKnownLayerExtension.SdSoe, true);

            const body = {
                QueryName: queryParams.query.Name,
                QueryParameterValues: JSON.stringify(
                    queryParams.query.Parameters
                        .map(({ Name }) => ({
                            Name,
                            Value: queryParams.queryParametresValues[Name] === undefined ? "" : queryParams.queryParametresValues[Name]
                        }))
                )
            };
    
            const { validity } = await RequestHelper.jsonRequest<{ validity: string; }>(`${layers[0].url}/exts/${LayerHelper.getExtensionValue(EKnownLayerExtension.SdSoe)}/Pozemky/ValidateQuery`, body);
    
            if (!!validity) {
                if (queryId === pendingQueryIdRef.current) {
                    NotificationHelper.addNotification({ type: "info", title: messageFormater("executeQueryValidationFailed"), message: validity });
                    setState(undefined)
                }
            } else {
                const response = await RequestHelper.jsonRequest<HSI.UseLandQueries.IExecuteQueryResponse | HSI.UseLandQueries.IExecuteQueryReportResponse>(`${layers[0].url}/exts/${LayerHelper.getExtensionValue(EKnownLayerExtension.SdSoe)}/Pozemky/ExecuteQuery`, body);
                if (queryId === pendingQueryIdRef.current) {
                    setState({ loadStatus: ELoadStatus.Loaded, response, queryParams });
                }
            }
        } catch(err) {
            console.warn(err);
            if (queryId === pendingQueryIdRef.current) {
                setState({ loadStatus: ELoadStatus.Error, errorMessage: NotificationHelper.getErrorMessage(err) });
            }
        }
    }

    return { landSearchState, searchLand };
}