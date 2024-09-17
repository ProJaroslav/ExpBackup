import { React } from "jimu-core";
import { useMessageFormater, useConfig } from "widgets/shared-code/hooks";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { HighlightButton } from "widgets/shared-code/components";
import translations from "../translations/default";
import { ELoadStatus } from "widgets/shared-code/enums";
import getSelectedFeatures from "../helpers/getSelectedFeatures";
const { useContext } = React;

/** - Tlačítko pro zvýraznění prvků vybraných v tabulce v mapě. */
export default function({ tableRef, landSearchState }: HSI.LandTableWidget.IHighlightButton) {
    const messageFormater = useMessageFormater(translations);
    const jimuMapView = useContext(JimuMapViewContext);
    const config = useConfig<HSI.LandTableWidget.IMConfig>();

    return <HighlightButton
        tableRef={tableRef}
        highlightColor={config.highlightColor}
        fetureProvider={async () => {
            if (landSearchState?.loadStatus === ELoadStatus.Loaded && landSearchState.response.IsReport === false) {
                const featureSets = await getSelectedFeatures(tableRef.current, jimuMapView, landSearchState.response, messageFormater("noLayerWithSoe"), messageFormater("noClassNameLayer"))
                const features: Array<__esri.Graphic> = [];

                featureSets.forEach(featureSet => {
                    features.push(...featureSet.features);
                });
                
                return features;
            }
        }}
    />;
}