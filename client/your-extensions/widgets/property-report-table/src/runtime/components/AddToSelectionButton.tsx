import { React, utils } from "jimu-core";
import { LoadingButton } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { LayerHelper, NotificationHelper, LayerInfoHelper, EsriHelper, FeatureTableHelper } from "widgets/shared-code/helpers";
import SelectionManager from "widgets/shared-code/SelectionManager";
import { getDatasetIds } from "../helpers/tableHelper";
import translations from "../translations/default";

const { useState, useEffect, useContext } = React;

/** - Tlačítko pro přidání prvků vybraných v tabulce do výběru. */
export default function({ tableRef }: HSI.PropertyReportTableWidget.IAddToSelectionButtonProps) {
    const [loading, setLoading] = useState<boolean>(false);
    const [disabled, setDisabled] = useState<boolean>(true);
    const [selecting, setSelecting] = useState<boolean>(false);
    const jimuMapView = useContext(JimuMapViewContext);
    const messageFormater = useMessageFormater(translations);

    useEffect(() => {
        if (!!tableRef.current) {
            let lastQueryId: string;

            function testSelectability() {
                const queryId = lastQueryId = utils.getUUID();
                const abortController = new AbortController();
                setDisabled(true);
                setLoading(true);

                const datasetIds = getDatasetIds(tableRef.current);

                Promise.all(
                    Object.keys(datasetIds).map(dataSet => {
                        return LayerInfoHelper
                            .findLayersByDataset(jimuMapView, `dnt.${dataSet}`)
                            .then(sublayers => {
                                return Promise.all(
                                    sublayers.map(sublayer => {
                                        return LayerHelper
                                            .createFeatureLayer(sublayer)
                                            .then(featureLayer => featureLayer.queryFeatureCount({ objectIds: datasetIds[dataSet] }, { signal: abortController.signal }))
                                            .then(featureCount => {
                                                if (featureCount > 0 && queryId === lastQueryId && !abortController.signal.aborted) {
                                                    if (!abortController.signal.aborted) {
                                                        abortController.abort();
                                                    }
                                                    setDisabled(false);
                                                    setLoading(false);
                                                }
                                            });
                                    })
                                );
                            });
                    })
                )
                .catch(err => {
                    if (!abortController.signal.aborted) {
                        console.warn(err);
                    }
                })
                .finally(() => {
                    if (queryId === lastQueryId && !abortController.signal.aborted) {
                        setLoading(false);
                    }
                });
            }

            const listener = FeatureTableHelper.onSelectListeners(tableRef.current, testSelectability);
            return function() {
                EsriHelper.removeListeners(listener);
            }
        }

    }, [tableRef, !tableRef.current, jimuMapView]);

    async function setToSelection() {
        try {
            if (!loading && !disabled && !selecting) {
                setSelecting(true);
                const datasetIds = getDatasetIds(tableRef.current);
    
                await Promise.all(
                    Object.keys(datasetIds).map(dataSet => {
                        return LayerInfoHelper
                                .findLayersByDataset(jimuMapView, `dnt.${dataSet}`)
                                .then(sublayers => {
                                    return Promise.all(sublayers.map(sublayer => {
                                        return sublayer.queryFeatures({
                                            objectIds: datasetIds[dataSet],
                                            outFields: ["*"],
                                            returnGeometry: true
                                        })
                                        .then(featureSet => {
                                            return SelectionManager
                                                .getSelectionSet(jimuMapView)
                                                .addFetureSet(featureSet);
                                        });
                                    }));
                                });
                    })
                );
            }
        } catch(err) {
            console.warn(err);
            NotificationHelper.handleError(messageFormater("failedToAddToSelection"), err, "warning");
        } finally {
            setSelecting(false);
        }
    }

    return <LoadingButton
        loading={loading || selecting}
        disabled={loading || disabled || selecting}
        onClick={setToSelection}
    >
        {messageFormater("addToSelectionButton")}
    </LoadingButton>;
}