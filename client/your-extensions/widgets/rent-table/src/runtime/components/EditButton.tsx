import { React, utils } from "jimu-core";
import { Button, Modal, ModalBody, Label, ModalHeader, ModalFooter } from "jimu-ui";
import { useMessageFormater, useIsSomeSelected, useConfig, useUserRolesState } from "widgets/shared-code/hooks";
import { DeleteModal, LoadingButton, SelectFilter, WarningContent, SdDynamicSourceEditButton } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { FeatureHelper, NotificationHelper, LayerHelper } from "widgets/shared-code/helpers";
import { ELoadStatus } from "widgets/shared-code/enums";
import translations from "../translations/default";
import { CalciteLoader } from "calcite-components";

const { useRef, useContext, useState, useEffect } = React;

/** - Tlačítko pro editaci nájemců. */
export default function({ tableRef }: HSI.RentTableWidget.IEditRentButton) {
    const messageFormater = useMessageFormater(translations);
    const config = useConfig<HSI.RentTableWidget.IMConfig>();
    const userRolesState = useUserRolesState(config.renterTable);

    if (userRolesState.loadStatus !== ELoadStatus.Loaded || !userRolesState.hasPermisson) {
        return <LoadingButton
            disabled
            loading={userRolesState.loadStatus === ELoadStatus.Pending}
        >
            {messageFormater("editRenter")}
        </LoadingButton>;
    }

    return <SdDynamicSourceEditButton
        dynamicServiceUrl={config.dynamicServiceUrl}
        sourceClass={config.rentTable}
        oid={tableRef.current.highlightIds.getItemAt(0)}
        workspaceId={config.workspaceId}
    />;

    return <EditRenterButton tableRef={tableRef} renterModalRef={renterModalRef} />;
}