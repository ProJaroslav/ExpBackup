import { type AllWidgetProps, React } from "jimu-core";
import { ButtonGroup } from "jimu-ui";
import { WidgetWrapper, WidgetBody, FeatureTable, LoadingButton } from "widgets/shared-code/components";
import { useMessageFormater, useLandSearch } from "widgets/shared-code/hooks";
import { ArcGISJSAPIModuleLoader } from "widgets/shared-code/helpers";
import { ELoadStatus } from "widgets/shared-code/enums";
import EStateChange from "./enums/EStateChange";
import translations from "./translations/default";
import SelectQuery from "./components/SelectQuery";
import QueryParams from "./components/QueryParams";
import HighlightButton from "./components/HighlightButton";
import AddToSelectionButton from "./components/AddToSelectionButton";
import BuildingButton from "./components/BuildingButton";
import ParcelButton from "./components/ParcelButton";
import OwnersButton from "./components/OwnersButton";
import ExcelButton from "./components/ExcelButton";
import JpvButton from "./components/JpvButton";
import CuzkButton from "./components/CuzkButton";
import SapButton from "./components/SapButton";
import reducer from "./helpers/state";
import "./widget.scss";

const { useReducer, useRef, useEffect } = React;
const FeatureLayerLoader = new ArcGISJSAPIModuleLoader(["FeatureLayer"]);

function Widget({ manifest }: AllWidgetProps<HSI.LandTableWidget.IMConfig>) {
    const [state, dispatchState] = useReducer(reducer, {});
    const messageFormater = useMessageFormater(translations);
    const tableRef = useRef<__esri.FeatureTable>();
    const { landSearchState, searchLand } = useLandSearch();

    useEffect(() => {
        if (landSearchState?.loadStatus === ELoadStatus.Loaded && !!tableRef.current) {
            (async function() {
                if (!FeatureLayerLoader.isLoaded) {
                    await FeatureLayerLoader.load();
                }

                const { response, queryParams } = landSearchState;

                if (response.IsReport === false) {
                    const FeatureLayer = FeatureLayerLoader.getModule("FeatureLayer");
                    const fields: Array<__esri.FieldProperties> = response.Fields.map(({ Caption }, index) => ({
                        name: index.toString(),
                        type: index === 0 ? "oid" : "string",
                        alias: Caption
                    }));
    
                    const featureLayer = new FeatureLayer({
                        title: queryParams.query.Description,
                        source: response.DataRows.map(({ Values, id }) => {
                            const attributes = {};
                            for (let index = 0; Values.length > index; index++) {
                                attributes[index.toString()] = index === 0 ? parseInt(Values[index]) : Values[index];
                            }
                            return {
                                attributes
                            };
                        }),
                        fields
                    });
                    tableRef.current.layer = featureLayer;
                }

            })();
        }
    }, [landSearchState, tableRef]);
    
    return <WidgetBody
        widgetName={manifest.name}
        footer={
            <ButtonGroup size="sm">
                <HighlightButton
                    tableRef={tableRef}
                    landSearchState={landSearchState}
                />
                <AddToSelectionButton
                    tableRef={tableRef}
                    landSearchState={landSearchState}
                />
                <BuildingButton
                    tableRef={tableRef}
                    landSearchState={landSearchState}
                />
                <ParcelButton
                    tableRef={tableRef}
                    landSearchState={landSearchState}
                />
                <OwnersButton
                    tableRef={tableRef}
                    landSearchState={landSearchState}
                />
                <JpvButton
                    tableRef={tableRef}
                    landSearchState={landSearchState}
                />
                <CuzkButton
                    tableRef={tableRef}
                    landSearchState={landSearchState}
                />
                <ExcelButton
                />
                <SapButton
                    tableRef={tableRef}
                    landSearchState={landSearchState}
                />
                <LoadingButton
                    disabled={!state.query}
                    onClick={() => searchLand(state)}
                    type="primary"
                    loading={landSearchState?.loadStatus === ELoadStatus.Pending}
                >
                    {messageFormater("searchButton")}
                </LoadingButton>
            </ButtonGroup>
        }
    >
        <SelectQuery
            query={state.query}
            selectQuery={query => dispatchState({ type: EStateChange.selectQuery, query })}
        />
        <QueryParams
            selectParameterValue={(name, value) => dispatchState({ type: EStateChange.setParamValue, name, value })}
            queryParametresValues={state.queryParametresValues}
            query={state.query}
        />

        <div className={landSearchState?.loadStatus === ELoadStatus.Loaded ? "table-content" : "table-content widget-land-hidden-table"}>
            <FeatureTable tableRef={tableRef} />
        </div>
    </WidgetBody>;
}

export default WidgetWrapper(Widget, { provideConfiguration: true });