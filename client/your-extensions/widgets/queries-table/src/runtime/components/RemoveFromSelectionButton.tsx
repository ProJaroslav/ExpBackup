import { React } from "jimu-core";
import { Button } from "jimu-ui";
import { useMessageFormater, useHsiSelectionDictionary } from "widgets/shared-code/hooks";
import { LayerInfoHelper, LayerHelper, EsriHelper } from "widgets/shared-code/helpers";
import SelectionManager from "widgets/shared-code/SelectionManager";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import translations from "../translations/default";
const { useState, useContext, useEffect, memo } = React;

/** Tlačítko pro odebrání prvků vybraných v tabulce z výběru. */
export default memo<HSI.QueriesTableWidget.IRemoveFromSelectionButton>(function({ tableRef, selectedClass }) {
    const messageFormater = useMessageFormater(translations);
    const jimuMapView = useContext(JimuMapViewContext);
    const [sublayersGisIds, setGisIds] = useState<Array<string>>([]);
    const selection = useHsiSelectionDictionary({ jimuMapView, filterSublayers: sublayersGisIds });
    const [isDisabled, toggleDisabled] = useState<boolean>(true);

    useEffect(() => {
        if (!!selectedClass) {
            let isActive = true;
            (async function() {
                try {
                    const sublayers = await LayerInfoHelper.findLayersByDataset(jimuMapView, selectedClass.objectClass);
                    if (isActive) {
                        setGisIds(sublayers.map(sublayer => LayerHelper.getGisIdLayersFromLayer(sublayer)));
                    }

                } catch(err) {
                    console.log(err);
                }
            })();
    
            return function() {
                setGisIds([]);
                isActive = false;
            }
        }
    }, [selectedClass, setGisIds]);


    useEffect(() => {
        try {
            function checkSelection() {
                try {
                    if (!tableRef.current || tableRef.current.highlightIds.length < 1 || !selectedClass?.objectClass) {
                        toggleDisabled(true);
                    } else {
                        toggleDisabled(!Object.values(selection).some(feature => tableRef.current.highlightIds.includes(feature.getObjectId())));
                    }
                } catch(err) {
                    console.log(err);
                }
            }

            checkSelection();

            if (!!tableRef.current) {
                const listeners = [
                    tableRef.current.highlightIds.on("after-add", checkSelection),
                    tableRef.current.highlightIds.on("after-changes", checkSelection),
                    tableRef.current.highlightIds.on("after-remove", checkSelection)
                ];

                return function() {
                    EsriHelper.removeListeners(listeners);
                }
            }

        } catch(err) {
            console.warn(err);
        }
    }, [selection, toggleDisabled, tableRef.current]);

    async function removeFromSelection() {
        try {
            if (tableRef.current.highlightIds.length > 0) {
                await Promise.all(
                    Object
                        .values(selection)
                        .filter(feature => tableRef.current.highlightIds.includes(feature.getObjectId()))
                        .map(feature => SelectionManager.getSelectionSet(jimuMapView).destroyFeature(feature))
                );
            }
        } catch(err) {
            console.warn(err);
        }
    }

    return <Button
        disabled={isDisabled}
        onClick={removeFromSelection}
    >
        {messageFormater("removeFromSelectionButton")}
    </Button>;
});