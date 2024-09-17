import { React } from "jimu-core";
import { useMessageFormater, useIsSomeSelected } from "widgets/shared-code/hooks";
import { NotificationHelper } from "widgets/shared-code/helpers";
import SelectionManager from "widgets/shared-code/SelectionManager";
import { LoadingButton } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { ELoadStatus } from "widgets/shared-code/enums";
import translations from "../translations/default";
import getSelectedFeatures from "../helpers/getSelectedFeatures";
const { useState, useContext } = React;

/** Tlačítko pro přidání prvků vybraných v tabulce do výběru. */
export default function({ tableRef, landSearchState }: HSI.LandTableWidget.IAddToSelectionButton) {
    /** - Je v {@link tableRef tabulce} vybrán nějaký prvek? */
    const isSomeSelected = useIsSomeSelected(tableRef);
    const [isSelecting, toggleSelecting] = useState<boolean>(false);
    const messageFormater = useMessageFormater(translations);
    const jimuMapView = useContext(JimuMapViewContext);

    /** - Přidání prvků vybraných v tabulce do výběru. */
    async function addToSelection() {
        try {
            if (landSearchState?.loadStatus === ELoadStatus.Loaded && landSearchState.response.IsReport === false) {
                toggleSelecting(true);
                const featureSets = await getSelectedFeatures(tableRef.current, jimuMapView, landSearchState.response, messageFormater("noLayerWithSoe"), messageFormater("noClassNameLayer"));
                await Promise.all(featureSets.map(featureSet => {
                    return SelectionManager
                        .getSelectionSet(jimuMapView)
                        .addFetureSet(featureSet);
                }));
            }

        } catch(err) {
            console.warn(err);
            NotificationHelper.handleError(messageFormater("failedToAddToSelection"), err, "warning");
        } finally {
            toggleSelecting(false);
        }
    }

    return <LoadingButton
        disabled={!isSomeSelected || isSelecting}
        onClick={addToSelection}
        loading={isSelecting}
    >
        {messageFormater("addToSelectionButton")}
    </LoadingButton>;
}