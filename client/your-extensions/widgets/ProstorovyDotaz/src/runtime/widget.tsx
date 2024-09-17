import React from 'react';
import { type AllWidgetProps } from 'jimu-core';
import {
    WidgetWrapper,
    WidgetBody,
    DynamicDataTable,
    HighlightButton
} from 'widgets/shared-code/components';
import ClassSelect from './components/ClassSelect';
import QueryGraphicalResult from './components/QueryGraphicalResult';
import {ButtonGroup, Button} from "jimu-ui"
import {reducer, initializer} from "./helpers/state"
import {EStateChange} from "./enums/EStateChange"
import ConditionsCreator from "widgets/queries-table/src/runtime/components/ConditionsCreator";
import QuerySelect from "widgets/queries-table/src/runtime/components/QuerySelect";
import AddToSelectionButton from "./components/AddToSelectionButton"
function Widget(props: AllWidgetProps<HSI.ProstorovyDotaz.IMConfig>) {
    const { manifest, config, widgetId } = props;
    const [state, dispatchState] = React.useReducer(reducer, null, initializer)
    const tableRef = React.useRef<__esri.FeatureTable>();

    function selectClassHandler(selectedClass: HSI.DbRegistry.IFromDataObjectClass) {
        dispatchState({
            type: 'selectedClass', 
            payload: selectedClass,
            selectedClass: selectedClass 
        });
    }

    return (
        <WidgetBody
            widgetName={manifest.name}
            className="widget-demo jimu-widget m-2"
        >
            <ButtonGroup>
                <HighlightButton
                    tableRef={tableRef}
                    highlightColor={config.highlightColor}
                />
                <AddToSelectionButton
                    tableRef={tableRef}
                    selectedClass={state.selectedClass}                
                ></AddToSelectionButton>
            </ButtonGroup>
            <div className="query-select">
                <ClassSelect selectClass={selectClassHandler}/>
                <QuerySelect
                    selectQuery={selectedQuery => dispatchState({ type: "selectedQuery", selectedQuery })}
                    selectedClass={state.selectedClass}
                    selectedQuery={state.selectedQuery}
                />
            </div>
            <div>
                <ConditionsCreator
                    selectedClass={state.selectedClass}
                    onExpressionChange={sqlExpression => dispatchState({ type: "sqlExpression", sqlExpression })}
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
            </div>
        </WidgetBody>
);
}

export default WidgetWrapper(Widget);
