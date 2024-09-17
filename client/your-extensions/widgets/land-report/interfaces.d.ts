declare namespace HSI {
    namespace LandReportWidget {
        //#region - Props
        
        interface ISelectQuery extends Pick<IWidgetState, "query" | "queryParametresValues"> {
            /** - Načtené dotazy pozemků. */
            queries: Array<UseLandQueries.IQuery>;
            /**
             * Výběr dotazu
             * @param query - Nově vybraný dotaz.
             */
            selectQuery(query: UseLandQueries.IQuery);
            /**
             * - Změna hodnoty parametru dotazu.
             * @param name - Název parametru.
             * @param value - Hodnota parametru.
             */
            selectParameterValue(name: string, value: IWidgetState['queryParametresValues'][string]): void;
        }

        interface IDownloadReport {
            executeQueryState: UseLandQueries.IExecuteQueryState
        }

        //#endregion END - Props

        //#region - State
        interface IWidgetState extends UseLandQueries.ILandSearchParams {
        }
        //#endregion END - State

        //#region - Konfigurace
        /** - Konfigurace widgetu. */
        interface IConfig extends ConfigExtensions.IRequiredRoles {
            /** - Dotazy, které lze ve widgetu použít. */
            queryWhiteList: Array<string>;
        };

        /** - Konfigurace widgetu. */
        type IMConfig = import("jimu-core").ImmutableObject<IConfig>;
        //#endregion END - Konfigurace

    }
}