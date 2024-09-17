import EStateChange from "../enums/EStateChange";

/**
 * - Změna hodnot {@link currentState state} na základě {@link params parametrů}.
 * @param currentState - Současné hodnoty state. 
 * @param params - Parametry podle kterých se mění {@link currentState state}.
 */
export function reducer(currentState: HSI.RevegetationWidget.IWidgetState, params: HSI.RevegetationWidget.IStateParamsChange): HSI.RevegetationWidget.IWidgetState {
    try {
        switch(params.type) {
            case EStateChange.selectQueryValue:
                return {
                    selectedQuery: currentState.selectedQuery,
                    selectedValue: params.selectedValue
                };

            case EStateChange.selectQuery:
                return {
                    selectedQuery: params.selectedQuery,
                    selectedValue: null
                };

            default:
                throw new Error(`Unhandled state change '${params['type']}`)
        }
    } catch(err) {
        console.warn(err);
        return currentState;
    }
}

/** - Poskytuje výchozí hodnoty state. */
export function initializer(config: HSI.RevegetationWidget.IMConfig): HSI.RevegetationWidget.IWidgetState {
    return {
        selectedQuery: config.getIn(["queries", 0, "dataSet"]),
        selectedValue: null
    };
}