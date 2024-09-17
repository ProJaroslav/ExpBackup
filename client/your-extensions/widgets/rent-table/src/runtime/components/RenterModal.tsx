import { React, utils } from "jimu-core";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "jimu-ui";
import { useMessageFormater, useFieldAlias, useConfig, useUserRolesState } from "widgets/shared-code/hooks";
import { ArcGISJSAPIModuleLoader, LayerHelper, NotificationHelper, RequestHelper, FeatureHelper } from "widgets/shared-code/helpers";
import { WarningContent, Table, AttributeInput, RequiredField } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { EFieldAlias, ELoadStatus } from "widgets/shared-code/enums";
import translations from "../translations/default";
import { CalciteLoader } from "calcite-components";
const { useState, useRef, useImperativeHandle, forwardRef, useContext } = React;

const closedState: IStateBase<"closed"> = { windowState: "closed" };

/** - Okno pro editaci/vytvoření detailu nájemce. */
export default forwardRef<HSI.RentTableWidget.IRenterModalMethods, HSI.RentTableWidget.IRenterModal>(function({ tableRef }, ref) {
    const messageFormater = useMessageFormater(translations);
    const [state, setState] = useState<IStateBase<"closed"> | IOpenStateBase<ELoadStatus.Pending> | IOpenLoadedState | IOpenErrorState>(closedState);
    const config = useConfig<HSI.RentTableWidget.IMConfig>();
    const userRolesState = useUserRolesState(config.renterTable);
    const getFieldAlias = useFieldAlias(state.windowState !== "closed" && state.loadState === ELoadStatus.Loaded && state.feature, EFieldAlias.default);
    const lastSavingIdRef = useRef<string>();
    const jimuMapView = useContext(JimuMapViewContext);
    const requiredFields = userRolesState.loadStatus === ELoadStatus.Loaded && Array.isArray(userRolesState.objectClass?.fields) ? userRolesState.objectClass.fields.filter(({ required }) => required).map(({ name }) => name) : [];

    useImperativeHandle(ref, () => ({
        edit(oid, onSave) {
            const id = lastSavingIdRef.current = utils.getUUID();
            setState({
                windowState: "edit",
                loadState: ELoadStatus.Pending
            });

            LayerHelper
                .createDynamicDataSourceLayer(config.dynamicServiceUrl, config.workspaceId, config.renterTable)
                .then(layer => {
                    return layer.queryFeatures({
                        objectIds: [oid],
                        outFields: ["*"]
                    });
                })
                .then(featureSet => {
                    if (id === lastSavingIdRef.current) {
                        if (!featureSet.features[0]) {
                            setState(closedState);
                            NotificationHelper.addNotification({ type: "info", title: messageFormater("noRenterError") });
                        } else {
                            setState({
                                windowState: "edit",
                                loadState: ELoadStatus.Loaded,
                                feature: featureSet.features[0],
                                fields: featureSet.fields,
                                isSaving: false,
                                onSave
                            });
                        }
                    }
                })
                .catch(err => {
                    if (id === lastSavingIdRef.current) {
                        setState({
                            windowState: "edit",
                            loadState: ELoadStatus.Error,
                            errorMessage: NotificationHelper.getErrorMessage(err)
                        });
                    }
                });
        },
        create(onSave) {
            const id = lastSavingIdRef.current = utils.getUUID();
            setState({
                windowState: "create",
                loadState: ELoadStatus.Pending
            });

            Promise.all([
                LayerHelper.createDynamicDataSourceLayer(config.dynamicServiceUrl, config.workspaceId, config.renterTable, true),
                ArcGISJSAPIModuleLoader.getModule("Graphic")
            ])
                .then(([layer, Graphic]) => {
                    if (id === lastSavingIdRef.current) {
                        setState({
                            loadState: ELoadStatus.Loaded,
                            windowState: "create",
                            feature: new Graphic(),
                            fields: layer.fields,
                            isSaving: false,
                            onSave
                        });
                    }
                })
                .catch(err => {
                    if (id === lastSavingIdRef.current) {
                        setState({
                            windowState: "create",
                            loadState: ELoadStatus.Error,
                            errorMessage: NotificationHelper.getErrorMessage(err)
                        });
                    }
                });
        }
    }), [setState, config, lastSavingIdRef]);

    async function saveFeature() {
        const id = lastSavingIdRef.current = utils.getUUID();
        try {
            if (state.windowState !== "closed" && state.loadState === ELoadStatus.Loaded) {
                if (state.fields.some(field => (requiredFields.includes(field.name) || !field.nullable) && !state.feature.getAttribute(field.name))) {
                    NotificationHelper.addNotification({ title: messageFormater("renterRequiredValueMissing"), type: "warning" });
                    return;
                }
                setState(currentState => ({ ...currentState, isSaving: true }));

                await FeatureHelper.applyEditsInTable(jimuMapView, state.windowState === "edit" ? { updates: [{ attributes: state.feature.attributes, table: config.renterTable, objectId: state.feature.getObjectId() }] } : { adds: [{ attributes: state.feature.attributes, table: config.renterTable }] });

                if (id === lastSavingIdRef.current) {
                    setState(closedState);
                    NotificationHelper.addNotification({ title: messageFormater("renterSaved"), type: "success" });
                    tableRef.current.refresh();
                    if (typeof state.onSave === "function") {
                        state.onSave()
                    }
                }
            }
        } catch(err) {
            console.warn(err);
            if (id === lastSavingIdRef.current) {
                NotificationHelper.handleError(messageFormater("failedToSaveRenter"), err);
                setState(currentState => ({ ...currentState, isSaving: false }));
            }
        }
    }

    return <Modal toggle={() => setState(closedState)} centered isOpen={state.windowState !== "closed"}>
        <ModalHeader toggle={() => setState(closedState)}>{messageFormater(state.windowState === "edit" ? "editRenterHeader" : "createRenterHeader")}</ModalHeader>
        <ModalBody>
            {
                function() {
                    if (state.windowState === "closed" || state.loadState === ELoadStatus.Pending || (state.loadState === ELoadStatus.Loaded && state.isSaving)) {
                        return <CalciteLoader label="" scale="l" />;
                    } else if (state.loadState === ELoadStatus.Error) {
                        return <WarningContent message={state.errorMessage} title={messageFormater("failedToLoadRenter")} />;
                    } else {
                        return <Table
                            rows={state.fields
                                .filter(field => field.type !== "oid" && field.type !== "geometry" && field.type !== "global-id")
                                .map(field => {
                                    return [
                                        <RequiredField field={field} alias={getFieldAlias(field)} forceRequired={requiredFields.includes(field.name)} />,
                                        <AttributeInput field={field} feature={state.feature} />
                                    ];
                                })}
                        />;
                    }
                }()
            }
        </ModalBody>
        <ModalFooter>
            <Button onClick={() => setState(closedState)}>
                {messageFormater("closeRenterModal")}
            </Button>
            <Button
                disabled={state.windowState === "closed" || state.loadState !== ELoadStatus.Loaded || state.isSaving}
                type="primary"
                onClick={saveFeature}
            >
                {messageFormater("saveRenterModal")}
            </Button>
        </ModalFooter>
    </Modal>;
});

interface IOpenLoadedState extends IOpenStateBase<ELoadStatus.Loaded> {
    feature: __esri.Graphic;  
    fields: Array<__esri.Field>;
    isSaving: boolean;
    onSave?(): void;
}

interface IOpenErrorState extends IOpenStateBase<ELoadStatus.Error> {
    errorMessage: string;
}

interface IOpenStateBase<T extends ELoadStatus> extends IStateBase<"create" | "edit"> {
    loadState: T;
}

interface IStateBase<T extends "edit" | "create" | "closed"> {
    /** - Typ otevření okna. */
    windowState: T;
}