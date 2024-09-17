import { React } from "jimu-core";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ButtonGroup } from "jimu-ui";
import { useMessageFormater, useTableSelectionCount } from "widgets/shared-code/hooks";
import { ArcGISJSAPIModuleLoader, LayerHelper, NotificationHelper, RequestHelper } from "widgets/shared-code/helpers";
import { WarningContent, FeatureTable } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { EKnownLayerExtension, ELoadStatus } from "widgets/shared-code/enums";
import translations from "../translations/default";
import { CalciteLoader, CalciteNotice } from "@esri/calcite-components-react";

const { useState, useEffect, useContext, useRef } = React;

/** - Tlačítko pro zobrazení jiných právních vztahů. */
export default function({ landSearchState, tableRef }: HSI.LandTableWidget.IJpvButton) {
    if (landSearchState?.loadStatus !== ELoadStatus.Loaded || landSearchState.response.IsReport === true || (landSearchState.response.TableViewTypeName !== "ViewParcela" && landSearchState.response.TableViewTypeName !== "ViewBudova")) {
        return <></>;
    }

    return <JpvButton
        tableRef={tableRef}
        queryResponse={landSearchState.response}
    />;
}

const defaultState: IState = { isModalOpen: false };

function JpvButton({ queryResponse, tableRef }: Pick<HSI.LandTableWidget.IJpvButton, "tableRef"> & { queryResponse: HSI.UseLandQueries.IExecuteQueryResponse; }) {
    const messageFormater = useMessageFormater(translations);
    const selectionCount = useTableSelectionCount(tableRef);
    const [state, setState] = useState<IState>(defaultState);
    const jimuMapView = useContext(JimuMapViewContext);
    const buildingTableRef = useRef<__esri.FeatureTable>();

    useEffect(() => {
        setState(defaultState);
    }, [selectionCount, setState]);

    async function showOwners() {
        try {
            setState({ loadStatus: ELoadStatus.Pending, isModalOpen: true });

            const layers = await LayerHelper.findAllMapImageLayersWithExtensions(jimuMapView, EKnownLayerExtension.SdSoe, true);

            const response = await RequestHelper.jsonRequest<HSI.UseLandQueries.IExecuteQueryResponse>(`${layers[0].url}/exts/${LayerHelper.getExtensionValue(EKnownLayerExtension.SdSoe)}/Pozemky/GetJpv`, {
                ParcelOrBuildingIdentifier: queryResponse.DataRows.find(({ Values }) => Values[0] === tableRef.current.highlightIds.getItemAt(0).toString()).id
            });

            const FeatureLayer = await ArcGISJSAPIModuleLoader.getModule("FeatureLayer");

            const featureLayer = new FeatureLayer({
                source: response.DataRows.map(({ Values }) => {
                    const attributes = {};
                    for (let index = 0; Values.length > index; index++) {
                        attributes[index.toString()] = index === 0 ? parseInt(Values[index]) : Values[index];
                    }
                    return {
                        attributes
                    };
                }),
                fields: response.Fields.map(({ Caption }, index) => ({
                    name: index.toString(),
                    type: index === 0 ? "oid" : "string",
                    alias: Caption
                }))
            });

            buildingTableRef.current.layer = featureLayer;
            setState(state => {
                if (!state.isModalOpen) {
                    return state;
                }

                return {
                    loadStatus: ELoadStatus.Loaded,
                    isModalOpen: true,
                    response
                };
            });
        } catch(err) {
            console.warn(err);
            setState(state => {
                if (!state.isModalOpen) {
                    return state;
                }

                return {
                    loadStatus: ELoadStatus.Error,
                    isModalOpen: true,
                    errorMessage: NotificationHelper.getErrorMessage(err)
                };
            });
        }
    }

    return <>
        <Button
            onClick={showOwners}
            disabled={selectionCount !== 1}
        >
            {messageFormater("jvpButton")}
        </Button>

        <Modal
            centered
            isOpen={state.isModalOpen}
            toggle={() => setState(defaultState)}
            modalClassName="land-table-table-modal"
        >
            <ModalHeader toggle={() => setState(defaultState)}>{messageFormater("jvpModalHeader")}</ModalHeader>
            <ModalBody className={!state.isModalOpen || state.loadStatus !== ELoadStatus.Loaded ? "widget-land-hidden-table" : ""}>
                {
                    function() {
                        if (!state.isModalOpen) {
                            return <></>;
                        }

                        if (state.loadStatus === ELoadStatus.Error) {
                            return <WarningContent message={state.errorMessage} title={messageFormater("failedToLoadJvp")} />;
                        }

                        if (state.loadStatus === ELoadStatus.Loaded && state.response.DataRows.length < 1) {
                            return <div style={{ padding: 10 }}>
                                <CalciteNotice
                                    open
                                    scale="l"
                                    icon="information"
                                    kind="info"
                                >
                                    <div slot="message">{messageFormater("noJvpFound")}</div>
                                </CalciteNotice>
                            </div>;
                        }

                        return <>
                            {state.loadStatus === ELoadStatus.Pending ? <CalciteLoader label="" scale="l" /> : <></>}
                            <FeatureTable
                                tableRef={buildingTableRef}
                            />
                        </>;
                    }()
                }
            </ModalBody>
            <ModalFooter>
                <ButtonGroup size="sm">
                    <Button onClick={() => setState(defaultState)}>
                        {messageFormater("jvpModalCloseModal")}
                    </Button>
                </ButtonGroup>
            </ModalFooter>
        </Modal>
    </>;
}

type IState = IStateBase<false> | IStateLoadingBase<ELoadStatus.Pending> | IStateError | IStateLoaded;

interface IStateBase<T extends boolean> {
    /** - Je otevřeno okno? */
    isModalOpen: T;
}

interface IStateLoadingBase<T extends ELoadStatus> extends IStateBase<true> {
    /** - Stav načtení právních vztahů. */
    loadStatus: T;
}

interface IStateError extends IStateLoadingBase<ELoadStatus.Error> {
    /** - Chybová hláška. */
    errorMessage: string;
}

interface IStateLoaded extends IStateLoadingBase<ELoadStatus.Loaded> {
    /** - Odpověď dotazu pro právní vztahy. */
    response: HSI.UseLandQueries.IExecuteQueryResponse;
}