declare namespace HSI {
    namespace EnvironmentProcessorWidget {
        //#region - Konfigurace
        interface IEnvironment {
            /**
             * - Název sprostředí.
             * - Většinou se používá název webové mapy.
             */
            label: string;
            /** - Názvy widgetů. které v {@link name tomto prostředí} nemají být dostupné. */
            hiddenWidgets: Array<string>;
            /** - Měřítka v {@link name tomto prostředí}. */
            scales: Array<IEnvironmentScale>;
        };
            
        interface IEnvironmentScale extends Pick<IScale, "id"> {
            // /** - Názvy widgetů, které v {@link id tomto měřítku} nemají být dostupné. */
            // hiddenWidgets?: Array<string>;
            /** - ID webové mapy na portálu. */
            itemId: string;
        }

        interface IScale {
            /** - Unikátní ID meřítka. */
            id: string;
            /** - Název měřítka. */
            label: string;
        }

        /** - Konfigurace widgetu. */
        interface IConfig {
            /** - Prostředí do kterých se lze přepnout. */
            environments: Array<IEnvironment>;
            /** - Má se při změně dataSource mapového widgetu ověřit dostupnost webomé mapy? */
            validateEnvironment: boolean;
            /** - Mají se ve výchozím prostředí (v URL není parametr pro změnu) schovávat widgety podle {@link environments konfigurace}? */
            processDefaultEnvironment: boolean;
            /** - Má při změně prostředí zůstat zachovaný rozsah zobrazení mapy? */
            preserveExtent: boolean;
            /** - Použitelná měřítka. */
            scales: Array<IScale>;
        };

        /** - Konfigurace widgetu. */
        type IMConfig = import("jimu-core").ImmutableObject<IConfig>; 
        //#endregion END - Konfigurace
    
        //#region - Settings
        interface ISettingSubcomponentProps {
            widgetName: string;
            /**
             * - Funce pro změnu konfigurace.
             * @param key - Klíč {@link value hodnoty kterou měníme}.
             * @param value - Nová hodnota.
             */
            updateConfig<T extends keyof IConfig>(key: T, value: IConfig[T] | IMConfig[T]): void;
            /** - Konfigurace widgetu. */
            config: IMConfig;
        }
        //#endregion END - Settings
    }
}