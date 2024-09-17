import { React } from "jimu-core";
import { useMessageFormater, useTableSelectionCount, useConfig } from "widgets/shared-code/hooks";
import { NotificationHelper } from "widgets/shared-code/helpers";
import { LoadingButton } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { ELoadStatus } from "widgets/shared-code/enums";
import translations from "../translations/default";
import locateFeatures from "../helpers/locateFeatures";

const { useState, useContext } = React;

/** - Tlačítko pro proklik do ČÚZK. */
export default function({ landSearchState, tableRef }: HSI.LandTableWidget.ICuzkButton) {
    if (landSearchState?.loadStatus !== ELoadStatus.Loaded || landSearchState.response.IsReport === true || (landSearchState.response.TableViewTypeName !== "ViewParcela" && landSearchState.response.TableViewTypeName !== "ViewBudova")) {
        return <></>;
    }

    return <CuzkButton tableRef={tableRef} queryResponse={landSearchState.response} />;
}

function CuzkButton({ tableRef, queryResponse }: Pick<HSI.LandTableWidget.ICuzkButton, "tableRef"> & { queryResponse: HSI.UseLandQueries.IExecuteQueryResponse; }) {
    const messageFormater = useMessageFormater(translations);
    const selectionCount = useTableSelectionCount(tableRef);
    const config = useConfig<HSI.LandTableWidget.IMConfig>();
    const [redirecting, setRedirecting] = useState<boolean>(false);
    const jimuMapView = useContext(JimuMapViewContext);

    async function openCuzk() {
        try {
            if (queryResponse.TableViewTypeName === "ViewParcela") {
                window.open(`${config.parcelCuzkUrl}?typ=parcela&id=${tableRef.current.highlightIds.getItemAt(0)}`);
            } else {
                setRedirecting(true);
                const locateResponse = await locateFeatures(tableRef.current, jimuMapView, queryResponse, messageFormater("noLayerWithSoe"));
                const { XMax, XMin, YMax, YMin } = Object.values(locateResponse)[0];
                window.open(`${config.buildingCuzkUrl}?x=${Math.floor((XMax + XMin) / 2)}&y=${Math.floor((YMax + YMin) / 2)}&l=KN`);
            }
        } catch(err) {
            console.warn(err);
            NotificationHelper.handleError(messageFormater("failedOpenCuzk"), err);
        } finally {
            setRedirecting(false);
        }
    }

    return <LoadingButton
        disabled={selectionCount !== 1 || redirecting}
        onClick={openCuzk}
        loading={redirecting}
    >
        {messageFormater("openCuzk")}
    </LoadingButton>;
}