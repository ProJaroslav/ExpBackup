import { React, utils } from "jimu-core";
import { LoadingButton } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { useHsiSelectionDictionary, useMessageFormater } from "widgets/shared-code/hooks";
import { LayerHelper, NotificationHelper, LayerInfoHelper, FeatureTableHelper, EsriHelper } from "widgets/shared-code/helpers";
import SelectionManager from "widgets/shared-code/SelectionManager";
import { getDatasetIds } from "../helpers/tableHelper";
import translations from "../translations/default";

const { useState, useEffect, useContext } = React;

/** - Tlačítko pro odebrání prvků vybraných v tabulce z výběru. */
export default function({ tableRef }: HSI.PropertyReportTableWidget.IAddToSelectionButtonProps) {
    const [loading, setLoading] = useState<boolean>(false);
    const [removing, setRemoving] = useState<boolean>(false);
    const [sublayersGisIds, setGisIds] = useState<Array<string>>([]);
    const jimuMapView = useContext(JimuMapViewContext);
    const selection = useHsiSelectionDictionary({ jimuMapView, filterSublayers: sublayersGisIds });
    const messageFormater = useMessageFormater(translations);

    useEffect(() => {
        if (!!tableRef.current) {
            let lastQueryId: string;

            function testSublayersToRemove() {
                const queryId = lastQueryId = utils.getUUID();
                setLoading(true);

                const datasetIds = getDatasetIds(tableRef.current);
                const allSublayers: Array<__esri.Sublayer> = [];

                Promise.all(
                    Object.keys(datasetIds).map(dataSet => {
                        return LayerInfoHelper
                            .findLayersByDataset(jimuMapView, `dnt.${dataSet}`)
                            .then(sublayers => {
                                allSublayers.push(...sublayers);
                            });
                    })
                )
                .then(() => {
                    if (queryId === lastQueryId) {
                        setGisIds(allSublayers.map(sublayer => LayerHelper.getGisIdLayersFromLayer(sublayer)));
                    }
                })
                .finally(() => {
                    if (queryId === lastQueryId) {
                        setLoading(false);
                    }
                });
            }

            const listener = FeatureTableHelper.onSelectListeners(tableRef.current, testSublayersToRemove);
    
            return function() {
                EsriHelper.removeListeners(listener);
            }
        }

    }, [tableRef, !tableRef.current, jimuMapView]);

    async function removeFromSelection() {
        try {
            if (!loading && !removing && Object.values(selection).length > 0) {
                setRemoving(true);
                const datasetIds = getDatasetIds(tableRef.current);
    
                await Promise.all(
                    Object.keys(datasetIds).map(dataSet => {
                        return LayerInfoHelper
                                .findLayersByDataset(jimuMapView, `dnt.${dataSet}`)
                                .then(sublayers => {
                                    sublayers.forEach(sublayer => {
                                        let selectionSet = SelectionManager.getSelectionSet(jimuMapView);
                                        let featuresToRemove = selectionSet.features.find(feature => LayerHelper.getSourceLayerFromFeature(feature) === sublayer);
                                        selectionSet.destroyFeature(featuresToRemove);
                                    });
                                });
                    })
                );
            }
        } catch(err) {
            console.warn(err);
            NotificationHelper.handleError(messageFormater("failedToRemoveFromSelection"), err, "warning");
        } finally {
            setRemoving(false);
        }
    }

    return <LoadingButton
        loading={loading || removing}
        disabled={loading || removing || Object.values(selection).length < 1}
        onClick={removeFromSelection}
    >
        {messageFormater("removeFromToSelection")}
    </LoadingButton>;
}