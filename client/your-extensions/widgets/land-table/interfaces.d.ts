declare namespace HSI {
    namespace LandTableWidget {
        //#region - Props
        interface IQueryParams extends Pick<IWidgetState, "query" | "queryParametresValues"> {
            /**
             * - Změna hodnoty parametru dotazu.
             * @param name - Název parametru.
             * @param value - Hodnota parametru.
             */
            selectParameterValue(name: string, value: IWidgetState['queryParametresValues'][string]): void;
        }

        interface ISelectQuery extends Pick<IWidgetState, "query"> {
            /**
             * - Výběr dotazu.
             * @param query - Nově vybraný dotaz.
             */
            selectQuery(query: IQuery): void;
        }

        interface IAddToSelectionButton extends Pick<HSI.UseLandQueries.ILandSearchReturn, "landSearchState"> {
            /** - Reference tabulky. */
            tableRef: React.MutableRefObject<__esri.FeatureTable>;
        }

        interface IBuildingButton extends Pick<HSI.UseLandQueries.ILandSearchReturn, "landSearchState"> {
            /** - Reference tabulky. */
            tableRef: React.MutableRefObject<__esri.FeatureTable>;
        }

        interface IParcelButton extends Pick<HSI.UseLandQueries.ILandSearchReturn, "landSearchState"> {
            /** - Reference tabulky. */
            tableRef: React.MutableRefObject<__esri.FeatureTable>;
        }

        interface IOwnerButton extends Pick<HSI.UseLandQueries.ILandSearchReturn, "landSearchState"> {
            /** - Reference tabulky. */
            tableRef: React.MutableRefObject<__esri.FeatureTable>;
        }

        interface IJpvButton extends Pick<HSI.UseLandQueries.ILandSearchReturn, "landSearchState"> {
            /** - Reference tabulky. */
            tableRef: React.MutableRefObject<__esri.FeatureTable>;
        }

        interface ISapButton extends Pick<HSI.UseLandQueries.ILandSearchReturn, "landSearchState"> {
            /** - Reference tabulky. */
            tableRef: React.MutableRefObject<__esri.FeatureTable>;
        }

        interface ICuzkButton extends Pick<HSI.UseLandQueries.ILandSearchReturn, "landSearchState"> {
            /** - Reference tabulky. */
            tableRef: React.MutableRefObject<__esri.FeatureTable>;
        }

        interface IHighlightButton extends Pick<HSI.UseLandQueries.ILandSearchReturn, "landSearchState"> {
            /** - Reference tabulky. */
            tableRef: React.MutableRefObject<__esri.FeatureTable>;
        }
        //#endregion END - Props

        //#region - State
        interface IWidgetState extends UseLandQueries.ILandSearchParams {
        }

        type IStateParams = IStateParamsSelectQuery | IStateParamsSetParam;

        interface IStateParamsBase<T extends import("./src/runtime/enums/EStateChange").EStateChange.selectQuery> {
            /** - Typ změny state. */
            type: T;
        }

        interface IStateParamsSelectQuery extends IStateParamsBase<import("./src/runtime/enums/EStateChange").EStateChange.selectQuery>, Pick<IWidgetState, "query"> {} 

        interface IStateParamsSetParam extends IStateParamsBase<import("./src/runtime/enums/EStateChange").EStateChange.setParamValue> {
            /** - Název parametru. */
            name: string;
            /** - Hodnota parametru. */
            value: IWidgetState['queryParametresValues'][string];
        }

        //#endregion END - State

        //#region - Konfigurace
        /** - Konfigurace widgetu. */
        interface IConfig extends HSI.ConfigExtensions.IRequiredRoles {
            /** - Dotazy, které lze ve widgetu použít. */
            queryWhiteList: Array<string>;
            /** - Barva zvýraznění geometrie. */
            highlightColor: string;
            /** - URL adresa z parcely pro proklik do ČÚZK. */
            parcelCuzkUrl: string;
            /** - URL adresa z budovy pro proklik do ČÚZK. */
            buildingCuzkUrl: string;
            /** - URL adresa z budovy pro proklik do ČÚZK. */
            buildingCuzkUrl: string;
        };

        /** - Konfigurace widgetu. */
        type IMConfig = import("jimu-core").ImmutableObject<IConfig>;
        //#endregion END - Konfigurace
    }
}