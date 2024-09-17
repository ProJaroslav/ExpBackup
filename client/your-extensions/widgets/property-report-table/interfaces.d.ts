declare namespace HSI {
    namespace PropertyReportTableWidget {
        //#region - Props
        interface IEditButtonProps {
            /** - Reference tabulky. */
            tableRef: React.MutableRefObject<__esri.FeatureTable>;
        }

        interface IAddToSelectionButtonProps {
            /** - Reference tabulky. */
            tableRef: React.MutableRefObject<__esri.FeatureTable>;
        }

        interface IDifferenceButtonProps {
            /** - Funkce poskytuje where klauzuly na základě zadaných parametrů. */
            getWhereClause(): string;
        }

        interface IEditTableProps extends Pick<FeatureTableComponent.IFeatureTable, "onCreated" | "tableRef"> {
        }
        //#endregion END - Props

        //#region - Konfigurace
        /** - Konfigurace widgetu. */
        interface IConfig extends ConfigExtensions.IRequiredRoles, ConfigExtensions.IDynamicLayerExtension {
            /** - Barva zvýraznění geometrie. */
            highlightColor: string;
            /**
             * - Tabulka s prvky sestavy majetku.
             * @example "dnt.sdedo.V_SPRAVA_MAJEKTU_SESTAVA"
             */
            reportTable: string;
            /**
             * - Tabulka s prvky rozdílové sestavy.
             * @example "dnt.sdedo.V_SPRAVA_MAJEKTU_ROZDIL"
             */
            differenceTable: string;
            /**
             * - Pole v {@link sapTable tabulce} s doménou SAP prvků.
             * @example "SAP_ORGANIZACE"
             */
            sapField: string;
            /**
             * - Tabulka obsahující {@link reportTable pole s doménou SAP prvků}.
             * @example "dnt.SDEDO.KOMUNIK_VOZOVKA"
             */
            sapTable: string;
        };

        /** - Konfigurace widgetu. */
        type IMConfig = import("jimu-core").ImmutableObject<IConfig>;
        //#endregion END - Konfigurace

    }
}