declare namespace HSI {
    namespace RevegetationWidget {
        //#region - Props
        interface IQuerySelect extends Pick<IWidgetState, "selectedQuery" | "selectedValue"> {
            /**
             * - Výběr dotazu.
             * @param selectedQuery - Nově vybraný dotaz.
             */
            selectQuery(selectedQuery: IWidgetState['selectedQuery']): void;
            /**
             * - Výběr honoty celkové hranice.
             * @param selectedValue - Nová hodnota celkové hranice.
             */
            selectQueryValue(selectedValue: IWidgetState['selectedValue']): void;
        }

        interface ISearchButton extends Pick<IWidgetState, "selectedQuery" | "selectedValue"> {
            /** - Reference tabulky. */
            tableRef: React.MutableRefObject<__esri.FeatureTable>;
        }

        interface IPasportButton extends Pick<IWidgetState, "selectedQuery"> {
            /** - Reference tabulky. */
            tableRef: React.MutableRefObject<__esri.FeatureTable>;
        }

        interface IPasport {
            /** - Vybraný prvkek v tabulce. */
            selectedFeature: __esri.Graphic;
            /** - Pole {@link selectedFeature vybraného prvku}. */
            fields: __esri.FeatureLayer['fields'];
            /** - Prvky s údaji o výměrách. */
            sumFeatureSet: __esri.FeatureSet;
            /** - Prvky pro výpis realizačních smluv. */
            contracts: IPasportizaceQueryTableResult['GetPasportizaceQueryTableResult'];
            /** - Prvky pro rozklad realizačních smluv na technické jednotky. */
            technicalUnits: IPasportizaceQueryTableResult['GetPasportizaceQueryTableResult'];
        }

        //#endregion END - Props

        //#region - Konfigurace
        /** - Konfigurace widgetu. */
        interface IConfig extends ConfigExtensions.IRequiredRoles {
            /** - Barva zvýraznění geometrie. */
            highlightColor: string;
            /** - Konfigurace dotazů. */
            queries: Array<IQuery>;
            /**
             * - URL služby pro provedení dotazu.
             * @example "https://sdagsdase106.hsi.lan/server/rest/services/SD_funkce2/MapServer/dynamicLayer/query"
             */
            searchUrl: string;
            /**
             * - WorkspaceId, které se odešle při {@link searchUrl dotazu}.
             * @example "sdagsddb03"
             */
            workspaceId: string;
            /** - Označení prvku SPP ve {@link sumClassName třídě prvků pro získání údajů o výměrách v hektarech}. */
            sumSppAttribute: string;
            /** - Třída prvků do které se ptáme pro získání údajů o výměrách v hektarech. */
            sumClassName: string;
            /** - Pole v {@link sumClassName třídě prvků pro získání údajů o výměrách v hektarech}, s druhem plochy. */
            sumKindAttribute: string;
            /**
             * - URL služby pro získání pasportizace.
             * @example "https://sdagsdase106.hsi.lan/SdWebService/SdService.svc/rest/GetPasportizaceQueryTable"
             */
            pasportizaceQueryUrl: string;
        };

        interface IQuery {
            dataSet: string;
            alias: string;
            domainAttribute: string;
            pasportAttributes: Array<string>;
            sppAttribute: string;
        }

        /** - Konfigurace widgetu. */
        type IMConfig = import("jimu-core").ImmutableObject<IConfig>;
        //#endregion END - Konfigurace

        interface IPasportizaceQueryTableResult {
            GetPasportizaceQueryTableResult: {
                Columns: Array<IPasportizaceColumn>;
                Rows: Array<IPasportizaceRow>;
            }
        }
        
        interface IPasportizaceRow {
            ItemArray: Array<string | number>;
        }

        interface IPasportizaceColumn {
            DataTypeName: "System.Decimal" | "System.Double" | "System.String" | "System.Int32" | "System.Int16" | "System.DateTime";
            Name: string;
        }

        //#region - State
        interface IWidgetState {
            /** - Vybraný dotaz. */
            selectedQuery: string;
            /**
             * - Vybraná hodnota {@link selectedQuery dotazu}.
             * - Celková hranice.
             */
            selectedValue: number | string;
        }

        type IStateParamsChange = IStateChangeSelectQueryValue | IStateChangeSelectQuery;

        interface IStateChangeSelectQueryValue extends IStateChangeBase<import("./src/runtime/enums/EStateChange").EStateChange.selectQueryValue>, Pick<IWidgetState, "selectedValue"> {
        }

        interface IStateChangeSelectQuery extends IStateChangeBase<import("./src/runtime/enums/EStateChange").EStateChange.selectQuery>, Pick<IWidgetState, "selectedQuery"> {
        }

        interface IStateChangeBase<T extends import("./src/runtime/enums/EStateChange").EStateChange> {
            /** - Typ změny state. */
            type: T;
        }
        //#endregion END - State
    }
}