import { type AllWidgetProps, React } from "jimu-core";
import { ButtonGroup } from "jimu-ui";
import { WidgetWrapper, WidgetBody, DynamicDataTable, HighlightButton, AddToSelectionButton, SdEditButton } from "widgets/shared-code/components";
import { LayerInfoHelper } from "widgets/shared-code/helpers";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import QuerySelect from "./components/QuerySelect";
import SearchButton from "./components/SearchButton";
import PasportButton from "./components/PasportButton";
import { initializer, reducer } from "./helpers/state";
import EStateChange from "./enums/EStateChange";
import "./widget.scss";

const { useReducer, useRef, useContext } = React;

function Widget({ manifest, config }: AllWidgetProps<HSI.RevegetationWidget.IMConfig>) {
    const [state, dispatchState] = useReducer(reducer, config, initializer);
    const [isTableCreated, onTableCreated] = useReducer(() => true, false);
    const tableRef = useRef<__esri.FeatureTable>();
    const jimuMapView = useContext(JimuMapViewContext);

    return <WidgetBody
        className={!state.selectedQuery ? "table-hidden" : ""}
        widgetName={manifest.name}
        footer={isTableCreated ? 
            <ButtonGroup size="sm">
                <HighlightButton
                    tableRef={tableRef}
                    highlightColor={config.highlightColor}
                />
                <AddToSelectionButton
                    tableRef={tableRef}
                    sublayerProvider={() => LayerInfoHelper.findLayersByDataset(jimuMapView, state.selectedQuery)}
                />
                <SdEditButton
                    sourceClass={state.selectedQuery}
                    tableRef={tableRef}
                    oidProvider={() => Promise.resolve(tableRef.current.highlightIds.getItemAt(0))}
                    provideLayer={() => Promise.resolve(tableRef.current.layer as __esri.FeatureLayer)}
                />
                <PasportButton
                    tableRef={tableRef}
                    selectedQuery={state.selectedQuery}
                />
                <SearchButton
                    selectedQuery={state.selectedQuery}
                    selectedValue={state.selectedValue}
                    tableRef={tableRef}
                />
            </ButtonGroup> : <></>
        }
    >
        <QuerySelect
            selectQuery={selectedQuery => dispatchState({ type: EStateChange.selectQuery, selectedQuery })}
            selectQueryValue={selectedValue => dispatchState({ type: EStateChange.selectQueryValue, selectedValue })}
            selectedQuery={state.selectedQuery}
            selectedValue={state.selectedValue}
        />

        <DynamicDataTable
            dataSourceName={state.selectedQuery}
            serviceUrl={config.searchUrl}
            tableRef={tableRef}
            workspaceId={config.workspaceId}
            tableSettingExtension={manifest.name}
            title={config.queries.find(query => query.dataSet === state.selectedQuery)?.alias}
            onCreated={onTableCreated}
        />
    </WidgetBody>;
}

export default WidgetWrapper(Widget, { provideConfiguration: true });