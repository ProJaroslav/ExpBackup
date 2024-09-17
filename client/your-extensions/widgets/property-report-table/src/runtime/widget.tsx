import { type AllWidgetProps, React } from "jimu-core";
import { Button, ButtonGroup, Label, NumericInput } from "jimu-ui";
import { WidgetWrapper, WidgetBody, SelectFilter } from "widgets/shared-code/components";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { LayerHelper, NotificationHelper } from "widgets/shared-code/helpers";
import translations from "./translations/default";
import EditButton from "./components/EditButton";
import HighlightButton from "./components/HighlightButton";
import AddToSelectionButton from "./components/AddToSelectionButton";
import DeleteFromSelectionButton from "./components/DeleteFromSelectionButton";
import DifferenceButton from "./components/DifferenceButton";
import Table from "./components/Table";
import { ELoadStatus } from "widgets/shared-code/enums";
import "./widget.scss";
import { LayerTypes } from "jimu-arcgis";

const { useReducer, useRef, useEffect, useState } = React;

function Widget({ manifest, config }: AllWidgetProps<HSI.PropertyReportTableWidget.IMConfig>) {
    const tableRef = useRef<__esri.FeatureTable>();
    const messageFormater = useMessageFormater(translations);
    const [state, setState] = useState<IStateBase<ELoadStatus.Pending> | IStateError | IStateLoaded>({ loadedState: ELoadStatus.Pending });
    const [isTableLoaded, onTableLoaded] = useReducer(() => true, false);

    useEffect(() => {
        setState({ loadedState: ELoadStatus.Pending });
        const abortController = new AbortController();

        (async function() {
            try {
                const [sapLayer, reportLayer] = await Promise.all([
                    LayerHelper.createDynamicDataSourceLayer(config.dynamicServiceUrl, config.workspaceId, config.sapTable, true),
                    LayerHelper.createDynamicDataSourceLayer(config.dynamicServiceUrl, config.workspaceId, config.reportTable)
                ]);

                const allYears = await reportLayer.queryFeatures({
                        where: "1=1",
                        returnDistinctValues: true,
                        outFields: ["SAP_ROKPORIZENI"]
                }, { signal: abortController.signal });


                if (!abortController.signal.aborted) {
                    setState({
                        loadedState: ELoadStatus.Loaded,
                        maxYear: new Date().getFullYear(),
                        minYear: Math.min(...allYears.features.map(feature => feature.getAttribute("SAP_ROKPORIZENI")).filter(year => !!year)),
                        sapOptions: (sapLayer.fields.find(({ name }) => name === config.sapField).domain as __esri.CodedValueDomain)
                            .codedValues
                            .map(({ code, name }) => ({
                                value: code,
                                label: `${name} (${code})`
                            }))
                            .sort((a, b) => a.label.localeCompare(b.label))
                    });
                }


            } catch(err) {
                if (!abortController.signal.aborted) {
                    console.warn(err);
                    setState({ loadedState: ELoadStatus.Error, errorMessage: NotificationHelper.getErrorMessage(err) });
                }
            }
        })();

        return function() {
            abortController.abort();
        }
    }, [config]);

    /** - Funkce poskytuje where klauzuly na základě zadaných parametrů. */
    function getWhereClause() {
        if (state.loadedState === ELoadStatus.Loaded) {
            const definitionExpression: Array<string> = [];

            if (typeof state.selectedInventoryNo === "number") {
                definitionExpression.push(`INVENTARNI_CISLO LIKE '${state.selectedInventoryNo}'`);
            }

            if (typeof state.selectedYear === "number") {
                definitionExpression.push(`SAP_ROKPORIZENI LIKE '${state.selectedYear}'`);
            }

            if (!!state.selectedSap) {
                definitionExpression.push(`SAP_ORGANIZACE LIKE '${state.selectedSap}'`);
            }

            return definitionExpression.length > 0 ? definitionExpression.join(" AND ") : "1=1";
        }
    }

    /** - Aktualizace tabulky podle vyhledávacích parametrů. */
    function search() {
        if (tableRef.current?.layer?.type === LayerTypes.FeatureLayer) {
            tableRef.current.layer.definitionExpression = getWhereClause();
        }
    }

    return <WidgetBody
        widgetName={manifest.name}
        footer={<ButtonGroup size="sm">
            <DifferenceButton getWhereClause={getWhereClause} />
            <EditButton tableRef={tableRef} />
            <HighlightButton tableRef={tableRef} />
            <AddToSelectionButton tableRef={tableRef} />
            <DeleteFromSelectionButton tableRef={tableRef} />
            <Button
                disabled={!isTableLoaded}
                type="primary"
                onClick={search}
            >
                {messageFormater("searchButton")}
            </Button>
        </ButtonGroup>}
    >
        <Label for="inventory-no">
            {messageFormater("inventoryNoLabel")}
        </Label>
        <NumericInput
            size="sm"
            id="inventory-no"
            value={state.loadedState === ELoadStatus.Loaded && state.selectedInventoryNo}
            onChange={selectedInventoryNo => setState(currentState => ({ ...currentState, selectedInventoryNo }))}
        />
        <Label for="year">
            {messageFormater("yearLabel")}
        </Label>
        <NumericInput
            size="sm"
            id="year"
            min={state.loadedState === ELoadStatus.Loaded && state.minYear}
            max={state.loadedState === ELoadStatus.Loaded && state.maxYear}
            value={state.loadedState === ELoadStatus.Loaded && state.selectedYear}
            onChange={selectedYear => setState(currentState => ({ ...currentState, selectedYear }))}
        />
        <Label for="sap-org">
            {messageFormater("sapOrgLabel")}
        </Label>

        <SelectFilter
            options={state.loadedState === ELoadStatus.Loaded ? state.sapOptions : []}
            loading={state.loadedState === ELoadStatus.Pending}
            nullable
            selectProps={{
                id: "sap-org",
                size: "sm",
                value: state.loadedState === ELoadStatus.Loaded && state.selectedSap,
                onChange(ev) {
                    setState(currentState => ({ ...currentState, selectedSap: ev.target.value }));
                }
            }}
        />
        <Table
            tableRef={tableRef}
            onCreated={onTableLoaded}
        />
    </WidgetBody>;
}

export default WidgetWrapper(Widget, { provideConfiguration: true });

interface IStateBase<T extends ELoadStatus> {
    /** - Stav načtení číselníku. */
    loadedState: T;
}

interface IStateError extends IStateBase<ELoadStatus.Error> {
    /** - Odchycená chybová hláška. */
    errorMessage: string;
}

interface IStateLoaded extends IStateBase<ELoadStatus.Loaded> {
    minYear: number;
    maxYear: number;
    sapOptions: HSI.SelectFilter.ISelectFilterProps['options'];
    selectedInventoryNo?: number;
    selectedYear?: number;
    selectedSap?: number | string;
}