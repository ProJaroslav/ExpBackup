import { React, utils } from "jimu-core";
import { Button, Modal, ModalBody, Label, ModalHeader, ModalFooter } from "jimu-ui";
import { useMessageFormater, useIsSomeSelected, useConfig, useUserRolesState } from "widgets/shared-code/hooks";
import { DeleteModal, LoadingButton, SelectFilter, WarningContent } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { FeatureHelper, NotificationHelper, LayerHelper } from "widgets/shared-code/helpers";
import { ELoadStatus } from "widgets/shared-code/enums";
import translations from "../translations/default";
import { CalciteLoader } from "calcite-components";

const { useRef, useContext, useState, useEffect } = React;

/** - Tlačítko pro editaci nájemců. */
export default function({ tableRef, renterModalRef }: HSI.RentTableWidget.IEditRenterButton) {
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

    return <EditRenterButton tableRef={tableRef} renterModalRef={renterModalRef} />;
}

const displayField = "NAZEV_NAJEMCE";

function EditRenterButton({ tableRef, renterModalRef }: HSI.RentTableWidget.IEditRenterButton) {
    const [state, setState] = useState<IStateBase<false> | IStateLoaded | IStateOpenBase<ELoadStatus.Pending> | IStateError>({ isOpen: false });
    const messageFormater = useMessageFormater(translations);
    const deleteModalRef = useRef<HSI.DeleteModal.IMethods>();
    const config = useConfig<HSI.RentTableWidget.IMConfig>();
    const lastQueryRef = useRef<string>();
    const jimuMapView = useContext(JimuMapViewContext);

    async function loadRenters() {
        const queryId = lastQueryRef.current = utils.getUUID();
        try {
            const selectedRenter = state.isOpen ? state.selectedRenter : null;
            setState({ isOpen: true, loadStatus: ELoadStatus.Pending, selectedRenter: selectedRenter });
            const layer = await LayerHelper.createDynamicDataSourceLayer(config.dynamicServiceUrl, config.workspaceId, config.renterTable, true);

            const renters = await layer.queryFeatures({
                where: '1=1',
                outFields: [displayField, layer.objectIdField],
                returnGeometry: false
            });
            if (queryId === lastQueryRef.current) {
                setState({ isOpen: true, loadStatus: ELoadStatus.Loaded, renters, selectedRenter });
            }
        } catch(err) {
            if (queryId === lastQueryRef.current) {
                setState({ isOpen: true, loadStatus: ELoadStatus.Error, errorMessage: NotificationHelper.getErrorMessage(err) });
            }
        }
    }

    async function deleteFeature() {
        if (state.isOpen && state.loadStatus === ELoadStatus.Loaded) {
            const queryId = lastQueryRef.current = utils.getUUID();
            const { selectedRenter } = state;
            await FeatureHelper.deleteFeatureInTable(jimuMapView, config.renterTable, selectedRenter);
            tableRef.current.refresh();
            if (queryId === lastQueryRef.current) {
                setState(({ renters }: IStateLoaded) => {
                    renters.features = renters.features.filter(feature => feature.getObjectId() !== selectedRenter);
                    return {
                        isOpen: true,
                        loadStatus: ELoadStatus.Loaded,
                        renters
                    }
                });
            }
        }
    }

    function close() {
        lastQueryRef.current = null;
        setState({ isOpen: false });
    }

    return <>
        <Button
            onClick={loadRenters}
        >
            {messageFormater("editRenter")}
        </Button>
        
        <Modal centered isOpen={state.isOpen} toggle={close}>
            <ModalHeader toggle={close}>{messageFormater("editRenterModalHeader")}</ModalHeader>
            <ModalBody className="rent-table-edit-renter-modal">
                {
                    function() {
                        if (state.isOpen && state.loadStatus === ELoadStatus.Error) {
                            return <WarningContent message={state.errorMessage} title={messageFormater("failedToLoadRenters")} />;
                        }

                        return <Label>
                            {messageFormater("editRenterLabel")}
                            <SelectFilter
                                options={state.isOpen && state.loadStatus === ELoadStatus.Loaded ? state.renters.features.map(feature => ({ value: feature.getObjectId(), label: feature.getAttribute(displayField)})) : []}
                                loading={!state.isOpen || state.loadStatus === ELoadStatus.Pending}
                                selectProps={{
                                    value: state.isOpen && state.selectedRenter,
                                    onChange(ev) {
                                        setState(({ renters }: IStateLoaded) => ({
                                            isOpen: true,
                                            loadStatus: ELoadStatus.Loaded,
                                            renters,
                                            selectedRenter: ev.target.value
                                        }));
                                    }
                                }}
                            />
                        </Label>
                    }()
                }
            </ModalBody>
            <ModalFooter>
                <Button
                    onClick={() => {
                        renterModalRef.current.create(loadRenters);
                    }}
                >
                    {messageFormater("addRenterButton")}
                </Button>
                <Button
                    disabled={!state.isOpen || !state.selectedRenter}
                    onClick={() => {
                        if (state.isOpen && state.loadStatus === ELoadStatus.Loaded) {
                            renterModalRef.current.edit(state.selectedRenter, loadRenters);
                        }
                    }}
                >
                    {messageFormater("editRenterButton")}
                </Button>
                <Button
                    type="danger"
                    disabled={!state.isOpen || !state.selectedRenter}
                    onClick={() => {
                        deleteModalRef.current.open();
                    }}
                >
                    {messageFormater("deleteRenterButton")}
                </Button>
            </ModalFooter>
        </Modal>

        {state.isOpen ? <DeleteModal ref={deleteModalRef} deleteFeature={deleteFeature}/> : <></>}

    </>;
}

interface IStateOpenBase<T extends ELoadStatus> extends IStateBase<true> {
    /** - Stav načtení nájemců. */
    loadStatus: T;
    /** - Vybraný nájemce. */
    selectedRenter?: number;
}

interface IStateError extends IStateOpenBase<ELoadStatus.Error> {
    /** - Odchycená chybová hláška. */
    errorMessage: string;
}

interface IStateLoaded extends IStateOpenBase<ELoadStatus.Loaded> {
    /** - Všichni nájemci. */
    renters: __esri.FeatureSet;
}

interface IStateBase<T extends boolean> {
    /** - Je otevřené okno pro editaci? */
    isOpen: T;
}