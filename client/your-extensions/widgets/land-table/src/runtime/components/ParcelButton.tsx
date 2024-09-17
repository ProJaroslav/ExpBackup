import { React } from "jimu-core";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ButtonGroup } from "jimu-ui";
import { useMessageFormater, useTableSelectionCount } from "widgets/shared-code/hooks";
import { ArcGISJSAPIModuleLoader, LayerHelper, NotificationHelper, RequestHelper } from "widgets/shared-code/helpers";
import { WarningContent, FeatureTable } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { EKnownLayerExtension, ELoadStatus } from "widgets/shared-code/enums";
import translations from "../translations/default";
import { CalciteLoader, CalciteNotice } from "@esri/calcite-components-react";
import HighlightButton from "./HighlightButton";
import AddToSelectionButton from "./AddToSelectionButton";
import BuildingButton from "./BuildingButton";
import OwnersButton from "./OwnersButton";
import JpvButton from "./JpvButton";
import CuzkButton from "./CuzkButton";
import ExcelButton from "./ExcelButton";
import SapButton from "./SapButton";

const { useState, useEffect, useContext, useRef } = React;

/** - Tlačítko pro zobrazení parcel pod budovou. */
export default function({ landSearchState, tableRef }: HSI.LandTableWidget.IParcelButton) {
    if (landSearchState?.loadStatus !== ELoadStatus.Loaded || landSearchState.response.IsReport === true || landSearchState.response.TableViewTypeName !== "ViewBudova") {
        return <></>;
    }

    return <ParcelButton
        tableRef={tableRef}
        buildingResponse={landSearchState.response}
    />;
}

const defaultState: IState = { isModalOpen: false };

function ParcelButton({ buildingResponse, tableRef }: Pick<HSI.LandTableWidget.IParcelButton, "tableRef"> & { buildingResponse: HSI.UseLandQueries.IExecuteQueryResponse; }) {
    const messageFormater = useMessageFormater(translations);
    const selectionCount = useTableSelectionCount(tableRef);
    const [state, setState] = useState<IState>(defaultState);
    const jimuMapView = useContext(JimuMapViewContext);
    const parcelsTableRef = useRef<__esri.FeatureTable>();

    useEffect(() => {
        setState(defaultState);
    }, [selectionCount, setState]);

    async function showParcels() {
        try {
            setState({ loadStatus: ELoadStatus.Pending, isModalOpen: true });

            const layers = await LayerHelper.findAllMapImageLayersWithExtensions(jimuMapView, EKnownLayerExtension.SdSoe, true);

            const response = await RequestHelper.jsonRequest<HSI.UseLandQueries.IExecuteQueryResponse>(`${layers[0].url}/exts/${LayerHelper.getExtensionValue(EKnownLayerExtension.SdSoe)}/Pozemky/GetParcelsUnderBuilding`, {
                BuildingIdentifier: buildingResponse.DataRows.find(({ Values }) => Values[0] === tableRef.current.highlightIds.getItemAt(0).toString()).id
            });

            const FeatureLayer = await ArcGISJSAPIModuleLoader.getModule("FeatureLayer");

            const featureLayer = new FeatureLayer({
                source: response.DataRows.map(({ Values, id }) => {
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

            parcelsTableRef.current.layer = featureLayer;
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
            onClick={showParcels}
            disabled={selectionCount !== 1}
        >
            {messageFormater("parcelButton")}
        </Button>

        <Modal
            isOpen={state.isModalOpen}
            toggle={() => setState(defaultState)}
            modalClassName="land-table-table-modal"
            centered
        >
            <ModalHeader toggle={() => setState(defaultState)}>{messageFormater("parcelModalHeader")}</ModalHeader>
            <ModalBody className={!state.isModalOpen || state.loadStatus !== ELoadStatus.Loaded ? "widget-land-hidden-table" : ""}>
                {
                    function() {
                        if (!state.isModalOpen) {
                            return <></>;
                        }

                        if (state.loadStatus === ELoadStatus.Error) {
                            return <WarningContent message={state.errorMessage} title={messageFormater("failedToLoadparcels")} />;
                        }

                        if (state.loadStatus === ELoadStatus.Loaded && state.response.DataRows.length < 1) {
                            return <div style={{ padding: 10 }}>
                                <CalciteNotice
                                    open
                                    scale="l"
                                    icon="information"
                                    kind="info"
                                >
                                    <div slot="message">{messageFormater("noParcelsFound")}</div>
                                </CalciteNotice>
                            </div>;
                        }

                        return <>
                            {state.loadStatus === ELoadStatus.Pending ? <CalciteLoader label="" scale="l" /> : <></>}
                            <FeatureTable
                                tableRef={parcelsTableRef}
                            />
                        </>;
                    }()
                }
            </ModalBody>
            <ModalFooter>
                <ButtonGroup size="sm">
                    {
                        function() {
                            if (!state.isModalOpen || state.loadStatus !== ELoadStatus.Loaded) {
                                return <></>;
                            }

                            const landSearchState: HSI.UseLandQueries.ILandSearchReturn["landSearchState"] = {
                                loadStatus: ELoadStatus.Loaded,
                                response: state.response,
                                queryParams: {
                                    query: null,
                                    queryParametresValues: {}
                                }
                            };

                            return <>
                                <HighlightButton
                                    tableRef={parcelsTableRef}
                                    landSearchState={landSearchState}
                                />
                                <AddToSelectionButton
                                    tableRef={parcelsTableRef}
                                    landSearchState={landSearchState}
                                />
                                <BuildingButton
                                    tableRef={parcelsTableRef}
                                    landSearchState={landSearchState}
                                />
                                <OwnersButton
                                    tableRef={parcelsTableRef}
                                    landSearchState={landSearchState}
                                />
                                <JpvButton
                                    tableRef={parcelsTableRef}
                                    landSearchState={landSearchState}
                                />
                                <CuzkButton
                                    tableRef={parcelsTableRef}
                                    landSearchState={landSearchState}
                                />
                                <ExcelButton
                                />
                                <SapButton
                                    tableRef={parcelsTableRef}
                                    landSearchState={landSearchState}
                                />
                            </>;
                        }()
                    }
                    <Button onClick={() => setState(defaultState)}>
                        {messageFormater("closeParcelModalButton")}
                    </Button>
                </ButtonGroup>
            </ModalFooter>
        </Modal>
    </>;
}

type IState = IStateBase<false> | IStateLoadingBase<ELoadStatus.Pending> | IStateError | IStateLoaded;

interface IStateBase<T extends boolean> {
    /** - Je otevřeno okno s parcelami? */
    isModalOpen: T;
}

interface IStateLoadingBase<T extends ELoadStatus> extends IStateBase<true> {
    /** - Stav načtení parcel. */
    loadStatus: T;
}

interface IStateError extends IStateLoadingBase<ELoadStatus.Error> {
    /** - Chybová hláška. */
    errorMessage: string;
}

interface IStateLoaded extends IStateLoadingBase<ELoadStatus.Loaded> {
    /** - Odpověď dotazu pro parcely. */
    response: HSI.UseLandQueries.IExecuteQueryResponse;
}