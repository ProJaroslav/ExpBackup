import { type AllWidgetProps, React } from "jimu-core";
import { WidgetWrapper, WidgetBody, LoadingButton, WarningContent } from "widgets/shared-code/components";
import { useMessageFormater, useLandQueries, useLandSearch } from "widgets/shared-code/hooks";
import { ELoadStatus } from "widgets/shared-code/enums";
import { CalciteLoader } from "calcite-components";
import SelectQuery from "./components/SelectQuery";
import DownloadReport from "./components/DownloadReport";
import translations from "./translations/default";
import { reducer, defaultState, EStateChange } from "./helper/state";
import "./widget.scss";

const { useReducer } = React;

function Widget({ manifest, config }: AllWidgetProps<HSI.LandReportWidget.IMConfig>) {
    const messageFormater = useMessageFormater(translations);
    const landState = useLandQueries(config.queryWhiteList);
    const { landSearchState, searchLand } = useLandSearch();
    const [state, dispatchState] = useReducer(reducer, defaultState);

    return <WidgetBody
        widgetName={manifest.name}
        footer={<LoadingButton
            size="sm"
            loading={landState.loadStatus === ELoadStatus.Pending || landSearchState?.loadStatus === ELoadStatus.Pending}
            onClick={() => searchLand(state)}
            disabled={landState.loadStatus !== ELoadStatus.Loaded || !state.query || landSearchState?.loadStatus === ELoadStatus.Pending}
        >
            {messageFormater("searchButton")}
        </LoadingButton>}
    >
        {function() {
            if (landState.loadStatus === ELoadStatus.Error) {
                return <WarningContent
                    title={messageFormater("failedLoadQuery")}
                    message={landState.errorMessage}
                />;
            }

            if (landState.loadStatus === ELoadStatus.Pending) {
                return <CalciteLoader label="" scale="l" />;
            }

            return <>
                <SelectQuery
                    queries={landState.queries}
                    query={state.query}
                    queryParametresValues={state.queryParametresValues}
                    selectParameterValue={(name, value) => dispatchState({ type: EStateChange.setParamValue, name, value })}
                    selectQuery={query => dispatchState({ type: EStateChange.selectQuery, query })}
                />

                <DownloadReport
                    landSearchState={landSearchState}
                />
            </>;
        }()}
    </WidgetBody>;
}

export default WidgetWrapper(Widget, { provideConfiguration: true, hasAssets: true });