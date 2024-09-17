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
import ParcelButton from "./ParcelButton";
import AddToSelectionButton from "./AddToSelectionButton";
import OwnersButton from "./OwnersButton";
import JpvButton from "./JpvButton";
import CuzkButton from "./CuzkButton";
import ExcelButton from "./ExcelButton";
import SapButton from "./SapButton";

const { useState, useEffect, useContext, useRef } = React;

/** - Tlačítko pro zobrazení budov na parcele. */
export default function({ landSearchState, tableRef }: HSI.LandTableWidget.IBuildingButton) {
    if (landSearchState?.loadStatus !== ELoadStatus.Loaded || landSearchState.response.IsReport === true || landSearchState.response.TableViewTypeName !== "ViewParcela") {
        return <></>;
    }

    return <BuildingButton
        tableRef={tableRef}
        parcelResponse={landSearchState.response}
    />;
}

const defaultState: IState = { isModalOpen: false };

function BuildingButton({ parcelResponse, tableRef }: Pick<HSI.LandTableWidget.IBuildingButton, "tableRef"> & { parcelResponse: HSI.UseLandQueries.IExecuteQueryResponse; }) {
    const messageFormater = useMessageFormater(translations);
    const selectionCount = useTableSelectionCount(tableRef);
    const [state, setState] = useState<IState>(defaultState);
    const jimuMapView = useContext(JimuMapViewContext);
    const buildingTableRef = useRef<__esri.FeatureTable>();

    useEffect(() => {
        setState(defaultState);
    }, [selectionCount, setState]);

    async function showBuildings() {
        try {
            setState({ loadStatus: ELoadStatus.Pending, isModalOpen: true });

            const layers = await LayerHelper.findAllMapImageLayersWithExtensions(jimuMapView, EKnownLayerExtension.SdSoe, true);

            const response = await RequestHelper.jsonRequest<HSI.UseLandQueries.IExecuteQueryResponse>(`${layers[0].url}/exts/${LayerHelper.getExtensionValue(EKnownLayerExtension.SdSoe)}/Pozemky/GetBuildingOnParcel`, {
                ParcelIdentifier: parcelResponse.DataRows.find(({ Values }) => Values[0] === tableRef.current.highlightIds.getItemAt(0).toString()).id
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
            onClick={showBuildings}
            disabled={selectionCount !== 1}
        >
            {messageFormater("buildingButton")}
        </Button>

        <Modal
            isOpen={state.isModalOpen}
            toggle={() => setState(defaultState)}
            modalClassName="land-table-table-modal"
            centered
        >
            <ModalHeader toggle={() => setState(defaultState)}>{messageFormater("buildingModalHeader")}</ModalHeader>
            <ModalBody className={!state.isModalOpen || state.loadStatus !== ELoadStatus.Loaded ? "widget-land-hidden-table" : ""}>
                {
                    function() {
                        if (!state.isModalOpen) {
                            return <></>;
                        }

                        if (state.loadStatus === ELoadStatus.Error) {
                            return <WarningContent message={state.errorMessage} title={messageFormater("failedToLoadBuilding")} />;
                        }

                        if (state.loadStatus === ELoadStatus.Loaded && state.response.DataRows.length < 1) {
                            return <div style={{ padding: 10 }}>
                                <CalciteNotice
                                    open
                                    scale="l"
                                    icon="information"
                                    kind="info"
                                >
                                    <div slot="message">{messageFormater("noBuildingFound")}</div>
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
                                    tableRef={buildingTableRef}
                                    landSearchState={landSearchState}
                                />
                                <AddToSelectionButton
                                    tableRef={buildingTableRef}
                                    landSearchState={landSearchState}
                                />
                                <ParcelButton
                                    tableRef={buildingTableRef}
                                    landSearchState={landSearchState}
                                />
                                <OwnersButton
                                    tableRef={buildingTableRef}
                                    landSearchState={landSearchState}
                                />
                                <JpvButton
                                    tableRef={buildingTableRef}
                                    landSearchState={landSearchState}
                                />
                                <CuzkButton
                                    tableRef={buildingTableRef}
                                    landSearchState={landSearchState}
                                />
                                <ExcelButton
                                />
                                <SapButton
                                    tableRef={buildingTableRef}
                                    landSearchState={landSearchState}
                                />
                            </>;
                        }()
                    }
                    <Button onClick={() => setState(defaultState)}>
                        {messageFormater("closeBuildingModalButton")}
                    </Button>
                </ButtonGroup>
            </ModalFooter>
        </Modal>
    </>;
}

type IState = IStateBase<false> | IStateBase<true> & HSI.LoadingState.IState<{
    /** - Odpověď dotazu pro budovu. */
    response: HSI.UseLandQueries.IExecuteQueryResponse;
}>;

interface IStateBase<T extends boolean> {
    /** - Je otevřeno okno s budovami? */
    isModalOpen: T;
}