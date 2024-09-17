import EStateChange from "../enums/EStateChange";

/**
 * - Změna hodnot {@link currentState state} podle {@link params parametrů}.
 * @param currentState - Současné hodnoty state.
 * @param params - Parametry podle kterých se mění state.
 */
export default function(currentState: HSI.LandTableWidget.IWidgetState, params: HSI.LandTableWidget.IStateParams): HSI.LandTableWidget.IWidgetState {
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