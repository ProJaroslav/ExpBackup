declare namespace HSI {
    namespace SelectionResultWidget {
        interface IExpandParams extends Pick<ITreeState, "id" | "gisId"> {
            /**
             * - Identifikátor zobrazení nadřazeného objektu.
             * @see {@link ITreeState.id}
             */
            parentId?: string;
        };

        type IFeatureItemProps = IRelationFeatureItemProps | IFeatureItemPropsBase<false>;

        interface IFeatureItemPropsBase<T extends boolean> extends ITreeItemCommonProps {
            /** - Prvek který touto komponentou zobrazujeme. */
            feature: __esri.Graphic;
            /** - Typ geometrie prvku. */
            geometryType: HSI.IGeometryType
            /** - Hlavní atrubut prvku. */
            displayField: string;
            /** - Stav zobrazení prvku ve stromové struktuře. */
            objectState: ITreeState;
            /**
             * - True pokud prvek pochází z relační třídy.
             * - False pokud prvek pochází z výběru.
             */
            isRelation?: T;
        };

        interface IRelationFeatureItemProps extends IFeatureItemPropsBase<true> {
            /** - Jednoznačný technologický identifikátor relační třídy ze které byl {@link feature prvek} načten. */
            relationshipClassId: string;
        }

        interface IField {
            /** - Sloupec pro zobrazení v tabulce. */
            field: __esri.Field;
            /**
             * - Je sloupec {@link field} editovatelný?
             * - Tato informace pochází z konfigurace.
             */
            editable: boolean;
            /**
             * - Je sloupec {@link field} povinný?
             * - Tato informace pochází z konfigurace.
             */
            required: boolean;
        };

        interface IGetReachableRelationshipsResponse {
            /** - Předaný identifikátor podvrstvy. */
            layer: HSI.ISublayerDefinition | HSI.ITableDefinition;
            /** - Nalezené relační třídy. */
            relationships: Array<IRelationship>;
        }

        /** - Slovník načtených relačních tříd uložených pod gisId prvku. */
        interface ILoadedRelationClasses {
            [featureGisId: string]: ILoadedRelationClass | IErrorRelationClass | IRelationClassState<import("widgets/shared-code/enums").ELoadStatus.Pending>;
        };

        interface IRelationClassState<T extends import("widgets/shared-code/enums").ELoadStatus> {
            /** - Stav načtění dotazu. */
            state: T;
        }

        interface ILoadedRelationClass extends IRelationClassState<import("widgets/shared-code/enums").ELoadStatus.Loaded> {
            /** - Relační třídy. */
            result: Array<IRelationship>;
        }

        interface IErrorRelationClass extends IRelationClassState<import("widgets/shared-code/enums").ELoadStatus.Error>, Pick<ILoadedRelationClass, "result"> {
            /** - Chybová hláška. */
            errorMessage: string;
        }

        /**
         * - Slovník navazbených prvků uložených pod identifikátorem dotazu.
         * - Identifikátor dotazu je složen z gisId prvku a id relace.
         */
        interface ILoadedRelationObjects {
            [relationId: string]: {
                /** - Stav načtění dotazu. */
                state: import("widgets/shared-code/enums").ELoadStatus;
                /** - Navazbené prvky. */
                result?: __esri.FeatureSet;
            };
        };

        type IRelationship = HSI.RelationHelper.IGetReachableRelationshipsResponse<false>['relationships'][number] & {
            /** - Druh prvku - grafický / negrafický (z tabulky). */
            featureType: EFeatureType;
        };

        type ICommonProperties = {
            /**
             * - Unikátní identifikátor zobrazení objektu.
             * @see {@link ITreeState.id}
             */
            id: string;
            /** - Typ geometrie prvků. */
            geometryType: HSI.IGeometryType;
        };
        
        /** - Zvolené objekty ve stromové struktuře výsledků výběru. */
        type ISelectedFeatures = (ICommonProperties & (
            {
                /** - Druh zvoleného objektu. */
                type: import("./src/runtime/enums/ESelectedFeaturesType").ESelectedFeaturesType.Feature | import("./src/runtime/enums/ESelectedFeaturesType").ESelectedFeaturesType.RelationFeature;
                /** - Zvolený prvek. */
                features: [__esri.Graphic];
            } | {
                /** - Druh zvoleného objektu. */
                type: import("./src/runtime/enums/ESelectedFeaturesType").ESelectedFeaturesType.Layer;
                /** - Zvolené prvky. */
                features: Array<__esri.Graphic>;
            } | {
                /** - Druh zvoleného objektu. */
                type: import("./src/runtime/enums/ESelectedFeaturesType").ESelectedFeaturesType.RelationClass;
                /** - Navazbené prvky.*/
                features: Array<__esri.Graphic>;
            }
        ) | (
            Omit<ICommonProperties, "geometryType"> & (
                {
                    /** - Druh zvoleného objektu. */
                    type: import("./src/runtime/enums/ESelectedFeaturesType").ESelectedFeaturesType.TableFeature | import("./src/runtime/enums/ESelectedFeaturesType").ESelectedFeaturesType.RelationTableFeature;
                    /** - Zvolený prvek. */
                    features: [__esri.Graphic];
                } | {
                    /** - Druh zvoleného objektu. */
                    type: import("./src/runtime/enums/ESelectedFeaturesType").ESelectedFeaturesType.Table;
                    /** - Zvolené prvky. */
                    features: Array<__esri.Graphic>;
                }      
            )
        ) | {
            /** - Druh zvoleného objektu. */
            type: import("./src/runtime/enums/ESelectedFeaturesType").ESelectedFeaturesType.Empty;
        });

        /** - Vlastnosti komponenty pro zobrazení negrafického prvku ve stromové struktuře. */
        type ITableFeatureItemProps = ITableRelationFeatureItemPropsBase | ITableFeatureItemPropsBase<false>;

        interface ITableFeatureItemPropsBase<T extends boolean> extends ITreeItemCommonProps {
            /** - Negrafický prvek. */
            feature: __esri.Graphic;
            /** - Hlavní atrubut prvku. */
            displayField: string;
            /** - Stav zobrazení prvku ve stromové struktuře. */
            objectState: ITreeState;
            /**
             * - True pokud prvek pochází z relační třídy.
             * - False pokud prvek pochází z výběru.
             */
            isRelation?: T;
        };

        interface ITableRelationFeatureItemPropsBase extends ITableFeatureItemPropsBase<true> {
            /** - Jednoznačný technologický identifikátor relační třídy ze které byl {@link feature prvek} načten. */
            relationshipClassId: string;
        }

        interface ITreeItemCommonProps {
            /** - Označení zobrazení objektu. */
            onSelect: (item: ISelectedFeatures) => void;
            /**
             * - Id vybraného zobrazení objektu.
             * @see {@link ITreeState.id}
             */
            selectedId: string;
            /** - Přepnutí hodnoty {@link ITreeState.expanded}. */
            toggleExpand: (params: IExpandParams) => void;
            /** - Level ve kterém se objekt nachází. */
            level: number;
            /**
             * - Id nadřazeného objektu, které se použije pro zajištění unikátnosti id tohoto objektu.
             * @see {@link ITreeState.id}
             */
            parentId: string;
            /** - Načtení relačních tříd. */
            loadRelationClasses: (feature: __esri.Graphic) => void;
            /** - Načtení navazbených prvků. */
            loadRelationObjects: (feature: __esri.Graphic, relationshipClassId: string) => void;
            /** - Slovník načtených relačních tříd uložených pod gisId prvku. */
            loadedRelationClasses: ILoadedRelationClasses;
            /**
             * - Slovník navazbených prvků uložených pod identifikátorem dotazu.
             * - Identifikátor dotazu je složen z gisId prvku a id relace.
             */
            loadedRelationObjects: ILoadedRelationObjects;
        };

        /** - Stav zobrazení objektu ve stromové struktuře. */
        interface ITreeState {
            /** - Má ve stomové struktuře otevřé potomky? */
            expanded: boolean;
            /** - Unikátní identifikátor prvku/vrstvy/relační třídy. */
            gisId: string;
            /**
             * - Unikátní identifikátor zobrazení objektu ve stromové struktuře.
             * - Jeden prvek / relační třída zobrazujicí se vícekrát ve stromové struktuře, bude mít pro každé zobrazení unikátní id.
             */
            id: string;
            /**
             * - Stavy zobrazení potomků ve stromové struktuře.
             * - Stavy jsou uložené pod jejich GisId;
             */
            children: {
                [gisId: string]: ITreeState;
            };
        };

        //#region - Konfigurace
        /** - Konfigurace widgetu. */
        interface IConfig extends ConfigExtensions.IForbidPopupFormat {
            /** - Chceme zobrazit záložku s kresbou?. */
            displayGeometryTab: boolean;
            /** - Chceme mít možnost editovat kresbu ze záložky s atributy?. */
            editGeometryFromAttributeTab: boolean;
            /** - Chceme aby po odebrání prvku z výběru zůstal stav viditelnosti jeho potomků ve stromové struktuře nezměněn? */
            keepTreeState: boolean;
            /** - Pokud true, tak se v editoru atributů pole typu "string" budou zobrazovat jako TextInput, v opačném případě se budou zobrazovat jako TextArea (Roztáhnutelné pole). */
            useTextInputs: boolean;
            /** - Chceme zakázat editovat prvky, nehledě na configuraci v DB registrech? */
            forbidEditing: boolean;
            /** - True, pokud nechceme, aby se při kliknutí na řádek vrstvy, rozbalil/sbalil seznam s potomky. */
            forbidExpandLayerOnRightClick: boolean;
            /** - Rozšíření klíče, pod kterým je v DB registrech uložena konfigurace editovatelnosti. */
            dbRegistryConfigKey: string;
            /**
             * - Povolit zjišťování naplnění relací?
             * - Pokud uživatel nemá nastaveno jinak (v DB registerch), tak se relační třídy zjišťují jednotlivě pro každý prvek a budou se zobrazovat pouze třídy s navazbenými prvky. 
             */
            filledRelationsOnly: boolean;
            /** - Chceme zobrazit relace po rozbalení vrstvy ve stromové struktuře?. */
            forbidEnableRelations: boolean,
            /** - Chceme zobrazit záložku s historií?. */
            forbidHistoryTab: boolean,
            /** Chceme zobrazit záložku s dokumenty? */
            forbidDocumentsTab: boolean,
            forbidActionLinks: boolean
        }

        /** - Konfigurace widgetu. */
        type IMConfig = import("jimu-core").ImmutableObject<IConfig>;
        //#endregion END - Konfigurace
    }
}