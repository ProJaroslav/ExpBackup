/**
 * - Rozhosuje o změně {@link currentState state} na základě {@link params parametrů}.
 * @param currentState - Současný state.
 * @param params - Parametry podle kterých se mení hodnoty state.
 */
export function reducer(currentState: HSI.LandReportWidget.IWidgetState, params: StateChangeParams): HSI.LandReportWidget.IWidgetState {
    try {
        switch (params.type) {
            case EStateChange.selectQuery:
                return {
                    query: params.query,
                    queryParametresValues: {}
                };

            case EStateChange.setParamValue:
                const queryParametresValues = { ...currentState.queryParametresValues };
                queryParametresValues[params.name] = params.value;

                return {
                    query: currentState.query,
                    queryParametresValues
                };
    
            default:
                throw new Error(`Unhandled state change ${params['type']}`);
        }
    } catch(err) {
        console.warn(err);
        return currentState;
    }
}

export const defaultState: HSI.LandReportWidget.IWidgetState = {};

export enum EStateChange {
    /** - Výběr dotazu pozemků. */
    selectQuery,
    /** - Změna hodnoty parametru dotazu. */
    setParamValue,
    /** - Změna stavu dotazu. */
    setQueryState
};

type StateChangeParams = IStateParamsSelectQuery | IStateParamsSetParam;

interface StateChangeBase<T extends EStateChange> {
    /** - Typ změny state. */
    type: T;
}

interface IStateParamsSelectQuery extends StateChangeBase<EStateChange.selectQuery>, Pick<HSI.LandReportWidget.IWidgetState, "query"> {} 

interface IStateParamsSetParam extends StateChangeBase<EStateChange.setParamValue> {
    /** - Název parametru. */
    name: string;
    /** - Hodnota parametru. */
    value: HSI.LandReportWidget.IWidgetState['queryParametresValues'][string];
}