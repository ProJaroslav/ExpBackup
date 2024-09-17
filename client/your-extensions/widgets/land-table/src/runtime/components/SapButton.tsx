import { React } from "jimu-core";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ButtonGroup } from "jimu-ui";
import { useMessageFormater, useTableSelectionCount, useConfig } from "widgets/shared-code/hooks";
import { ArcGISJSAPIModuleLoader, LayerHelper, NotificationHelper, RequestHelper } from "widgets/shared-code/helpers";
import { WarningContent, FeatureTable, LoadingButton } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { EKnownLayerExtension, ELoadStatus } from "widgets/shared-code/enums";
import translations from "../translations/default";
import { CalciteLoader, CalciteNotice } from "calcite-components";

const { useState, useEffect, useContext, useRef } = React;

/** - Tlačítko pro proklik do SAP. */
export default function({ landSearchState, tableRef }: HSI.LandTableWidget.ISapButton) {
    if (landSearchState?.loadStatus !== ELoadStatus.Loaded || landSearchState.response.IsReport === true || (landSearchState.response.TableViewTypeName !== "ViewParcela")) {
        return <></>;
    }

    return <SapButton
        tableRef={tableRef}
        queryResponse={landSearchState.response}
    />;
}

function SapButton({ queryResponse, tableRef }: Pick<HSI.LandTableWidget.ISapButton, "tableRef"> & { queryResponse: HSI.UseLandQueries.IExecuteQueryResponse; }) {
    const messageFormater = useMessageFormater(translations);
    const selectionCount = useTableSelectionCount(tableRef);
    const [isRunning, setRunning] = useState<boolean>(false);
    const jimuMapView = useContext(JimuMapViewContext);
    const buildingTableRef = useRef<__esri.FeatureTable>();
    const config = useConfig<HSI.LandTableWidget.IMConfig>()

    async function openSap() {
        try {
            setRunning(true);
            alert("TODO")
        } catch(err) {
            console.log(err);
            NotificationHelper.handleError(messageFormater("failedToOpenSap"), err)
        } finally {
            setRunning(false);
        }
    }

    return <LoadingButton
        loading={isRunning}
        disabled={selectionCount !== 1 || isRunning}
        onClick={openSap}
    >
        {messageFormater("sapButton")}
    </LoadingButton>;
}