declare namespace HSI {
    namespace EnvironmentSettingsWidget {
        /** - Props komponenty EnvironmentItem. */
        interface IEnvironmentItemProps {
            /** - Vyvolání aplikace prostředí. */
            onClick: React.MouseEventHandler<any>;
            /**
             * - Odstranění prostředí.
             * - Pokud funkce není definována, tak se nezobrazí tlačítko pro odstranění prostředí.
             */
            delete?: React.MouseEventHandler<any>;
            /** - Název prostředí. */
            label: string;
            disabled?: boolean;
        }

        /** - Props komponenty EnvironmentList. */
        interface IEnvironmentListProps {
            /** - Nadpis seznamu. */
            title: string;
            /** - Položky v seznamu prostředí. */
            items: Array<IEnvironmentWithDelete | IPredefinedEnvironment>;
            /**
             * - Aplikace prostředí.
             * @param environmentId - Id zvoleného prostředí.
             */
            apply(environmentId: string): void;
            /**
             * - Odstranění prostředí.
             * - Pokud funkce není definována, tak se nezobrazí tlačítko pro odstranění prostředí.
             * @param environmentId - Id prostředí, které chceme odstranit.
             */
            delete?(environmentId: string): void;
        }

        /** - Props komponenty SaveAsModal. */
        interface ISaveAsModalProps {
            /**
             * - Volá se při vytvoření nového prostředí.
             * @param environment - Nové prostředí.
             */
            onEnvironmetSaved(environment: IEnvironment): void;
            disabled?: boolean;
        }

        /** - Prostředí. */
        interface IEnvironment extends IPredefinedEnvironment {
            /**
             * - Vybíratelnost a viditelnost všech mapových služeb a jejich podvrstev v tomto prostředí.
             * - S jinými typy vrstev se prozatím nepočítá
             */
            layers: Array<ILayerEnvironmentSetting | ISublayerEnvironmentSetting>;
        }

        interface IEnvironmentWithDelete extends IEnvironment {
            /** - Probíhá odstraňování {@link id tohoto prostředí}? */
            deleting?: boolean;
        }

        /** - Vybíratelnost a viditelnost mapové služby v prostředí. */
        interface ILayerEnvironmentSetting extends HSI.ILayerDefinition {
            /** - Je vrstva viditelná? */
            visible: boolean;
        }

        /** - Vybíratelnost a viditelnost povrstvy v prostředí. */
        interface ISublayerEnvironmentSetting extends HSI.ISublayerDefinition {
            /** - Je podvrstva viditelná? */
            visible: boolean;
            /** - Je podvrstva vybíratelná? */
            selectable: boolean;
        }

        /** - Předdefinované prostředí. */
        interface IPredefinedEnvironment {
            /** - Rozsah zobrazení mapy. */
            extent: __esri.ExtentProperties;
            /** - Rozsah zobrazení mapy. */
            viewpoint?: __esri.ViewpointProperties;
            /** - Unikátní identifikátor prostředí. */
            id: string;
            /** - Název prostředí. */
            title: string;
        }

        /** - Konfigurace widgetu. */
        interface IConfig extends ConfigExtensions.IRequiredRoles {
            /** - Seznam předdefinovaných prostředí. */
            predefinedEnvironments: Array<IPredefinedEnvironment>;
            /** - Klíč pod kterým jsou uložená prostředí se kterými chceme pracovat. */
            appKey: string;
            /** - Název soubodu do kterého se zálohují prostředí. */
            fileName: string;
        };

        /** - Konfigurace widgetu. */
        type IMConfig = import("jimu-core").ImmutableObject<IConfig>;
    }
}