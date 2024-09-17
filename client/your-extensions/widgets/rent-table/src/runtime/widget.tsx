import { type AllWidgetProps, React } from "jimu-core";
import { Button, ButtonGroup } from "jimu-ui";
import { WidgetWrapper, WidgetBody, DynamicDataTable, HighlightButton, WarningContent, SdEditButton, SdCreateButton } from "widgets/shared-code/components";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { LayerHelper, NotificationHelper } from "widgets/shared-code/helpers";
import { ELoadStatus } from "widgets/shared-code/enums";
import SearchParams from "./components/SearchParams";
import RenterDetailButton from "./components/RenterDetailButton";
import RenterModal from "./components/RenterModal";
import DeleteRentButton from "./components/DeleteRentButton";
import EditRenterButton from "./components/EditRenterButton";
import translations from "./translations/default";
import "./widget.scss";
import { LayerTypes } from "jimu-arcgis";

const { useEffect, useState, useRef, useReducer } = React;

function Widget({ manifest, config }: AllWidgetProps<HSI.RentTableWidget.IMConfig>) {
    const messageFormater = useMessageFormater(translations);
    const [state, setState] = useState<HSI.RentTableWidget.IWidgetState>({ loadStatus: ELoadStatus.Pending });
    const tableRef = useRef<__esri.FeatureTable>();
    const searchButtonRef = useRef<HTMLButtonElement>();
    const renterModalRef = useRef<HSI.RentTableWidget.IRenterModalMethods>();
    const [isTableCreated, onTableCreated] = useReducer(() => true, false);

    useEffect(() => {
        const abortController = new AbortController();
        setState({ loadStatus: ELoadStatus.Pending });

        (async function() {
            try {
                const [katUzeFeatureSet, renterFeatureSet, landTypeFeatureSet] = await Promise.all(
                    [config.katUzeTable, config.renterTable, config.landTypeTable].map(dataSourceName => {
                        return LayerHelper
                            .createDynamicDataSourceLayer(config.dynamicServiceUrl, config.workspaceId, dataSourceName)
                            .then(layer => {
                                return layer.queryFeatures({
                                    where: "1=1",
                                    outFields: ["*"],
                                    returnGeometry: false
                                });
                            });
                    })
                );
                
                setState({ loadStatus: ELoadStatus.Loaded, katUzeFeatureSet, landTypeFeatureSet, renterFeatureSet });
            } catch(err) {
                if (!abortController.signal.aborted) {
                    console.warn(err);
                    setState({ loadStatus: ELoadStatus.Error, errorMessage: NotificationHelper.getErrorMessage(err) });
                }
            }
        })();

        return function() {
            abortController.abort();
        }
    }, [config, setState]);

    return <WidgetBody
        widgetName={manifest.name}
        loading={state.loadStatus === ELoadStatus.Pending}
        footer={<ButtonGroup
            size="sm"
        >
            {
                !isTableCreated ? <></> : <>
                    <EditRenterButton tableRef={tableRef} renterModalRef={renterModalRef} />
                    <HighlightButton
                        tableRef={tableRef}
                        highlightColor={config.highlightColor}
                        fetureProvider={() => {
                            if (tableRef.current.layer.type === LayerTypes.FeatureLayer) {
                                return Promise.all([
                                    tableRef.current.layer.queryFeatures({
                                        objectIds: tableRef.current.highlightIds.toArray(),
                                        outFields: ["PARCISLO", "KOD_KU"]
                                    }),
                                    LayerHelper.createDynamicDataSourceLayer(config.dynamicServiceUrl, config.workspaceId, config.parcelTable)
                                ])
                                .then(([featureSet, layer]) => {
                                    return layer.queryFeatures({
                                        where: featureSet.features
                                            .map(feature => {
                                                const { KMENOVE_CISLO_PAR, PODDELENI_CISLA_PAR } = parseCisloPar(feature.getAttribute("PARCISLO"));
                                                return `KATUZE_KOD=${feature.getAttribute("KOD_KU")} AND KMENOVE_CISLO_PAR=${KMENOVE_CISLO_PAR}${PODDELENI_CISLA_PAR ? ` AND PODDELENI_CISLA_PAR=${PODDELENI_CISLA_PAR}` : ""}`;
                                            })
                                            .join(" OR "),
                                        returnGeometry: true
                                    });
                                })
                                .then(featureSets => {
                                    return featureSets.features;
                                });
                            }
                        }}
                    />

                    <DeleteRentButton tableRef={tableRef} />
                    <RenterDetailButton tableRef={tableRef} renterModalRef={renterModalRef} />
                    <SdEditButton
                        tableRef={tableRef}
                        sourceClass={config.rentTable}
                        oidProvider={table => Promise.resolve(table.highlightIds.getItemAt(0))}
                        provideLayer={() => Promise.resolve(tableRef.current.layer as __esri.FeatureLayer)}
                    >
                        {messageFormater("changeRentButton")}
                    </SdEditButton>
                    <SdCreateButton
                        tableRef={tableRef}
                        sourceClass={config.rentTable}
                        provideLayer={() => Promise.resolve(tableRef.current.layer as __esri.FeatureLayer)}
                    >
                        {messageFormater("createRentButton")}
                    </SdCreateButton>
                </> 
            }
            <Button type="primary" ref={searchButtonRef}>{messageFormater("searchButton")}</Button>
        </ButtonGroup>}
    >
        {
            function() {
                switch(state.loadStatus) {
                    case ELoadStatus.Error:
                        return <WarningContent
                            message={state.errorMessage}
                            title={messageFormater("failedToLoad")}
                        />;

                    case ELoadStatus.Loaded:
                        return <>
                            <SearchParams
                                katUzeFeatureSet={state.katUzeFeatureSet}
                                landTypeFeatureSet={state.landTypeFeatureSet}
                                renterFeatureSet={state.renterFeatureSet}
                                searchButtonRef={searchButtonRef}
                                tableRef={tableRef}
                            />
                            <DynamicDataTable
                                title={messageFormater("tableTitle")}
                                onCreated={onTableCreated}
                                tableRef={tableRef}
                                serviceUrl={config.dynamicServiceUrl}
                                workspaceId={config.workspaceId}
                                dataSourceName={config.rentTable}
                                tableSettingExtension={manifest.name}
                            />
                            <RenterModal ref={renterModalRef} tableRef={tableRef} />
                        </>;
                    default:
                        return <WarningContent
                            message={messageFormater("failedToLoad")}
                        />;
                }
            }()
        }
    </WidgetBody>;
}

export default WidgetWrapper(Widget, { provideConfiguration: true });

function parseCisloPar(CISLO_PAR: string): { KMENOVE_CISLO_PAR: string; PODDELENI_CISLA_PAR ?: string } {
    if (!CISLO_PAR)
        throw new Error("Missing parameter: CISLO_PAR");
    const regArr = /([0-9]+)\/([0-9]+)/.exec(CISLO_PAR);
    if (!regArr)
        return { KMENOVE_CISLO_PAR: CISLO_PAR };
    return { KMENOVE_CISLO_PAR: regArr[1], PODDELENI_CISLA_PAR: regArr[2] };
}