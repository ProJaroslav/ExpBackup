declare namespace HSI {
    namespace RentTableWidget {
        //#region - Props
        
        interface ISearchParams extends Pick<IStateLoaded, "katUzeFeatureSet" | "landTypeFeatureSet" | "renterFeatureSet"> {
            /** - Reference vyhledávacího tlačítka. */
            searchButtonRef: React.MutableRefObject<HTMLButtonElement>;
            /** - Reference tabulky s pronájmy pozemků. */
            tableRef: React.MutableRefObject<__esri.FeatureTable>
        }
        
        interface IRenterDetailButton {
            /** - Reference tabulky s pronájmy pozemků. */
            tableRef: React.MutableRefObject<__esri.FeatureTable>;
            /** - Reference okna pro editaci/vytvoření detailu nájemce. */
            renterModalRef: React.MutableRefObject<IRenterModalMethods>;
        }
        
        interface IRenterModal {
            /** - Reference tabulky s pronájmy pozemků. */
            tableRef: React.MutableRefObject<__esri.FeatureTable>;
        }
        
        interface IDeleteRentButton {
            /** - Reference tabulky s pronájmy pozemků. */
            tableRef: React.MutableRefObject<__esri.FeatureTable>;
        }
        
        interface IEditRenterButton {
            /** - Reference tabulky s pronájmy pozemků. */
            tableRef: React.MutableRefObject<__esri.FeatureTable>;
            /** - Reference okna pro editaci/vytvoření detailu nájemce. */
            renterModalRef: React.MutableRefObject<IRenterModalMethods>;
        }
        
        interface IEditRentButton {
            /** - Reference tabulky s pronájmy pozemků. */
            tableRef: React.MutableRefObject<__esri.FeatureTable>;
        }

        //#endregion END - Props

        interface IRenterModalMethods {
            /**
             * - Otevření okna pro editaci {@link oid nájemce}.
             * @param oid - Identifikátor nájemce.
             * @param onSave - Navolá se po úspěšné editaci. 
             */
            edit(oid: number, onSave?:() => void): void;
            /**
             * - Otevření okna pro vytvoření nájemce.
             * @param onSave - Navolá se po úspěšném vytvoření. 
             */
            create(onSave?:() => void): void;
        }

        //#region - Konfigurace
        /** - Konfigurace widgetu. */
        interface IConfig extends ConfigExtensions.IRequiredRoles, ConfigExtensions.IDynamicLayerExtension {
            /** - Barva zvýraznění geometrie. */
            highlightColor: string;
            /**
             * - Tabulka s daty pro druh pozemku.
             * @example "dnt.KN.DRUPOZ"
             */
            landTypeTable: string;
            /**
             * - Tabulka s daty pro katastrální území.
             * @example "dnt.KN.KATUZE"
             */
            katUzeTable: string;
            /**
             * - Tabulka s daty pro nájemce.
             * @example "dnt.sdedo.O_SD_NAJEMCE"
             */
            renterTable: string;
            /**
             * - Tabulka s daty pro pronájem pozemku.
             * @example "dnt.sdedo.O_SD_PRONAJPOZ"
             */
            rentTable: string;
            /**
             * - Tabulka s daty pro pozemek.
             * @example "dnt.SDEDO.KN_PAR_POL"
             */
            parcelTable: string;
        };

        /** - Konfigurace widgetu. */
        type IMConfig = import("jimu-core").ImmutableObject<IConfig>;
        //#endregion END - Konfigurace
     
        //#region - State

        type IWidgetState = IWidgetStateBase<import("widgets/shared-code/enums").ELoadStatus.Pending> | IStateLoaded | IStateError;

        interface IStateLoaded extends IWidgetStateBase<import("widgets/shared-code/enums").ELoadStatus.Loaded> {
            /** - Prvky katastrálního území. */
            katUzeFeatureSet: __esri.FeatureSet;
            /** - Prvky nájemců. */
            renterFeatureSet: __esri.FeatureSet;
            /** - Prvky druhů pozemků. */
            landTypeFeatureSet: __esri.FeatureSet;
        }

        interface IStateError extends IWidgetStateBase<import("widgets/shared-code/enums").ELoadStatus.Error> {
            /** - Odchycená výjimka. */
            errorMessage: string;
        }

        interface IWidgetStateBase<T extends import("widgets/shared-code/enums").ELoadStatus> {
            /** - Stav načtení prvků. */
            loadStatus: T;
        }

        //#endregion END - State
    }
}