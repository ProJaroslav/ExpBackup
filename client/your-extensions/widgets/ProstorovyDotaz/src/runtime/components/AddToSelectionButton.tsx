import { React } from "jimu-core";
import { LayerInfoHelper } from "widgets/shared-code/helpers";
import { AddToSelectionButton } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
const { useContext } = React;

export default function({ tableRef, selectedClass }: HSI.ProstorovyDotaz.IAddToSelectionButton) {
    const jimuMapView = useContext(JimuMapViewContext);

    return <AddToSelectionButton
        tableRef={tableRef}
        sublayerProvider={() => LayerInfoHelper.findLayersByDataset(jimuMapView, selectedClass.objectClass)}
    />;
}