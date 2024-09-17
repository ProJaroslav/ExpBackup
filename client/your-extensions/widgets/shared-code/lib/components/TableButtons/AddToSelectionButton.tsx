import { React } from "jimu-core";
import { useMessageFormater, useIsSomeSelected } from "widgets/shared-code/hooks";
import { NotificationHelper } from "widgets/shared-code/helpers";
import { LoadingButton } from "widgets/shared-code/components";
import SelectionManager from "widgets/shared-code/SelectionManager";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import translations from "../translations/default";
const { useState, useContext } = React;

/** Tlačítko pro přidání prvků vybraných v tabulce do výběru. */
export default function({ tableRef, sublayerProvider }: HSI.FeatureTableComponent.IAddToSelectionButton) {
    /** - Je v {@link tableRef tabulce} vybrán nějaký prvek? */
    const isSomeSelected = useIsSomeSelected(tableRef);
    const [isSelecting, toggleSelecting] = useState<boolean>(false);
    const messageFormater = useMessageFormater(translations);
    const jimuMapView = useContext(JimuMapViewContext);

    /** - Přidání prvků vybraných v tabulce do výběru. */
    async function addToSelection() {
        try {
            toggleSelecting(true);
            const objectIds = tableRef.current.highlightIds.toArray().map(id => typeof id === "string" ? parseInt(id) : id);
            if (objectIds.length > 0) {
                const sublayers = await sublayerProvider();

                await Promise.all(sublayers.map(sublayer => {
                    return sublayer
                        .queryFeatures({
                            objectIds,
                            outFields: ["*"],
                            returnGeometry: true 
                        })
                        .then(featureset => {
                            return SelectionManager
                                .getSelectionSet(jimuMapView)
                                .addFetureSet(featureset);
                        });
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