declare namespace HSI {
    namespace PopUpWidget {
        /** - Konfigurace widgetu. */
        interface IConfig {
            /** - Chceme aby bylo lačítho pro přepínání viditelnosti pop-upu neviditelné?. */
            hideButton: boolean;
            /** - Specifikace klíčů pod kterými jsou v databázovém registru uložena nastavení pro tento widget. */
            dbRegistryConfigKeyExtension?: string;
            hideGenerateUrlButton: boolean;
        }

        /** - Přizpůsobený field, který obsahuje také přiřazenou akci. */
        interface IPopUpCustomizedField {
            field: __esri.IField; 
            action: DbRegistry.IFromDataAction | null;
        }

        /** - Konfigurace widgetu. */
        type IMConfig = import("jimu-core").ImmutableObject<IConfig>; 
        //#endregion END - Konfigurace
    }
}