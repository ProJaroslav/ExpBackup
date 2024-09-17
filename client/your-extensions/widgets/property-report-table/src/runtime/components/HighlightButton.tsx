import { React } from "jimu-core";
import { HighlightButton } from "widgets/shared-code/components";
import { useConfig } from "widgets/shared-code/hooks";
import { LayerHelper } from "widgets/shared-code/helpers";
import { getDatasetIds } from "../helpers/tableHelper";

/** - Tlačítko pro zvýraznění prvků vybraných v tabulce v mapě. */
export default function({ tableRef }: Pick<HSI.FeatureTableComponent.IHighlightButton, "tableRef">) {
    const config = useConfig<HSI.PropertyReportTableWidget.IMConfig>();

    async function fetureProvider(): Promise<Array<__esri.Graphic>> {
        const datasetIds = getDatasetIds(tableRef.current);

        const featureSets = await Promise.all(
            Object.keys(datasetIds).map(datasource => {
                return LayerHelper
                    .createDynamicDataSourceLayer(config.dynamicServiceUrl, config.workspaceId, datasource)
                    .then(layer => {
                        return layer.queryFeatures({
                            objectIds: datasetIds[datasource],
                            returnGeometry: true,
                            outFields: []
                        });
                    });
            })
        );
        
        return featureSets.reduce((features, featureSet) => {
            return features.concat(featureSet.features);
        }, [] as Array<__esri.Graphic>);
    }

    return <HighlightButton
        tableRef={tableRef}
        highlightColor={config.highlightColor}
        fetureProvider={fetureProvider}
    />;
}