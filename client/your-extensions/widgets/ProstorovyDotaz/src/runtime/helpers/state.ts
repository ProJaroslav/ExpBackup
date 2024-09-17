import {EStateChange} from "../enums/EStateChange"
import { ClauseLogic, Immutable, type SqlExpression, ClauseOperator, dataSourceUtils } from "jimu-core";

export function reducer(currentState: HSI.ProstorovyDotaz.IWidgetState, params: HSI.ProstorovyDotaz.IStateParamsChange): HSI.QueriesTableWidget.IWidgetState {
    try {
        switch(params.type) {
            case "selectedClass": 
                return {
                    selectedClass: params.selectedClass
                }
                
            case "selectedQuery": 
                const newState: typeof currentState = {
                    selectedClass: currentState.selectedClass
                }
                
                if (!!params.selectedQuery) {
                    
                    newState.selectedQuery = params.selectedQuery
                    
                    const sqlExpression: SqlExpression = {
                        sql: "",
                        logicalOperator: ClauseLogic.And,
                        parts: !params.selectedQuery.fields ? [] : params.selectedQuery.fields.map(({ name }) => dataSourceUtils.createSQLClause(name, ClauseOperator.StringOperatorIs, []))

                    }

                    newState.sqlExpression = Immutable(sqlExpression);

                }
                return newState;

            case "sqlExpression":
                return {
                    selectedClass: currentState.selectedClass,
                    selectedQuery: currentState.selectedQuery,
                    sqlExpression: params.sqlExpression
                };

            default:
                throw new Error(`Unhandled state change '${params['type']}`)

                return newState;
            }
    }     catch(err) {
        console.warn(err);

        return currentState;
    }
}

export function initializer(): HSI.QueriesTableWidget.IWidgetState {
    return {};
}

