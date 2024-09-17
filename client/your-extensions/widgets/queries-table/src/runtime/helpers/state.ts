import EStateChange from "../enums/EStateChange";
import { ClauseLogic, Immutable, type SqlExpression, ClauseOperator, dataSourceUtils } from "jimu-core";

/**
 * 
 * @param currentState 
 * @param params 
 * @returns 
 */
export function reducer(currentState: HSI.QueriesTableWidget.IWidgetState, params: HSI.QueriesTableWidget.IStateParamsChange): HSI.QueriesTableWidget.IWidgetState {
    try {
        switch(params.type) {
            case EStateChange.selectClass:
                return {
                    selectedClass: params.selectedClass
                };

            case EStateChange.selectQuery:
                const newState: typeof currentState = {
                    selectedClass: currentState.selectedClass
                };

                if (!!params.selectedQuery) {
                    
                    newState.selectedQuery = params.selectedQuery;

                    const sqlExpression: SqlExpression = {
                        sql: "",
                        logicalOperator: ClauseLogic.And,
                        parts: !params.selectedQuery.fields ? [] : params.selectedQuery.fields.map(({ name }) => dataSourceUtils.createSQLClause(name, ClauseOperator.StringOperatorIs, []))
                    };
                    
                    newState.sqlExpression = Immutable(sqlExpression);
                }

                return newState;

            case EStateChange.changeSqlExpression:
                return {
                    selectedClass: currentState.selectedClass,
                    selectedQuery: currentState.selectedQuery,
                    sqlExpression: params.sqlExpression
                };

            default:
                throw new Error(`Unhandled state change '${params['type']}`)
        }
    } catch(err) {
        console.warn(err);
        return currentState;
    }
}

export function initializer(): HSI.QueriesTableWidget.IWidgetState {
    return {};
}