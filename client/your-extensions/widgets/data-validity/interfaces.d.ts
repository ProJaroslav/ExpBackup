declare namespace HSI {
    namespace DataValidityWidget {
        //#region - State
        type IState = IStateEditing | IStateLoaded<false> | IStateValidityLoading<import("widgets/shared-code/enums").ELoadStatus.Pending | import("widgets/shared-code/enums").ELoadStatus.Error>;

        interface IStateValidityLoading<T extends import("widgets/shared-code/enums").ELoadStatus> {
            /** - Stav načtení platnosti dat. */
            validityState: T;
        }

        interface IStateLoaded<T extends boolean> extends IStateValidityLoading<import("widgets/shared-code/enums").ELoadStatus.Loaded>, Pick<HSI.SdWebService.IGetUserNameWithRoles, "UserRoles"> {
            /** - Platnosti dat. */
            dataValidity: [IDataValidity, IDataValidity];
            /** - Probíhá editace platnosti dat? */
            isEditing: T;
        }

        interface IStateEditing extends IStateLoaded<true> {
            /** - Editované hodnoty platnosti dat. */
            editValues: IStateLoaded<true>['dataValidity'];
            /** - Probíhá ukládání změn v platnosti dat? */
            isSaving: boolean;
        }

        //#endregion END - State

        interface IDataValidity {
            /**
             * - PLatnost dat {@link Dul dolu}.
             * @example "\/Date(1575414000000+0100)\/"
             */
            Aktualnost: string;
            /** - Kód dolu. */
            Dul: "DNT" | "DB";
        }

        //#region - Konfigurace
        /** - Konfigurace widgetu. */
        interface IConfig extends ConfigExtensions.IRequiredRoles {
            /**
             * - URL pro získání platnosti dat.
             * @example "https://sdagsdase106.hsi.lan/SdWebService/SdService.svc/rest/GetDataValidity"
             */
            getDataValidityUrl: string;
            /**
             * - URL pro nastavení platnosti dat.
             * @example "https://sdagsdase106.hsi.lan/SdWebService/SdService.svc/rest/SetDataValidity"
             */
            setDataValidityUrl: string;
            /** - Barva textu. */
            textColor: string;
            /** - Role potřebné pro nastavení platnosti dat. */
            editRoles: Array<string>;
        };

        /** - Konfigurace widgetu. */
        type IMConfig = import("jimu-core").ImmutableObject<IConfig>; 
        //#endregion END - Konfigurace
    }
}