declare namespace HSI {
    namespace ProstorovyDotaz {
        interface IWidgetState {
            selectedClass?: HSI.DbRegistry.IFromDataObjectClass;
            selectedQuery?: HSI.DbRegistry.IFromDataQuery;
            sqlExpression?: import("jimu-core").IMSqlExpression;
        }



        interface IConfig extends ConfigExtensions.IRequiredRoles, ConfigExtensions.IDynamicLayerExtension {
            highlightColor: string;
            objectClassWhiteList?: Array<string>;
        }


        interface IConditionsCreator extends Pick<IWidgetState, "sqlExpression" | "selectedClass"> {
            onExpressionChange(sqlExpression: IWidgetState['sqlExpression']): void;
        }

        interface IAddToSelectionButton extends Pick<IWidgetState, "tableRef" | "selectedClass"> {
        }
        
        
        type IMConfig = import("jimu-core").ImmutableObject<IConfig>;

        interface IWidgetState {
            selectedClass?: HSI.DbRegistry.IFromDataObjectClass;
            selectedQuery?: HSI.DbRegistry.IFromDataQuery;
            sqlExpression?: import("jimu-core").IMSqlExpression;
        }

        interface IStateChange<K extends keyof IWidgetState> {
            type: K;
            payload?: IWidgetState[K];
        }

        type IStateParamsChange = {
            [K in keyof IWidgetState]: IStateChange<K> & { [P in K]: IWidgetState[K] };
        }[keyof IWidgetState];

    }
    
}