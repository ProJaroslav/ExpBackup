import { React } from "jimu-core";
import translations from "../translations/default";
import { LayerHelper } from "widgets/shared-code/helpers";
import { ELoadStatus } from "widgets/shared-code/enums";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { PopperContext } from "widgets/shared-code/contexts";
import SelectionManager from "widgets/shared-code/SelectionManager";

const addIcon = require("jimu-ui/lib/icons/add-12.svg");

/**
 * - Hook poskytujicí funkci která vyvolává kontextovou nabídku nad relační třídou.
 * @param relations - Stav navazbených prvků.
 * @param itemReference - Reference DOM elementu nad kterým se vyvolala kontextová nabídka.
 * @param isTable - Jsou {@link relations prvky} negrafické?
 */
export default function(relations: HSI.SelectionResultWidget.ILoadedRelationObjects[string], itemReference: React.MutableRefObject<HTMLDivElement>, isTable: boolean) {
    const jimuMapView = React.useContext(JimuMapViewContext);
    /** - Otevření kontextového menu. */
    const popper = React.useContext(PopperContext);
    /** - Funkce pro překlady textů. */
    const messageFormater = useMessageFormater(translations);

    /** - Přidání relačních prvků do výběru. */
    async function addRelationsFeaturesToSelection() {
        try {
            if (relations?.state === ELoadStatus.Loaded && relations.result?.features.length > 0) {
                if (isTable) {
                    await SelectionManager.getSelectionSet(jimuMapView).updateByTableFeatureIds(
                        LayerHelper.getTableFromFeature(relations.result.features[0]).id,
                        relations.result.features.map(feature => feature.getObjectId())
                    );
                } else {
                    await SelectionManager.getSelectionSet(jimuMapView).updateByFeatureIds(
                        LayerHelper.getGisIdLayersFromLayer(LayerHelper.getSublayerFromFeature(relations.result.features[0])),
                        relations.result.features.map(feature => feature.getObjectId())
                    )
                }
            }
        } catch(err) {
            console.warn(err);
        }
    }

    /**
     * - Otevření kontextového menu.
     * @param ev - Událost kliknutí pravého tlačátka myši.
     */
     return function (ev: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        try {
            ev.stopPropagation();
            ev.preventDefault();
            if (relations?.state === ELoadStatus.Loaded && relations.result?.features.length > 0) {
                popper({
                    reference: itemReference,
                    position: {
                        x: ev.clientX,
                        y: ev.clientY
                    },
                    list: [
                        {
                            content: messageFormater("addConnectedFeatureContextMenu"),
                            closeOnClick: true,
                            icon: addIcon,
                            onClick: addRelationsFeaturesToSelection
                        }
                    ]
                });
            }
        } catch(err) {
            console.warn(err);
        }
    }
}