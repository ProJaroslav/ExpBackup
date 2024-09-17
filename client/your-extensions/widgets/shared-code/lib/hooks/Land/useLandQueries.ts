import { type ImmutableArray, React } from "jimu-core";
import { NotificationHelper, RequestHelper, LayerHelper } from "widgets/shared-code/helpers";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { ELoadStatus, EKnownLayerExtension } from "widgets/shared-code/enums";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import translations from "../translations/default";
const { useState, useEffect, useContext } = React;

/**
 * - Poskytuje dotazy pozemků.
 * - Speciální funkcionalita pro SD.
 * @param queryWhiteList - Názvy dotazů, které se mají načíst.
 */
export default function(queryWhiteList?: Array<string> | ImmutableArray<string>): HSI.UseLandQueries.IState {
    const [state, setState] = useState<HSI.UseLandQueries.IState>(loadingState);
    const messageFormater = useMessageFormater(translations);
    const jimuMapView = useContext(JimuMapViewContext);

    useEffect(() => {
        const abortController = new AbortController();
        setState(loadingState);

        (async function() {
            try {
                const layers = await LayerHelper.findAllMapImageLayersWithExtensions(jimuMapView, EKnownLayerExtension.SdSoe, true);

                const response = await RequestHelper.jsonRequest<{ Queries: Array<HSI.UseLandQueries.IQuery>; }>(`${layers[0].url}/exts/${LayerHelper.getExtensionValue(EKnownLayerExtension.SdSoe)}/Pozemky/GetQueries`, {}, abortController.signal);

                if (Array.isArray(queryWhiteList)) {
                    response.Queries = response.Queries.filter(({ Name }) => queryWhiteList.includes(Name));
                }

                if (!abortController.signal.aborted) {
                    setState({
                        loadStatus: ELoadStatus.Loaded,
                        queries: response.Queries
                    });
                }
            } catch(err) {
                if (!abortController.signal.aborted) {
                    console.warn(err);
                    setState({ loadStatus: ELoadStatus.Error, errorMessage: NotificationHelper.getErrorMessage(err) });
                }
            }
        })();

        return function() {
            abortController.abort();
        }
    }, [setState, jimuMapView, queryWhiteList]);

    return state;
}

const loadingState: HSI.UseLandQueries.IState = {
    loadStatus: ELoadStatus.Pending
}