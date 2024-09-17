declare namespace HSI {
    namespace QueriesTableWidget {
        //#region - Props
        interface IFeatureClassSelect extends Pick<IWidgetState, "selectedClass"> {
            /**
             * - Výběr třídy prvků.
             * @param selectedClass - Nově vybraná třída prvků.
             */
            selectClass(selectedClass: IObjectClass): void;
        }

        interface IQuerySelect extends Pick<IWidgetState, "selectedQuery" | "selectedClass"> {
            /**
             * - Výběr {@link query dotazu} v {@link selectedClass třídě prvků}.
             * @param query - Nově vybraný dotaz.
             */
            selectQuery(query: IQuery): void;
        }

        interface IConditionsCreator extends Pick<IWidgetState, "sqlExpression" | "selectedClass"> {
            /**
             * - Změna {@link sqlExpression omezující podmínky} dotazu.
             * @param sqlExpression - Nová omezující podmínka.
             */
            onExpressionChange(sqlExpression: IWidgetState['sqlExpression']): void;
        }

        interface ISearchButton extends Pick<IWidgetState, "sqlExpression" | "selectedClass"> {
        }

        interface IAddToSelectionButton extends Pick<IWidgetState, "tableRef" | "selectedClass"> {
        }

        interface IRemoveFromSelectionButton extends Pick<IWidgetState, "tableRef" | "selectedClass"> {
        }

        //#endregion END - Props

        //#region - Konfigurace
        /** - Konfigurace widgetu. */
        interface IConfig extends ConfigExtensions.IRequiredRoles, ConfigExtensions.IDynamicLayerExtension {
            /** - Barva zvýraznění geometrie. */
            highlightColor: string;
            /** - Třídy prvků, ve kterých lze vyhledávat. */
            objectClassWhiteList?: Array<string>;
        };

        /** - Konfigurace widgetu. */
        type IMConfig = import("jimu-core").ImmutableObject<IConfig>;
        //#endregion END - Konfigurace

        //#region - State
        type IStateParamsChange = IStateChangeSelectClass | IStateChangeSelectQuery | IStateChangeChangeExpression;

        interface IStateChangeSelectClass extends IStateChangeBase<import("./src/runtime/enums/EStateChange").EStateChange.selectClass>, Pick<IWidgetState, "selectedClass"> {
        }

        interface IStateChangeSelectQuery extends IStateChangeBase<import("./src/runtime/enums/EStateChange").EStateChange.selectQuery>, Pick<IWidgetState, "selectedQuery"> {
        }

        interface IStateChangeChangeExpression extends IStateChangeBase<import("./src/runtime/enums/EStateChange").EStateChange.changeSqlExpression>, Pick<IWidgetState, "sqlExpression"> {
        }

        interface IStateChangeBase<T extends import("./src/runtime/enums/EStateChange").EStateChange> {
            /** - Typ změny state. */
            type: T;
        }

        interface IWidgetState {
            /** - Vybraná třída prvků. */
            selectedClass?: HSI.DbRegistry.IFromDataObjectClass;
            /** - Vybraná dotaz v {@link selectedClass třídě prvků}. */
            selectedQuery?: HSI.DbRegistry.IFromDataQuery;
            /** - Omezující podmínka dotazu. */
            sqlExpression?: import("jimu-core").IMSqlExpression;
        }
        //#endregion END - State
    }
}