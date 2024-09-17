declare namespace HSI {
    namespace LocateCoordinateWidget {
        //#region - Konfigurace
        /** - Konfigurace widgetu. */
        interface IConfig extends HSI.ConfigExtensions.IRequiredRoles {
            /** - Zakázat převod na souřadnicový systém službou ČÚZK. */
            forbidTransformGeometryByCuzk: boolean
        };

        /** - Konfigurace widgetu. */
        type IMConfig = import("jimu-core").ImmutableObject<IConfig>;
        //#endregion END - Konfigurace
    }
}