import { LayerTypes } from "jimu-arcgis";
import { type AllWidgetProps, React } from "jimu-core";
import { Button, ButtonGroup } from "jimu-ui";
import { WidgetWrapper, WidgetBody, DynamicDataTable, HighlightButton, SdEditButton } from "widgets/shared-code/components";
import FeatureClassSelect from "./components/FeatureClassSelect";
import QuerySelect from "./components/QuerySelect";
import ConditionsCreator from "./components/ConditionsCreator";
import AddToSelectionButton from "./components/AddToSelectionButton";
import RemoveFromSelectionButton from "./components/RemoveFromSelectionButton";
import { reducer, initializer } from "./helpers/state";
import EStateChange from "./enums/EStateChange";
import { useMessageFormater } from "widgets/shared-code/hooks";
import translations from "./translations/default";
import "./widget.scss";

const { useReducer, useRef } = React;

function Widget({ manifest, config }: AllWidgetProps<HSI.QueriesTableWidget.IMConfig>) {
    const [state, dispatchState] = useReducer(reducer, null, initializer);
    const tableRef = useRef<__esri.FeatureTable>();
    const messageFormater = useMessageFormater(translations);

    async function search() {
        if (tableRef.current?.layer?.type === LayerTypes.FeatureLayer) {
            tableRef.current.layer.definitionExpression = state.sqlExpression?.sql || "1=1";
        }
    }

    return <WidgetBody
        widgetName={manifest.name}
        footer={<ButtonGroup
            size="sm"
        >
            <SdEditButton
                sourceClass={state.selectedClass?.objectClass}
                tableRef={tableRef}
                oidProvider={() => {
                    const id = tableRef.current.highlightIds.getItemAt(0);
                    return Promise.resolve(typeof id === "string" ? parseInt(id) : id);
                }}
                provideLayer={() => Promise.resolve(tableRef.current.layer as __esri.FeatureLayer)}
            />
            <HighlightButton
                tableRef={tableRef}
                highlightColor={config.highlightColor}
            />
            <RemoveFromSelectionButton
                tableRef={tableRef}
                selectedClass={state.selectedClass}
            />

            <AddToSelectionButton
                tableRef={tableRef}
                selectedClass={state.selectedClass}
            />

            <Button
                disabled={!state.selectedClass}
                onClick={search}
            >
                {messageFormater("searchButton")}
            </Button>
        </ButtonGroup>}
    >
        <div className="query-select">
            <FeatureClassSelect
                selectClass={selectedClass => dispatchState({ type: EStateChange.selectClass, selectedClass })}
                selectedClass={state.selectedClass}
            />

            <QuerySelect
                selectQuery={selectedQuery => dispatchState({ type: EStateChange.selectQuery, selectedQuery })}
                selectedClass={state.selectedClass}
                selectedQuery={state.selectedQuery}
            />
        </div>

        <ConditionsCreator
            selectedClass={state.selectedClass}
            onExpressionChange={sqlExpression => dispatchState({ type: EStateChange.changeSqlExpression, sqlExpression })}
            sqlExpression={state.sqlExpression}
        />

        <DynamicDataTable
            dataSourceName={state.selectedClass?.objectClass}
            tableRef={tableRef}
            title={state.selectedClass?.alias}
            tableSettingExtension={manifest.name}
            serviceUrl={config.dynamicServiceUrl}
            workspaceId={config.workspaceId}
        />
    </WidgetBody>;
}

export default WidgetWrapper(Widget, { provideConfiguration: true });