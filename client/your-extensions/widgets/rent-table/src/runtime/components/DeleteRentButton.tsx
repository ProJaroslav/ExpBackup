import { React } from "jimu-core";
import { Button } from "jimu-ui";
import { useMessageFormater, useIsSomeSelected, useConfig, useUserRolesState } from "widgets/shared-code/hooks";
import { DeleteModal, LoadingButton } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { FeatureHelper } from "widgets/shared-code/helpers";
import { ELoadStatus } from "widgets/shared-code/enums";
import translations from "../translations/default";

const { useRef, useContext } = React;

/** - Tlačítko pro odstranění pronájmu. */
export default function({ tableRef }: HSI.RentTableWidget.IDeleteRentButton) {
    const messageFormater = useMessageFormater(translations);
    const config = useConfig<HSI.RentTableWidget.IMConfig>();
    const userRolesState = useUserRolesState(config.rentTable);

    if (userRolesState.loadStatus !== ELoadStatus.Loaded || !userRolesState.hasPermisson) {
        return <LoadingButton
            disabled
            loading={userRolesState.loadStatus === ELoadStatus.Pending}
        >
            {messageFormater("deleteRentButton")}
        </LoadingButton>;
    }

    return <DeleteRentButton tableRef={tableRef} />;
}

function DeleteRentButton({ tableRef }: HSI.RentTableWidget.IDeleteRentButton) {
    const isSomeSelected = useIsSomeSelected(tableRef);
    const messageFormater = useMessageFormater(translations);
    const deleteModalRef = useRef<HSI.DeleteModal.IMethods>();
    const config = useConfig<HSI.RentTableWidget.IMConfig>();
    const jimuMapView = useContext(JimuMapViewContext);

    async function deleteFeature() {
        await FeatureHelper.deleteFeatureInTable(jimuMapView, config.rentTable, tableRef.current.highlightIds.toArray());
        tableRef.current.refresh();
    }

    return <>
        <Button
            disabled={!isSomeSelected}
            onClick={() => {
                deleteModalRef.current.open();
            }}
        >
            {messageFormater("deleteRentButton")}
        </Button>
        
        <DeleteModal
            ref={deleteModalRef}
            deleteFeature={deleteFeature}
        />
    </>;
}