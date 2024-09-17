import { React } from "jimu-core";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "jimu-ui";
import { useMessageFormater, useConfig, useTableSelectionCount } from "widgets/shared-code/hooks";
import { NotificationHelper, LayerInfoHelper, LayerHelper } from "widgets/shared-code/helpers";
import { ELoadStatus } from "widgets/shared-code/enums";
import { WarningContent } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import translations from "../translations/default";
import Pasport, { SUM_AREA_FIELD } from "./Pasport";
import { CalciteLoader } from "calcite-components";

const { useState, useContext, useEffect } = React;
const defaultState: IState = { isOpen: false };

/** - Tlačítko pro zobrazení pasportizace. */
export default function({ tableRef, selectedQuery }: HSI.RevegetationWidget.IPasportButton) {
    const messageFormater = useMessageFormater(translations);
    const config = useConfig<HSI.RevegetationWidget.IMConfig>();
    const selectionCount = useTableSelectionCount(tableRef);
    const [state, dispatchState] = useState<IState>(defaultState);
    const jimuMapView = useContext(JimuMapViewContext);

    // Při změně výběru se zavře okno.
    useEffect(() => {
        const listener = tableRef.current.on('selection-change', () => {
            dispatchState(defaultState);
        });

        return function() {
            listener.remove();
        }
    }, [tableRef, dispatchState]);

    /**
     * - Dotaz pro získání pasportizace.
     * @param sqlQuery - SQL dotaz.
     * @param sppValue - Hodnota SPP.
     */
    async function fetchPasportQueryTable(sqlQuery: string, sppValue: string): Promise<HSI.RevegetationWidget.IPasportizaceQueryTableResult['GetPasportizaceQueryTableResult']> {
        const result = await fetch(config.pasportizaceQueryUrl, {
            body: JSON.stringify({
                sqlQuery,
                paramList: [{ ParameterName: "@SPP", ParameterValue: sppValue }]
            }),
            method: "POST"
        });

        const response: HSI.RevegetationWidget.IPasportizaceQueryTableResult = await result.json();

        return response.GetPasportizaceQueryTableResult;
    }

    /**
     * - Získání prvků s údaji o výměrách.
     * @param feature - Prvek podle jehož hodnot se hledají údaje o výměrách.
     */
    async function fetchSumFeatures(feature: __esri.Graphic) {
        const layer = await LayerHelper.createDynamicDataSourceLayer(config.searchUrl, config.workspaceId, config.sumClassName, true);

        let shapeAreaField: string;
        if (typeof layer.geometryFieldsInfo?.shapeAreaField === "string") {
            shapeAreaField = layer.geometryFieldsInfo.shapeAreaField;
        } else  {
            const featureLayer = await LayerHelper.createFeatureLayer((await LayerInfoHelper.findLayersByDataset(jimuMapView, config.sumClassName))[0], true);
            if (typeof featureLayer.geometryFieldsInfo?.shapeAreaField === "string") {
                shapeAreaField = featureLayer.geometryFieldsInfo.shapeAreaField;
            } else {
                shapeAreaField = layer.fields.find(field => field.name.toUpperCase().includes("AREA"))?.name;
            }
        }

        return layer.queryFeatures({
            where: `${config.sumSppAttribute} like '${feature.getAttribute(config.queries.find(({ dataSet }) => selectedQuery === dataSet).sppAttribute)}%'`,
            outStatistics: [{ statisticType: "sum", onStatisticField: shapeAreaField, outStatisticFieldName: SUM_AREA_FIELD }],
            groupByFieldsForStatistics: [config.sumKindAttribute]
        });
    }

    /** - Načtení pasportizace. */
    async function loadPasport() {
        try {
            dispatchState({ isOpen: true, loadState: ELoadStatus.Pending });

            const query = config.queries.find(({ dataSet }) => selectedQuery === dataSet);

            const featureSet = await (tableRef.current.layer as __esri.FeatureLayer).queryFeatures({
                objectIds: [tableRef.current.highlightIds.getItemAt(0)],
                returnGeometry: false,
                outFields: query.pasportAttributes
            });

            const feature = featureSet.features[0];

            const [sumFeatureSet, contracts, technicalUnits] = await Promise.all([
                fetchSumFeatures(featureSet.features[0]),
                fetchPasportQueryTable("select smlouva_lokalita, smlouva_cislo, smlouva_rok, nazev, zhotovitel, cena, poznamka from smlouvy where spp_prvek=@SPP order by smlouva_cislo", feature.getAttribute(query.sppAttribute)),
                fetchPasportQueryTable("select smlouva_lokalita, smlouva_cislo, smlouva_rok, technicka_jednotka, jednotka, mnozstvi, cena, poznamka from jednotky where spp_prvek=@SPP order by smlouva_cislo", feature.getAttribute(query.sppAttribute))
            ]);

            dispatchState(state => {
                if (!state.isOpen) {
                    return state;
                }

                return {
                    isOpen: true,
                    loadState: ELoadStatus.Loaded,
                    fields: featureSet.fields,
                    selectedFeature: feature,
                    sumFeatureSet,
                    contracts,
                    technicalUnits
                };
            });
        } catch(err) {
            console.warn(err);
            dispatchState(state => {
                if (!state.isOpen) {
                    return state;
                }

                return {
                    isOpen: true,
                    loadState: ELoadStatus.Error,
                    errorMessage: NotificationHelper.getErrorMessage(err)
                };
            });
        }
    }

    return <>
        <Button
            onClick={loadPasport}
            disabled={selectionCount !== 1}
        >
            {messageFormater("pasportButton")}
        </Button>
        <Modal
            centered
            isOpen={state.isOpen}
            toggle={() => dispatchState(defaultState)}
            modalClassName="revegetation-pasport-modal"
        >
            <ModalHeader toggle={() => dispatchState(defaultState)}>{messageFormater("pasportHeader")}</ModalHeader>
            <ModalBody>
                {
                    function() {
                        if (!state.isOpen) {
                            return <></>;
                        }

                        switch(state.loadState) {
                            case ELoadStatus.Error:
                                return <WarningContent
                                    message={state.errorMessage}
                                    title={messageFormater("failedToLoadPasport")}
                                />;

                            default:
                            case ELoadStatus.Pending:
                                return <CalciteLoader label="" scale="l" />;

                            case ELoadStatus.Loaded:
                                return <Pasport
                                    fields={state.fields}
                                    selectedFeature={state.selectedFeature}
                                    sumFeatureSet={state.sumFeatureSet}
                                    contracts={state.contracts}
                                    technicalUnits={state.technicalUnits}
                                />;
                        }
                    }()
                }
            </ModalBody>
        </Modal>
    </>;
}

interface IStateBase<T extends boolean> {
    /** - Je otevřeno okno s pasportizací? */
    isOpen: T;
}

interface ILoadingStateBase<T extends ELoadStatus> extends IStateBase<true> {
    /** - Stav načtení pasportizace. */
    loadState: T;
}

interface IErrorState extends ILoadingStateBase<ELoadStatus.Error> {
    /** - Odchycená chybová hláška při načítání pasportizace. */
    errorMessage: string;
}

interface ILoadedState extends ILoadingStateBase<ELoadStatus.Loaded>, HSI.RevegetationWidget.IPasport {
}

type IState = IStateBase<false> | ILoadingStateBase<ELoadStatus.Pending> | IErrorState | ILoadedState;