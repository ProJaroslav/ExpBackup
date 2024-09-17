declare namespace HSI_OLD {

    //#region - Interfaces
    
    //#region - Strict types

    //#endregion

    //#region - Namespaces 

    //#region - Components


    namespace WidgetWrapper {
        
        type IOptionProps = {
            /**
             * - Zpráva zobrazujicí se pokud není zvolený widget poskytujicí JimuMapView.
             * - Pokud není zvoleno, tak se použije překlad pod klíčem '_missingMap', popřípadě výchozí text.
             */
            noUseMapWidgetIdsMessage?: string | JSX.Element;
            /**
             * - Používá widget Popper (kontextová nabídka)?
             * - Pokud 'true' componenta předává funkci pro vyvolání popperu všem potomkům pomocí {@link PopperContext}.
             */
            usePopper?: boolean;
            /**
             * - Používá widget soubory uložené ve složce 'assets'?
             * - Pokud 'true' componenta předává funkci pro poskytnutí cesty k souboru všem potomkům pomocí {@link AssetsProviderContext}.
             */
            hasAssets?: boolean;
            /** - True pokud chceme aby componenta předala konfiguraci potomkům pomocí {@link ConfigContext}. */
            provideConfiguration?: boolean;
            /** - Chceme potomky obalit komponnetou {@link Suspense}? */
            lazy?: boolean;
            /**
             * - True pokud widget používá notifikace.
             * - Pokud 'true' musí se v manifest.json přidat cesta k {@link NotificationStore}.
             * - @see {@link https://developers.arcgis.com/experience-builder/guide/extension-points/}
             */
            useNotification?: boolean;
        } & (
            (IExtraPropsUrlParser<false> & Required<IExtraPropsIgnoreJimuMapView<true>>) | (IExtraPropsUrlParser<true> & IExtraPropsIgnoreJimuMapView<false>)
        );
            
        interface IExtraPropsIgnoreJimuMapView<T extends boolean> {
            /**
             * - True pokud widget nemá JimuMapView (žádným způsobem napracuje s mapou).
             * - Pokud 'false', componenta nevykreslí obsah widgetu jestliže není načteno JimuMapView.
             * - Pokud 'false', componenta předává JimuMapView všem potomkům pomocí {@link JimuMapViewContext}.
             */
            ignoreJimuMapView?: T;
            
        };
        
        interface IExtraPropsUrlParser<T extends boolean> {
            /**
             * - True pokud widget při načtení aplikace má přečíst url parametry, a podle nich vyvolat požadované akce (přidání do výběru, nastavení extentu, atd.).
             * - Akci vyvolá pouze první načtený widget, který má zaplou tuto funkcionalitu.
             * - Pokud 'true' musí se v manifest.json přidat cesty k {@link SelectionStore}, {@link NotificationStore} a {@link FirstRenderHandlerStore}, a parametr {@link IExtraProps.ignoreJimuMapView} nesmí být roven 'true'.
             * - @see {@link https://developers.arcgis.com/experience-builder/guide/extension-points/}
             */
            urlParser?: T;
        
        };
        
        interface INotificationPropsExtension {
            /** - Id widgetu, který zobrazuje notifikace. */
            notificationWidgetId: string;
        }
        
        interface IUrlParserPropsExtension extends Pick<import("jimu-core").IMState, "queryObject" | "appConfig" | "hsiFirstRenderHandler"> {};
        
        type IProps<T extends any = {}> = import("jimu-core").AllWidgetProps<T>;
        
        type IPropsExtension =  Partial<INotificationPropsExtension & IUrlParserPropsExtension>;
        
        type IExtendedProps<T = {}> = IProps<T> & IPropsExtension & IOptionProps;
    }

    //#endregion
    
    //#region - Widgets
    namespace TableOfContentsWidget {
        interface IConfig {
            /** - Klíč pod kterým je v konfiguraci v databázovém registru uloženo nastavení pro tento widget. */
            [EConstants.tocSettingKey]: string;
        };
        
        type IMConfig = import("jimu-core").ImmutableObject<IConfig>;
    }

    namespace SearchWidget {
        interface IConfig {
            /** - Má se zamezit notofikování uživatele, pokud došlo k omezení výsledků v nápovědě? */
            suppressExceededTransferMessage: boolean;
            /** - Májí se vrstvy ve kterých lze vyhledávat vyfiltrovat podle obsahu (konfigurace) widgetu TableOfContents? */
            filterByToc: boolean;
            [EConstants.selectionSettingKey]: string;
            [EConstants.searchConfigurationKey]: string;
        };
        
        type IMConfig = import("jimu-core").ImmutableObject<IConfig>;
    }

    namespace UserSettingsWidget {
        interface IConfig {
            /** - Klíč pod kterým je v konfiguraci v databázovém registru uloženo nastavení pro tento widget. */
            dbRegistryConfigKey: string;
        };
        
        type IMConfig = import("jimu-core").ImmutableObject<IConfig>;
    }

    namespace DisplayWidgetMetadataWidget {
        interface IConfig {};
     
        type IMConfig = import("jimu-core").ImmutableObject<IConfig>;
    }

    namespace RoomBookingWidget {
        interface IConfig {};
     
        type IMConfig = import("jimu-core").ImmutableObject<IConfig>;
    }

    namespace SelectionResultWidget {
        interface IConfig extends IForbidPopupFormat {
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
            /** - Rozšíření klíče, pod kterým je v DB registrech uložena {@link IEditabilityConfiguration konfigurace editovatelnosti}. */
            dbRegistryConfigKey: string;
            /**
             * - Povolit zjišťování naplnění relací?
             * - Pokud uživatel nemá nastaveno jinak (v DB registerch), tak se relační třídy zjišťují jednotlivě pro každý prvek a budou se zobrazovat pouze třídy s navazbenými prvky. 
             */
            filledRelationsOnly: boolean;
        };
     
        type IMConfig = import("jimu-core").ImmutableObject<IConfig>;

        /** - Props komponenty pro hromadné zobrazení společných hodnot atributů prvků a jejich editace. */
        interface IMassAttributeTableProps {
            /**
             * - Prvky jejichž atributy chceme zobrazit/editovat.
             * - Všechny prvky musejí pocházet ze stejné vrstvy.
             */
            features: Array<__esri.Graphic>;
            /** - Jedná se o negrafický prvek? */
            tableFeature?: boolean;
        };

        interface IMassAttributeTableLoadedProps extends IMassAttributeTableProps {
            /** - Pomocný prvek obsahujicí společné atributy {@link features prvků ve výběru}. */
            featureCopy: __esri.Graphic;
        };

        /** - Sloupec rozšířený o informaci zda je editovatelný. */
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
    }

    namespace SelectionWidget {
        interface IConfig {
            /** - Zobrazit tlačítko pro zachování aktivity nástroje pro výběr? */
            selectLockButton: boolean;
            /** - Možnost zadání obalové zóny. */
            buffer: boolean;
            /** - Možnost převzít geometrii všech prvků ve výběru. */
            copyAllGeometry: boolean;
            /** - Má se při zavření widgetu aktualizovat stav výběru na výchozí hodnoty? */
            defaultSettingOnClose: boolean;
        };

        type IMConfig = import("jimu-core").ImmutableObject<IConfig>;
    }
    //#endregion

    //#endregion
};

declare namespace HSI {
    type IWidgetBodyProps = import("react").PropsWithChildren<{
        /** - Název widgetu. */
        widgetName: string;
        /** - Obsah zápatí widgetu. */
        footer?: React.ReactNode;
        /** - Třída. */
        className?: string;
        /** - Má se místo {@link children obsahu widgetu} zobrazit načítání? */
        loading?: boolean;
    }>;

    /** - Typy geometrie v objektu {@link __esri.FeatureSet}. */
    type IGeometryType = __esri.FeatureSet['geometryType'];

    /** - Stav pro widgety provádějicí grafický výběr. */
    interface IGraphicSelectionState {
        /** - Vybraný způsob volby vrstev ve kterých se bude prováďet výběr. */
        activeSelectInOption: import("./enums/ESelectInOption").ESelectInOption;
        /**
         * - Objekt se všemi vrstvami ve kterých lze provést výběr (všechny podvrstvy typu "Feature Layer").
         * - Podvrstvy mají v objektu jako klíč jejich GisId (unikátní identifikátor složený z jeich id a z id jejich mapové služby).
         */
        layerDictionary: { [gisId: string]: __esri.Sublayer };
        /** 
         * - Vrstva ve které se provádí výběr.
         * - Relevantní pouze pokud je {@link activeSelectInOption} rovno {@link ESelectInOption.Layer}.
         */
        selectedLayerId: string;
        /** - Stav načítání vrstev v mapě. */
        loadingStatus: import("./enums/ELoadStatus").ELoadStatus;
        /**
         * - Typ geometrie podle které se prování výběr.
         * - Relevantní pouze pokud je {@link activeGeometrySelect} rovno {@link EGeometrySelect.Create}.
         */
        activeGeometryType: import("./enums/EGeometryType").EGeometryType;
        /** - Způsob získaní geometrie podle které se provádí výběr. */
        activeGeometrySelect: import("./enums/EGeometrySelect").EGeometrySelect;
        /** - Vybraná aplikace výběru. */
        selectionType: import("./enums/ESelectionType").ESelectionType;
        /** - Vybraný prostorový operátor. */
        selectionOperator: import("./enums/ESpatialRelation").ESpatialRelation;
        /** - Informace zda je nástroj pro grafický výběr aktivní. */
        isSelecting: boolean;
        /** - Informace zda jsou splněny podmínky pro zahájení výběru. */
        canSelect: boolean;
        /**
         * - Prvek podle jehož geometrie se provádí výběr.
         * - Relevantní pouze pokud je {@link activeGeometrySelect} rovno {@link EGeometrySelect.Copy}.
         */
        selectedFeature: __esri.Graphic;
        /**
         * - Velikost obalové zóny (v metrech), která se přidá k omezujicí geometrii, při výběru podle geometrie prvků z výběru.
         * - Relevantní pouze pokud je {@link activeGeometrySelect} rovno {@link EGeometrySelect.Copy} nebo {@link EGeometrySelect.CopyAll}.
         */
        bufferSize: number;
        /** - Stav vykreslení geometrie bufferu do mapy. */
        drowBufferStatus: import("./enums/ELoadStatus").ELoadStatus;
        /** - Má po ukončení výběru zůstat nástroj pro grafický výběr aktivní ({@link isSelecting}=true)? */
        keepActive: boolean;
    };

    /** - Stav výběru. */
    interface ISelectionSetState {
        /** - Probíhá v nějaké podvrstvě výběr? */
        isPending: boolean;
        /** - Výběry podvrstev uložené pod GisId podvrstvy. */
        selection: {
            [layerGisId: string]: IFeatureSetState;
        };
        /** - Výběry negrafických vrstev (tabulek) uložené pod Id vrstvy. */
        tableSelection: {
            [layerId: string]: IFeatureSetState;
        };
        /** - Kolekce GisId podvrstev se zaplou vybíratelností. */
        selectableLayers: Array<string>;
    };

    /** - Stav výběru jedné vrstvy. */
    interface IFeatureSetState {
        /** - Identifikátor pod kterým je ve 'MutableStoreManager' uložena skupina vybraných prvků. */
        featureSetId?: string;
        /** - Probíhá ve vrstvě výběr? */
        isPending: boolean;
    };
    
    /** - Identifikace posdvrstvy. */
    interface ISublayerDefinition extends ILayerDefinition {
        /* - Id podvrstvy. */
        layerId: number;
    };
    
    /** - Identifikace negrafické vrstvy (tabulka). */
    interface ITableDefinition extends ILayerDefinition {
        /* - Id tabulky. */
        layerId: number;
    };

    /** - Identifikace mapové služby. */
    interface ILayerDefinition {
        /* - Název mapy z mapové služby. */
        mapName: string;
        /* - Název mapové sluzby. */
        mapServiceName: string;
    };

    /** - Identifikace feature vrstvy. */
    interface IFeatureLayerDefinition {
        /** - URL adresa feature vrstvy. */
        url: string;
    };

    /** - Identifikace posdvrstvy WMS služby. */
    interface IWmsSublayerDefinition extends IWmsLayerDefinition {
        /* - Id podvrstvy. */
        layerId: number;
    };

    /** - Identifikace WMS služby. */
    interface IWmsLayerDefinition {
        /** - URL adresa WMS služby. */
        url: string;
    };

    /** - Identifikace vector-tile vrstvy. */
    interface IVectorTyleLayerDefinition {
        /**
         * - Název vrstvy.
         * - Čte se z URL vrstvy 'services/[{@link mapServiceName}]/VectorTileServer'
         */
        mapServiceName: string;
    };
    
    /** - Globální/Hromadná konfigurace napříč widgety. */
    interface IHsiSetting {
        /** - Určuje způsob načtení konfigurace pro widgety aplikace. */
        globalSettings: EGlobalSettings;
        /** - Základ klíčů v DB registrech, pod kterými jsou uložené hodnoty v databázovém registru. */
        bdRegistryKeyPrefix?: string;
        /**
         * - Má se přidat {@link ISelectUrlQuery.mapServiceName název mapové služby} do parametrů při geneování odkazu na prvek?
         * - V LetGIS jsou unikátní ID vrstev napříč mapovymí službami, tudíž je zbytečné službu definovat.
         * @todo Opravit název proměnné
         */
        tokenMapServiceName: boolean;
        /**
         * - Služba pro poskytnutí rolí uživatele.
         * - Používá se na SD.
         */
        permissionServiceUrl?: string;
        /** - Mají se "schovávat" widgety na základě rolí uživatele načtených pomocí {@link permissionServiceUrl}? */
        checkPermissions: boolean;
        /**
         * - Měnit DataSource mapového widgetu na základě URL parametrů?
         * - K aplikaci je potřeba mít v aplikaci widget environment-processor.
         * - Používá se na SD.
         */
        environmentProcessor: boolean;
        /**
         * - Názvy rozšíření mapových služeb.
         * - Např. názvy SOE, ty se mohou napříč projekty lišit.
         */
        serviceExtensions: Array<ISoeExtensions>;
        /**
         * - URI v SOE pro získání hodnoty z DB Registrů.
         * @example "GetValue"
         * @default "Settings/GetValue"
         */
        getDbRegistryValue: string;
        /**
         * - URI v SOE pro nastavení hodnoty do DB Registrů.
         * @example "SetValue"
         * @default "Settings/SetValue"
         */
        setDbRegistryValue: string;
    };

    interface ISoeExtensions {
        /**
         * - Klíč rozšíření.
         * @example "RelationSoe"
         */
        key: import("widgets/shared-code/enums").EKnownLayerExtension;
        /**
         * - Hodnota rozšíření.
         * @example "LetGisSoe"
         */
        value: string;
    }

    /** - Slovník interfaců konfigurací custom widgetů */
    interface IWidgetConfig<Immutable extends boolean = false> {
        TableOfContents: Immutable extends true ? TableOfContentsWidget.IMConfig : TableOfContentsWidget.IConfig;
        Search: Immutable extends true ? SearchWidget.IMConfig : SearchWidget.IConfig;
        UserSettings: Immutable extends true ? UserSettingsWidget.IMConfig : UserSettingsWidget.IConfig;
        SelectionResult: Immutable extends true ? SelectionResultWidget.IMConfig : SelectionResultWidget.IConfig;
        DisplayWidgetMetadata: Immutable extends true ? DisplayWidgetMetadataWidget.IMConfig : DisplayWidgetMetadataWidget.IConfig;
        RoomBooking: Immutable extends true ? RoomBookingWidget.IMConfig : RoomBookingWidget.IConfig;
        Selection: Immutable extends true ? SelectionWidget.IMConfig : SelectionWidget.IConfig;
        "environment-processor": Immutable extends true ? EnvironmentProcessorWidget.IMConfig : EnvironmentProcessorWidget.IConfig;
    };
    
    /** - Informace o rotaci symbologie bodového prvku. */
    interface IRotationInfo {
        /**  - Název atributu ve kterém je uložena rotace prvku. */
        rotationAttribute: string;
        /** - Typ rotece symbologie bodového prvku. */
        rotationType: __esri.RotationVariable["rotationType"];
        /** - Hodnota, která se musí k rotaci přičíst, aby natočení syblologie odpovídalo. */
        rotationDifference: number;
    };

    interface IGraphicSelectionOptions {
        /** - True pokud nechceme provádět výběr ve vrstvách s vyplou vybíratelností. */
        selectableOnly?: boolean;
        /** - True pokud nechceme provádět výběr ve vrstvách, které nejsou viditelné v současném měřítku. */
        vissibleOnly?: boolean;
        /** - Cheme vybrané prvky zobrazit v pop-upu? */
        showPopUp?: boolean;
        /** - Chceme do výběru přidat pouze prvky z nejvišší vrstvy v mapě, ve které se nějaké výsledky podařilo najít? */
        topOnly?: boolean;
    };

    interface IUseHsiSelection<T extends boolean = false> {
        /**
         * - JimuMapView ze kterého čteme výběr.
         * - Pokud není poskytnuto, předpokládá se, že JimuMapView je poskytnuto nadřazenou komponnetou pomocí JimuMapViewContext.
         */
        jimuMapView?: JimuMapView;
        /**
         * - True pokud chceme načíst vybrané prvky z "MutableStoreManager".
         * - False pokud chceme vrátit pouze identifikátory pod krerými jsou prvky uloženy.
         */
        populate?: T;
    };
    
    type IHsiSelection<T extends boolean = false> = T extends true ? IHsiPopulatedSelection : HSI.ISelectionSetState;
    
    interface IHsiPopulatedSelection extends Omit<HSI.ISelectionSetState, "selection"> {
        /** - Výběry grafických prvků uložené pod GisId podvrstvy. */
        selection: {
            [layerGisId: string]: Omit<HSI.IFeatureSetState, "featureSetId"> & {
                /** - Skupina vybraných prvků v této podvrstvě. */
                featureSet?: __esri.FeatureSet;
            };
        };
        /** - Výběry negrafických prvků uložené pod Id negrafické vrstvy (tabulky). */
        tableSelection: {
            [tableId: string]: Omit<HSI.IFeatureSetState, "featureSetId"> & {
                /** - Skupina vybraných prvků v této tabulce. */
                featureSet?: __esri.FeatureSet;
            };
        };
    };

    interface IHsiSelectionDictionary {
        [gisId: string]: __esri.Graphic;
    }

    interface IFeatureJson {
        attributes: {
            [key: string]: string | number;
        };
        geometry?: any;
    };

    interface IMapServiceSourceJson {
        /** - Název mapy v mapové službě. */
        mapName?: string;
        /** - Rozšíření služby (Např. zaplý FeatureAccess, SOE, atd.). */
        supportedExtensions?: string;
        /** - Tabulky ve službě. */
        tables?: Array<{
            id: number;
            name: string;
            type: "Table";
        }>;
    }

    //#region - TabChannel
    type ITabChannelEvent = ITabChannelActionEvent | ITabChannelResponseEvent;

    interface ITabChannelActionEvent {
        type: "action";
        params: ISelectUrlQuery;
    };

    interface ITabChannelResponseEvent {
        type: "action-response";
        success: boolean;
    };
    //#endregion END - TabChannel

    /** - Struktura odpovědi {@link https://ags.cuzk.cz/arcgis2/rest/services/dmr5g/ImageServer/identify funkce pro zjištění výšky terénu}. */
    interface IIdentifyResponse {
        objectId: number;
        name : "Pixel" | string;
        value: string;
        location: {
            x: number;
            y: number;
            spatialReference: {
                wkid: number;
                latestWkid: number;
                vcsWkid: number;
                latestVcsWkid: number;
            };
        };
        properties: {
            Values: Array<string>;
        };
        catalogItems: {
            objectIdFieldName: string;
            geometryType: string;
            spatialReference: {
                wkid: number;
                latestWkid: number;
                vcsWkid: number;
                latestVcsWkid: number;
            };
            features: Array<{ attributes: any; geometry: any; }>;
            catalogItemVisibilities: Array<number>;
        }
    };

    /** - Definice vrstvy, ve které se vyhledává geometrie pro negrafické prvky. */
    interface IGeometryProvider {
        /** - Identifikace negrafické vrstvy (tabulky). */
        table: ITableDefinition;
        /** - Identifikace pomocné vrstvy, ve které dojde k vyhledání geometrie pro negrafický prvek z tabulky {@link table}. */
        searchGeometryLayer: ISublayerDefinition;
        /** - Atributy, ve kterých jsou v nalezeném prvku hodnoty, podle kterých se v pomocné vrstvě {@link searchGeometryLayer} hledá geometrie. */
        tableAttribute: string | Array<string>;
        /** - Atributy, podle kterých se v pomocné vrstvě {@link searchGeometryLayer} hledá geometrie. */
        geometryProviderAttribute: string | Array<string>;
    };

    interface IPopperBaseParams<T extends boolean> {
        /** - Reference prvku nad kterým je Popper vyvolán. */
        reference: React.RefObject<HTMLElement> | HTMLElement;
        /** - Pozice Popperu. */
        position: {
            /** - Pixely zleva. */
            x: number;
            /** - Pixely shora. */
            y: number;
        };
        /** - Má se zobrazit načítání obsahu? */
        loading?: T;
    };

    /**
     * - Možné formáty zobrazení prvku.
     * - Formáty nepřepisovat!
     * - Je možné formát doplnit, ale potřeba to zohlednit ve funkci pro zobrazení prvku (FeatureHelper.displayFeature).
     */
    type DisplayFeatureFormats = "{diplayField} ({OID})" | "{diplayField}|{OID}" | "{layerTitle} - {diplayField} - {OID}" | "{layerTitle} - {diplayField}|{OID}";
    
    //#region - Popper
    /** - Parametry pro vyvolání Popperu. */
    type IPopperParams = IPopperLoadingParams | IPopperChildrenParams | IPopperListParams;
    
    interface IPopperLoadingParams extends Required<IPopperBaseParams<true>> {
    };
        
    interface IPopperChildrenParams extends IPopperBaseParams<false> {
        /** - Obsah Popperu. */
        children: JSX.Element;
    };
    
    interface IPopperListParams extends IPopperBaseParams<false> {
        /** - Řádky v kontextové nabídce. */
        list: Array<IPopperListItem>;
    };

    /** - Definice jednoho řádku v kontextové nabídce. */
    interface IPopperListItem {
        /** - Text na řádku. */
        content: string | JSX.Element;
        /** - Ikona. Idenálně SVG (pro měnění barev). */
        icon?: any;
        /** - Vnořené řádky. */
        children?: Array<IPopperListItem>;
        /** - Funkce, která se zavolá při kliknutí na řádek. */
        onClick?: () => void;
        /** - Má se při kliku na řádek zavřít kontextová nabídka? */
        closeOnClick?: boolean;
    };
    //#endregion END - Popper

    namespace LoadingState {
        type IState<T extends Object> = IStateBase<import("./enums/ELoadStatus").ELoadStatus.Loaded> & T | IStateError | IStateBase<import("./enums/ELoadStatus").ELoadStatus.Pending>;

        interface IStateBase<T extends import("./enums/ELoadStatus").ELoadStatus> {
            /** - Stav state. */
            loadStatus: T;
        }
        
        interface IStateError extends IStateBase<import("./enums/ELoadStatus").ELoadStatus.Error> {
            /** - Odchycená chyba při načítání state. */            
            errorMessage: string;
        }
    }

    namespace EditWindowComponent {
        interface IProps extends Pick<EditTableComponent.IProps, "failedToSaveMessage" | "loadMetadataErrorMessage" | "requiredValueMissing" | "saveSuccessMessage"> {
            /** - Funkce pro poskytnutí editovaného prvku a jeho polí. */
            dataProvider(): Promise<EditTableComponent.ILoadedState>;
            /**
             * - Funkce pro uložení prvku.
             * @param feature - Prvek, který chceme uložit.
             * @param fields - Pole {@link feature prvku}.
             */
            saveFeature(feature: __esri.Graphic, fields: Array<__esri.Field>): Promise<void>
            modalHeader?: string;
            saveButton?: string;
            cancelButton?: string;
            isOpen: boolean;
            close?(): void;
        }
    }

    namespace LinkFeatureModalComponent {
        interface ILinkFeatureModalMethods {
            /**
             * - Funkce otevírajicí dialog.
             * @param feature - Prvek na který vytváříme odkaz.
             */
            open(feature: __esri.Graphic): void;
        }
    }

    namespace EditTableComponent {
        interface IProps {
            loadMetadataErrorMessage?: string;
            failedToSaveMessage?: string;
            requiredValueMissing?: string;
            saveSuccessMessage?: string;
            setTableStateOpen(isOpen: boolean): void
        }

        interface IRef {
            /**
             * - Vyvolá {@link dataProvider načtení dat prvku}.
             * @param dataProvider - Funkce pro poskytnutí editovaného prvku a jeho polí.
             */
            load(dataProvider: () => Promise<ILoadedState>): void;
            /**
             * - Vyvolá {@link saveFeature uložení prvku}.
             * @param saveFeature - Funkce pro uložení prvku.
             */
            save(saveFeature: (feature: __esri.Graphic, fields: Array<__esri.Field>) => Promise<void>)
            /** - Vymazání state tabulky. */
            empty(): void;
        }

        interface ILoadedState {
            feature: __esri.Graphic;
            fields: Array<__esri.Field>;
        }

        type IState = LoadingState.IState<ILoadedState>;
    }

    namespace FeatureTableComponent {
        interface IDynamicDataTable extends IFeatureTable {
            /** - Třída prvků do které se provádí dotazy. */
            dataSourceName: string;
            /** - Nadpis tabulky. */
            title?: string;
            /**
             * - URL Feature služby pro provedení dotazu.
             * - Feature služba musí podporovat Dynamic Layers.
             * @example "https://sdagsdase106.hsi.lan/server/rest/services/SD_funkce2/MapServer/dynamicLayer/query"
             */
            serviceUrl: string;
            /** - WorkspaceId, které se odešle při dotazu. */
            workspaceId: string;
            /** - Volá se po přidání vrtvy do tabulky. */
            onLayerCreated?(): void;
        }

        interface IFeatureTable extends Partial<Pick<__esri.FeatureTable, "tableTemplate">> {
            displayColumnMenus?: boolean;
            /** - Reference tabulky. */
            tableRef: React.MutableRefObject<__esri.FeatureTable>;
            /** - Volá se po inicializaci tabulky. */
            onCreated?(): void;
            /**
             * - Rozšíření klíče pod kterým se ukládá nastavení tabulky (šířka, viditelnost a pořadí sloupců).
             * - Pokud není definováno, tak nastavení tabulky nepůjde uložit.
             */
            tableSettingExtension?: string;
        }

        interface IHideColumnsAction extends Pick<ITableAction, "style" | "table"> {
        }

        interface ITableAction {
            icon: string;
            style?: React.CSSProperties;
            table: __esri.FeatureTable;
        }

        interface IHighlightButton {
            /** - Reference tabulky. */
            tableRef: React.MutableRefObject<__esri.FeatureTable>;
            /** - Barva zvýraznění geometrie. */
            highlightColor: string;
            /** - Poskytuje prvky vybrané v tabulce. */
            fetureProvider?(): Promise<Array<__esri.Graphic>>;
        }

        interface IAddToSelectionButton {
            /** - Reference tabulky. */
            tableRef: React.MutableRefObject<__esri.FeatureTable>;
            /** - Podvrtvy ve kterých se provede výběr. */
            sublayerProvider(): Promise<Array<__esri.Sublayer>>;
        }

        interface ISdEditButton extends Pick<ISdCruButton, "provideLayer" | "sourceClass"> {
            /**
             * - Poskytuje OID vybraného prvku.
             * - Důvod funkce je ten, že u pohledů nemusí OID v {@link table tabulce} odpovídat skutečnému OID prvku. 
             * @param table - Tabulka ve které je prvek vybrán.
             * @param layer - Zdrojová vrstva prvku.
             */
            oidProvider(table: __esri.FeatureTable, layer: __esri.FeatureLayer): Promise<number>;
            /**
             * - Reference tabulky.
             * - Editace bude povolena pouze pokud bude vybrán jeden prvek v tabulce
             */
            tableRef: React.MutableRefObject<__esri.FeatureTable>;
            /**
             * - Funkce se volá po úspěšné editaci {@link oid prvku}
             * @param feature - Zeditovaný prvek.
             */
            onEdited?(feature: __esri.Graphic): void;
        }

        interface ISdCruButton extends Pick<IEditButton, "disabled"> {
            /** - Název zdrojové tabulky {@link oid editovaného prvku}. */
            sourceClass: string;
            /** - Poskytuje vrstvu se zdrojem {@link sourceClass tabulky}. */
            provideLayer(): Promise<__esri.FeatureLayer>;
            /**
             * - Poskytuje editovaný prvek.
             * @param layer - Zdrojová vrstva.
             * @param outFields - Požadovaná pole.
             */
            featureProvider(layer: __esri.FeatureLayer, outFields: Array<string>): Promise<EditTableComponent.ILoadedState>;
            /**
             * - Uložení {@link feature prvku}.
             * @param feature - Prvek, který ukládáme.
             * @param attributes - Nové hodnoty {@link feature prvku} převedené do formátu so SdSoe.
             */
            saveFeature(feature: __esri.Graphic, attributes: IFeatureJson['attributes']): Promise<void>;
        }

        interface IEditButton extends Pick<import("jimu-ui").ButtonProps, "disabled">, Pick<EditWindowComponent.IProps, "cancelButton" | "failedToSaveMessage" | "loadMetadataErrorMessage" | "modalHeader" | "requiredValueMissing" | "saveButton" | "saveSuccessMessage" | "dataProvider" | "saveFeature"> {
        }

        interface IEditButtonMethods {
            /** - Zavření editačního okna. */
            close(): void;
        }

        interface ISdDynamicSourceEditButton extends ConfigExtensions.IDynamicLayerExtension, Pick<ISdEditButton, "sourceClass" | "onEdited" | "tableRef"> {
            /** - OID editovaného prvku. */
            oid: number;
        }

        interface ISdCreateButton extends Pick<ISdCruButton, "disabled" | "provideLayer" | "sourceClass"> {
            /** - Reference tabulky. */
            tableRef: React.MutableRefObject<__esri.FeatureTable>;
        }
    }

    namespace ReportComponent {
        //#region - Report Props

        /** - Props komponenty ReportGeneratorModal. */
        interface IReportGeneratorModalProps extends Pick<ICreateReportFeatureLoaderProps, "jimuMapView" | "useTextInputs" | "onFeatureCreated"> {
            /** - Výchozí překlady. */
            translations: {
                [key in "generateReportModalHeader" | "failedToRenderReport" | "closeReportButton"]: string;
            } & ICreateReportFeatureLoaderProps['translations'] & IFeatureReportProps['translations'] & IWhereClauseReportProps['translations'];
        }

        /** - Props komponenty FeatureReport. */
        interface IFeatureReportProps extends Pick<HSI.Report.IGenerateFeatureReportParams, "fileNameTemplate" | "reportServiceUrl"> {
            /** - Funkce pro zavření dialogu na generování reportu. */
            closeModal: () => void;
            /** - Prvek reportu. */
            feature: __esri.Graphic;
            /**
             * - Pole pro vytvoření reportu.
             * - Pokud zde nebudou nějaká povinná (v datovém modelu nejsou "nullable") pole, tak se automaticky doplní na konec.
             */
            fields: Array<IProtocolField>;
            /** - Výchozí překlady. */
            translations: {
                [key in "reportSuccessMessage" | "closeReportButton"]: string;
            } & IRenderErrorLoadingProps['translations'];
        }

        /** - Props komponenty WhereClauseReport. */
        interface IWhereClauseReportProps extends Pick<IGenerateReportParams, "fileName" | "reportServiceUrl"> {
            /** - Funkce pro zavření dialogu na generování reportu. */
            closeModal: () => void;
            /** - Where klauzule podle které se nacházejí prvky, které se zobrazí v reportu. */
            whereClause: string;
            /** - Název šablony reportu. */
            templateName: string;
            /** - Výchozí překlady. */
            translations: {
                [key in "reportSuccessMessage" | "closeReportButton"]: string;
            } & IRenderErrorLoadingProps['translations'];
        }
        
        /** - Props komponenty RenderErrorLoading. */
        interface IRenderErrorLoadingProps {
            /** - Stav vytvoření reportu. */
            state: IRenderErrorLoadingLoadingState | IRenderErrorLoadingErrorState;
            /** - Výchozí překlady. */
            translations: {
                [key in "failedToGenerateReport" | "savingReport"]: string;
            }
        }

        /** - Props komponenty CreateReportFeatureBody. */
        interface ICreateReportFeatureBodyProps extends Omit<IRenderErrorLoadingProps, "state">, Partial<Pick<IRenderErrorLoadingProps, "state">> {
            /** - Pole, která se zobrazují v tabuce pro vytvoření {@link feature prvku reportu}. */
            fields: Array<IField>;
            /** - Prvek ze kterého se generuje report. */
            feature: __esri.Graphic;
            /** - Pokud true, tak se v tabuce pro vytvoření, pole typu "string" budou zobrazovat jako TextInput, v opačném případě se budou zobrazovat jako TextArea (Roztáhnutelné pole). */
            useTextInputs: boolean;
        }

        /** - Props komponenty CreateReportFeatureLoaded. */
        interface ICreateReportFeatureLoadedProps extends Pick<ICreateReportFeatureBodyProps, "feature" | "fields" | "useTextInputs">, Pick<IGenerateFeatureReportParams, "reportServiceUrl" | "fileNameTemplate"> {
            /** - Funkce pro zavření dialogu na generování reportu. */
            closeModal(): void;
            /**
             * - Zavolá se při vytvoření {@link feature prvku ze kterého se generuje report}.
             * @param originFeature - Prvek ze kterého byl {@link feature prvek pro report} vytvořen.
             * @param relationshipClassId - Identifikátor relační třídy mezi {@link originFeature} a {@link feature}.
             */
            onFeatureCreated(originFeature: __esri.Graphic, relationshipClassId: string): void;
            /** - Prvek pro který generujeme {@link feature report}. */
            originFeature: __esri.Graphic;
            /** - Aktivní pohled mapy. */
            jimuMapView: import("jimu-arcgis").JimuMapView;
            /** - Výchozí překlady. */
            translations: {
                [key in "reportRequiredAttributeMissing" | "failedToLoadReport" | "reportSuccessMessage" | "tryAgainReportButton" | "saveReportButton" | "closeReportButton"]: string;
            } & ICreateReportFeatureBodyProps['translations'];
        }

        /** - Props komponenty CreateReportFeatureLoader. */
        interface ICreateReportFeatureLoaderProps extends Pick<ICreateReportFeatureLoadedProps, "closeModal" | "jimuMapView" | "useTextInputs" | "onFeatureCreated" | "fileNameTemplate" | "reportServiceUrl"> {
            /** - Prvek na základě jehož parametrů se vytvoří prvek pro vygenerování reportu.  */
            feature: ICreateReportFeatureLoadedProps['feature'];
            /** - Negrafická vstva, ve které se pro {@link feature tento prvek} vytváří protokol. */
            reportTable: Definitions.ITableDefinition;
            /**
             * - Pole pro vytvoření protokolu.
             * - Pokud zde nebudou nějaká povinná (v datovém modelu nejsou "nullable") pole, tak se automaticky doplní na konec.
             */
            fields: Array<IProtocolField>;
            /** - Výchozí překlady. */
            translations: {
                [key in "reportFieldsMissingMessage" | "reportTableMissingMessage" | "reportFieldMissingMessage" | "reportUserNameMissingMessage" | "reportUserTableMissingMessage" | "reportUserTableNotFoundMessage" | "reportUserAttributeMissingMessage" | "reportUserIdAttributeMissingMessage" | "reportFailedToFindUser"]: string;
            } & ICreateReportFeatureLoadedProps['translations'];
        }
        //#endregion
        
        //#region - Report State
        /** - Základ stavu vytvoření reportu. */
        interface IRenderErrorLoadingStateBase<T extends import("./enums/ELoadStatus").ELoadStatus> {
            /** - Stav generování reportu. */
            reportStatus: T;
        }

        /** - Stav vytváření reportu. */
        interface IRenderErrorLoadingLoadingState extends IRenderErrorLoadingStateBase<import("./enums/ELoadStatus").ELoadStatus.Pending> {}
        /** - Stav chyby při vytváření reportu. */
        interface IRenderErrorLoadingErrorState extends IRenderErrorLoadingStateBase<import("./enums/ELoadStatus").ELoadStatus.Error> {
            /** - Chyba při generování reportu. */
            error: Error;
        }
        //#endregion
        
        //#region - Report Helpers
        /** - Tělo dotazu pro vygenerování reportu. */
        interface IReportTaskBody {
            Web_Map_as_JSON: {
                /** - Where klauzule podle které se nacházejí prvky, které se zobrazí v reportu. */
                expression: string;
            };
            /** - Název šablony reportu. */
            Layout_Template: string;
        }
        
        /** - Parametry funkce pro vygenerování reportu. */
        interface IGenerateReportParams {
            /** - Tělo dotazu pro vygenerování reportu. */
            reportBody: IReportTaskBody;
            /** - URL adresa služby pro vytvoření reportu. */
            reportServiceUrl: string;
            /** - Název souboru s reportem. */
            fileName: string;
        }

        /** Parametry funkce pro vygenerování protokolu z jednoho prvku. */
        interface IGenerateFeatureReportParams extends Pick<IGenerateReportParams, "reportServiceUrl"> {
            /** - Prvek protokolu. */
            feature: __esri.Graphic;
            /** - Zdrojová tabulka {@link feature prvku reportu}. */
            table: __esri.FeatureLayer;
            intl: IntlShape;
            /** - Název atributu podle jehož hodnoty se z {@link reportOptions} určuje jaký protokol se vygeneruje. */
            reportOptionField?: string;
            /**
             * - Vzor podle kterého se vytváří název souboru.
             * @example "{C_TYP}_{CISLO}"
             */
            fileNameTemplate: string;
            /**
             * - Hodnoty podle kterých se určuje jaký protokol se vygeneruje.
             * - Pouze pokud se podle hodnoty tohoto pole určuje protokol.
             * - Mělo by být vyplněno pouze pro jedno pole. Pokud je vyplněno pro více polí, tak se bude zohledňovat první pole.
             */
            reportOptions?: Array<{
                /** - Hodnota pro kterou se použije reportName. */
                value: string | number;
                /** - Název souboru s reportem, který se použije pokud je vybraná tato hodnota. */
                reportName: string;
            }>;
        }

        /** - Pole, které se zobrazí v tabuce pro vytvoření prvku reportu. */
        interface IField extends Pick<IGenerateFeatureReportParams, "reportOptions"> {
            /** - Metadata pole. */
            field: __esri.Field;
            /** - Je {@link field toto pole} editovatelné? */
            editable: boolean;
        }

        /** - Konfigurace pole, které se zobrazí v tabuce pro vytvoření prvku reportu. */
        interface IProtocolField extends Pick<IField, "reportOptions" | "editable"> {
            /** - Název pole. */
            fieldName: string;
            /**
             * - Musí {@link fieldName toto pole} být vyplněné, aby šel vytvořit protokol?
             * - Pokud je hodnota false, ale v datovém modelu {@link fieldName pole} není "nullable", tak se i tak považuje za povinné.
             */
            required: boolean;
            /** - Atribut z prvku na kterém se vyvolala kontextová nabídka, jehož hodnotou se naplní {@link fieldName toto pole}. */
            relateAttribute?: string;
            /** - Má se {@link fieldName toto pole} naplnit přihlášeným uživatelem? */
            currentUser: boolean;
            /**
             * - Definice tabulky pro zjištění identifikátoru přihlášeného uživatele, kterým se naplní {@link fieldName toto pole}.
             * - Pouze pokud je {@link currentUser} rovno true.
             */
            loginTableDefinition: Definitions.ITableDefinition & {
                /** - Atribut, podle kterého se vyhledává přihlášený uživatel. */
                userNameAttribute: string;
                /** - Atribut, ve kteréme je identifikátor uživatele shodující se s doménovou hodnotou {@link fieldName tohoto pole}. */
                userIdAttribute: string;
            };
        }
        //#endregion

        //#region - Report Methods

        /** - Metody pro otevření dialogu pro vytvoření reportu. */
        interface IReportGeneratorModalMethods {
            /**
             * - Otevření dialogu pro vytvoření prvku ze kterého se následně vygeneruje report.
             * @param feature - Prvek na základě jehož parametrů se vytvoří prvek pro vygenerování reportu. 
             * @param options - Parametry generování reportu.
             */
            createReportFeature(feature: __esri.Graphic, options: Pick<ICreateReportFeatureLoaderProps, "reportServiceUrl" | "reportTable" | "fileNameTemplate" | "fields">): void;
            /** 
             * - Vygenerování protokolu z {@link feature prvku}.
             * @param feature - Prvek ze kterého se vygeneruje report.
             * @param options - Parametry generování reportu.
             */
            featureReport(feature: __esri.Graphic, options: Pick<IFeatureReportProps, "reportServiceUrl" | "fileNameTemplate" | "fields">): void;
            /**
             * - Vygenerování protokolu na základě where klauzule.
             * @param options - Parametry generování reportu.
             */
            whereClauseReport(options: Pick<IWhereClauseReportProps, "fileName" | "reportServiceUrl" | "templateName" | "whereClause">): void;
        }

        //#endregion
    }

    namespace DeleteModal {
        interface IProps {
            /** - Hlavičla okna. */
            header?: string;
            /** - Tlačítko pro potvrzení smazání. */
            yesMessage?: string;
            /** - Tlačítko pro zrušení smazání. */
            noMessage?: string;
            /** - Dotaz v okně. */
            confirmationMessage?: string;
            /** - Funkce pro odstranění prvku. */
            deleteFeature(): Promise<any>;
        }

        interface IMethods {
            open(): void;
        }
        
        interface IState {
            /** - Je otevřeno okno pro odstranění prvku? */
            isOpen: boolean;
            /** - Má se zobrazit načítání? */
            showLoading: boolean;
        }
    }
    
    namespace Table {
        type ITableHeader = Array<string | number | JSX.Element>;
        type ITableRows = Array<Array<string | number | JSX.Element>>;
    }
    
    namespace SelectableTable {
        interface ITableProps<C extends ITableCell, R extends ITableRow<C>> {
            /**
             * - Druh označení výběru (řádek / buňka).
             * @default "row"
             */
            selectionType?: "row" | "cell"
            /** - Má při kliknutí na vybraný řádek, řádek zůstat vybraný? */
            keepSelected?: boolean;
            /**
             * - Spouštěče vybrání řádku/buňky.
             * @default ["left-click"]
             */
            selectTrigger?: Array<"left-click" | "right-click">;
            /** - Hlavičky v tabulce. */
            header?: ITableHeader;
            /** - Řádky v tabulce. */
            rows: Array<R>;
            /** - Má se zobrazit načítání tabulky? */
            loading?: boolean;
            /** - Funkce volající se při vybrání řádku a poskytujicí vybraný řádek. */
            onRowSelect?: (ev: React.MouseEvent<HTMLTableRowElement>, row?: R) => void;
            /** - Funkce volající se při vybrání buňky a poskytujicí vybranou buňku. */
            onCellSelect?: (ev: React.MouseEvent<HTMLTableCellElement>, cell?: C, row?: R) => void;
            /** - Barvy v tabulce. */
            colors?: {
                /** - Barva sudých řádků. */
                evenRowColor?: string;
                /** - Barva lichých řádků. */
                oddRowColor?: string;
                /** - Barva vybraných řádků / buňek. */
                selectedRowColor?: string;
                /** - Barva hlavičky. */
                headerColor?: string;
            }
            style?: React.CSSProperties;
        };

        type ITableHeader = Array<string | number | JSX.Element>;

        interface ITableCell {
            /** - Obsah buňky. */
            content: string | number | JSX.Element;
            /** - Identifikátor buňky. */
            id?: number | string;
            /** - Funkce volající se při kliknutí na buňku, a poskytující informaci zda je buňka vybraná. */
            onSelect?: (ev: React.MouseEvent<HTMLTableCellElement>, selected: boolean) => void;
        }

        interface ITableRow<C extends ITableCell> {
            /** - Identifikátor řádku. */
            id?: number | string;
            /** - Obsah řádku. */
            cells: Array<C>;
            /** - Funkce volající se při kliknutí na řádek, a poskytující informaci zda je řádek vybraný. */
            onSelect?: (ev: React.MouseEvent<HTMLTableRowElement>, selected: boolean) => void;
        };
    }

    namespace SdWebService {
        interface IGetUserNameWithRoles {
            UserNameResult: IUserNameResult;
            UserRoles: Array<string>;
        };
            
        interface IUserNameResult {
            Description: string;
            FullName: string;
            IsAuthenticated: boolean;
            UserId: string;
            UserName: string;
        };
        
    };
        
    namespace SdMapServerSoe {
        //#region - LayerInfo
        interface ILayerInfoResponse {
            layers: Array<ILayerInfo>;
            workspaces: Array<ILayerWorkspace>;
        }

        interface ILayerInfo {
            layerId: number;
            datasetName: string;
            definitionExpression: string;
            workspaceIndex: number;
        }

        interface ILayerWorkspace {
            index: number;
            name: string;
            isDefaultWorkspace: boolean;
            editorMetadataXml: string;
        }
        //#endregion END - LayerInfo
    }

    namespace WidgetWrapper {
        
        type IOptionProps = {
            /**
             * - Zpráva zobrazujicí se pokud není zvolený widget poskytujicí JimuMapView.
             * - Pokud není zvoleno, tak se použije překlad pod klíčem '_missingMap', popřípadě výchozí text.
             */
            noUseMapWidgetIdsMessage?: string | JSX.Element;
            /**
             * - Používá widget Popper (kontextová nabídka)?
             * - Pokud 'true' componenta předává funkci pro vyvolání popperu všem potomkům pomocí {@link PopperContext}.
             */
            usePopper?: boolean;
            /**
             * - Používá widget soubory uložené ve složce 'assets'?
             * - Pokud 'true' componenta předává funkci pro poskytnutí cesty k souboru všem potomkům pomocí {@link AssetsProviderContext}.
             */
            hasAssets?: boolean;
            /** - True pokud chceme aby componenta předala konfiguraci potomkům pomocí {@link ConfigContext}. */
            provideConfiguration?: boolean;
            /** - Chceme potomky obalit komponnetou {@link Suspense}? */
            lazy?: boolean;
        } & (
            (IExtraPropsUrlParser<false> & Required<IExtraPropsIgnoreJimuMapView<true>>) | (IExtraPropsUrlParser<true> & IExtraPropsIgnoreJimuMapView<false>)
        );
            
        interface IExtraPropsIgnoreJimuMapView<T extends boolean> {
            /**
             * - True pokud widget nemá JimuMapView (žádným způsobem napracuje s mapou).
             * - Pokud 'false', componenta nevykreslí obsah widgetu jestliže není načteno JimuMapView.
             * - Pokud 'false', componenta předává JimuMapView všem potomkům pomocí {@link JimuMapViewContext}.
             */
            ignoreJimuMapView?: T;
            
        };
        
        interface IExtraPropsUrlParser<T extends boolean> {
            /**
             * - True pokud widget při načtení aplikace má přečíst url parametry, a podle nich vyvolat požadované akce (přidání do výběru, nastavení extentu, atd.).
             * - Akci vyvolá pouze první načtený widget, který má zaplou tuto funkcionalitu.
             * - Pokud 'true' musí se v manifest.json přidat cesty k {@link SelectionStore}, {@link NotificationStore} a {@link FirstRenderHandlerStore}, a parametr {@link IExtraProps.ignoreJimuMapView} nesmí být roven 'true'.
             * - @see {@link https://developers.arcgis.com/experience-builder/guide/extension-points/}
             */
            urlParser?: T;
        
        };
        
        interface INotificationPropsExtension {
            /** - Id widgetu, který zobrazuje notifikace. */
            notificationWidgetId: string;
        }
        
        interface IUrlParserPropsExtension extends Pick<import("jimu-core").IMState, "queryObject" | "appConfig" | "hsiFirstRenderHandler"> {};
        
        type IProps<T extends any = {}> = import("jimu-core").AllWidgetProps<T>;
        
        type IPropsExtension =  Partial<INotificationPropsExtension & IUrlParserPropsExtension>;
        
        type IExtendedProps<T = {}> = IProps<T> & IPropsExtension & IOptionProps;
    };

    namespace ConfigExtensions {
        interface IForbidPopupFormat {
            /**
             * - Pokud true, tak se budou používat výchozí aliasy a formáty dat.
             * - Pokud false, tak aliasy a formáty dat převezmou z popupu.
             */
            forbidtPopupFormat: boolean;
        }
    
        interface IRequiredRoles {
            /** - Role potřebné k zobrazení widgetu. */
            requiredRoles?: Array<string>;
        }

        /** - Rozšíření configurace o nastavení dynamicDataSource vrstvy. */
        interface IDynamicLayerExtension {
            /**
             * - WorkspaceId, které se odešle při {@link searchUrl dotazu}.
             * @example "sdagsddb03"
             */
            workspaceId: string;
            /**
             * - URL služby pro vytvoření Feature vrstvy přes {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-FeatureLayer.html#dynamicDataSource dynamicDataSource}.
             * @example "https://sdagsdase106.hsi.lan/server/rest/services/SD_funkce2/MapServer"
             */
            dynamicServiceUrl: string;
        }
    };

    namespace DbRegistry {
        type IDbRegistryValueType = "int" | "double" | "datetime" | "datetime-msse" | "string" | "bool" | "bytes" | "json";
        type IDbRegistryScope = "global" | "user" | "g" | "u";
        type IDbRegistryValue<T extends IDbRegistryValueType, N extends import("./enums/ESelectionActionKeys").EDbRegistryKeys> = T extends "bool" ? boolean : T extends "bytes" ? Array<number> : T extends "double" ? number : T extends "datetime-msse" ? number : T extends "int" ? number : T extends "json" ? IDbRegistryJsonResponse<N> : string;
        type IDbRegistryJsonResponse<N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys> = N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.Search ? ISearchDbValue : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.Floors ? IFloorDbValue : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.SelectionContextMenu ? ISelectionContextMenuDbValue : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.Attachments ? IAttachmentsDbValue : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.Editability ? IEditabilityDbValue : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.BookRooms ? IBookRoomsDbValue : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.RelationshipQueries ? IRelationshipQueriesDbValue : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.LocateSettings ? ILocateSettingsDbValue : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.BookRoomInfo ? IBookRoomInfoDbValue : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.Basemaps ? IBasemapsDbValue : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.NewFeaturesLayers ? INewFeaturesLayersDbValue : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.MapOwerviewExtent ? __esri.ExtentProperties : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.TableOfContents ? ITableOfContentsDbValue : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.CoordinateConversion ? ICoordinateConversionDbValue : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.Metadata ? IMetadataDbValue : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.AttributeTableLayers ? IAttributeTableLayersDbValue : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.GeometryProvider ? IGeometryProviderDbValue : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.PopupFeatureQuery ? IPopupFeatureQueryDbValue : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.Bookmarks ? IBookmarksDbValue : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.ContingentValues ? IContingentValuesDbValue : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.DisplayFeatureFormat ? IDisplayFeatureFormatDbValue : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.ObstacleAreas ? IObstacleAreasDbValue : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.PopupHeight ? IPopupHeightDbValue : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.FromData ? IFromDataDbValue : N extends import("./enums/EDbRegistryKeys").EDbRegistryKeys.TableSettings ? ITableSettingsDbValue : Object;

        interface IDbRegistryWithValue<T extends IDbRegistryValueType, S extends IDbRegistryScope, N extends import("./enums/ESelectionActionKeys").EDbRegistryKeys> extends IDbRegistry<T, S, N> {
            /** - Hodnota položky. */
            value: IDbRegistryValue<T, N>;
        };

        /** - Interface hodnoty v databázovém registru pod klíčem {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.Bookmarks}. */
        interface IBookmarksDbValue {
            /** - Nastavení viditelnosti a vybíratelnosti vstev, a rozsahu mapy. */
            userSettings: Array<{
                /** - Pohled mapy. */
                viewpoint: __esri.ViewpointProperties,
                /** - Název nastavení. */
                title: string;
                /** - Nastavení podlaží. */
                floorSetting: FloorHelper.IFloorValues;
                /** - Nastavení vrstev. */
                layers: Array<{
                    /** - Viditelnost vrstvy. */
                    visible: boolean;
                    /** - Vybíratelnost vrstvy. */
                    selectable: boolean;
                    /** - Identifikace vrstvy. */
                    definition: ISublayerDefinition;
                }>;
            } & Pick<__esri.Bookmark, 'thumbnail'>>;
        }

        /** - Interface hodnoty v databázovém registru pod klíčem {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.BookRoomInfo}. */
        interface IBookRoomInfoDbValue {
            info: Array<{
                /** - Identifikace negrafické vrstvy organizačních jednotek. */
                orgUnitTable: ITableDefinition;
                /** - Identifikace negrafické vrstvy nákladových středisek. */
                costCenterTable: ITableDefinition;
                /** - Název atributu podle kterého se získávají nákladová střediska. */
                costCenterAttribute: string;
                /** - Název atributu pod kterým je v organizační jednotce uložena hodnota, podle které se zíkávají nákladová střediska. */
                orgUnitAttribute: string;
                /** - Název atributu pod kterým je v organizační jednotce uložen identifikátor, který se odesílá při žádosti. */
                orgUnitIdAttribute: string;
            }>;
        };

        interface IDbRegistry<T extends IDbRegistryValueType, S extends IDbRegistryScope, N extends import("widgets/shared-code/enums").EDbRegistryKeys> { 
            /** - Datový typ položky. */
            type: T;
            /**
             * - Název položky.
             * - Pro přehlednost používat smyslupné názvy.
             * @see {@link https://hsi0916.atlassian.net/wiki/spaces/LETGIS/pages/2861924359/Db+registr+s+konfigurac#N%C3%A1zvy-kl%C3%AD%C4%8D%C5%AF}
             */
            name: N;
            /** - Druh sdílení dat (přístupné všem/pouze přihlášenému uživateli). */
            scope: S;
            /** - Rozšížení názvu položky {@link IDbRegistry.name}. */
            nameExtension?: N extends import("widgets/shared-code/enums").EDbRegistryKeys.PopupTopFeatureOnly | import("widgets/shared-code/enums").EDbRegistryKeys.PopupOrderFeatures | import("widgets/shared-code/enums").EDbRegistryKeys.AttributeTableDomainTranslation | import("widgets/shared-code/enums").EDbRegistryKeys.Bookmarks | import("widgets/shared-code/enums").EDbRegistryKeys.Editability | import("widgets/shared-code/enums").EDbRegistryKeys.NewFeaturesLayers | import("widgets/shared-code/enums").EDbRegistryKeys.AttributeTableLayers | import("widgets/shared-code/enums").EDbRegistryKeys.Search | import("widgets/shared-code/enums").EDbRegistryKeys.TableSettings ? string : undefined;
            /** - Má se vyhodit výjimka pokud mapa neobrahuje mapovou službu s potřebnou SOE? */
            throwWhenSoeNotFound?: boolean;
        };
        //#region - FormData
        interface IFromDataDbValue {
            /** - Třidy do kterých lze vyvolat dotaz. */
            objectClasses: Array<IFromDataObjectClass>;
            actions: Array<IFromDataAction>;
        };

        interface IFromDataQuery {
            caption: string;
            fields?: Array<IFromDataQueryField>;
        }

        interface IFromDataQueryField {
            name: string;
            defaultValue?: string | number | boolean;
        }
            
        interface IFromDataField {
            alias?: string;
            name: string;
            editRight?: string | Array<string>;
            action?: string;
            required?: boolean;
        }

        interface IFromDataAction {
            name: string;
            url: string;
            executeRight: string;
        }

        interface IFromDataObjectClass extends Pick<IFromDataField, "editRight"> {
            objectClass: string;
            alias?: string;
            fields?: Array<IFromDataField>;
            queries?: Array<IFromDataQuery>;
        }
        //#endregion END - FormData
        
        interface ITableSettingsDbValue {
            columns: Array<Pick<__esri.FieldColumnTemplateProperties, "fieldName" | "visible" | "width">>;
        }

        //#region - Search
        /** - Interface hodnoty v databázovém registru pod klíčem {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.Search}. */
        interface ISearchDbValue extends Pick<__esri.widgetsSearchProperties, "maxSuggestions">{
            /** - Konfigurace vrstev pro widget 'Search' */
            sublayers: Array<ISublayerSource>;
            /** - Konfigurace negrafických vrstev (tabulek) pro widget 'Search' */
            tables: Array<ITableSource>;
            /** - Konfigurace geolokačních služeb pro widget 'Search' */
            geocoding: Array<IGeocodingSource>;
            /** - Barva zvýraznění vyhledané geometrie. */
            color: string | [number, number, number, number];
            /** - Cheme u všech vrstev přepsat vyhledávání výsledků {@link __esri.LayerSearchSourceProperties.getSuggestions}, komplexnějším custom řešením? */
            complexSearch: boolean;
            /**
             * - Nastavení zobrazení výsledků vygledávání.
             * - Nastavení se aplikuje i pro vyhledávání přes URL.
             */
            resultBehavior: {
                /** - Nastavení, které se použije pokud ve widgetu 'Search' není definován klíč, nebo pokud widget 'Search' není v aplikaci. */
                default: IResultBehavior,
                /** - Nastavení pod klíčem definovaným v konfiguraci widgetu 'Search'. */
                [key: string]: IResultBehavior;
            }
        };

        /** - Konfigurace grafické vrstvy pro widget 'Search' */
        interface ISublayerSource extends Pick<__esri.LayerSearchSourceProperties, "searchFields" | "suggestionTemplate" | 'maxSuggestions' | 'popupEnabled' | "minSuggestCharacters"> {
            /** - Identifikace vrstvy. */
            layer: ISublayerDefinition;
            /** - Chceme vyhledaný prvek přidat do výběru? */
            selectResult: boolean;
            /** - Cheme u této vrstvy přepsat vyhledávání výsledků {@link __esri.LayerSearchSourceProperties.getSuggestions}, komplexnějším custom řešením? */
            complexSearch: boolean;
            /**
             * - Atributy u kterých dochází k vyhledávání celým zadaným textem.
             * - Vyhledávání se provádí pomocí LIKE '[VALUE]' ne LIKE '%[VALUE]%' jako tomu je u {@link __esri.LayerSearchSourceProperties.searchFields}.
             */
            strictSearchField: Array<string>;
            /**
             * - Atributy u kterých nacházejí hodnoty začínajicí na zadaný text.
             * - Vyhledávání se provádí pomocí LIKE '[VALUE]%' ne LIKE '%[VALUE]%' jako tomu je u {@link __esri.LayerSearchSourceProperties.searchFields}.
             */
            startsWithSearchField: Array<string>;
            /** - Má se ve službě vyhledávat pouze pokud je vybraná? Ne pokud je vybráno vyhledávání ve všem? */
            onlyWhenSelected: boolean;
        };

        /** - Konfigurace negrafické vrstvy (tabulky) pro widget 'Search' */
        interface ITableSource extends Omit<ISublayerSource, "layer"> {
            /** - Identifikace negrafické vrstvy (tabulky). */
            table: ITableDefinition;
        };

        /** - Konfigurace geolokační služby pro widget 'Search' */
        interface IGeocodingSource extends Omit<ISublayerSource, "layer" | "searchFields" | "selectResult" | "complexSearch"> {
            /** - Název služby. */
            title: string;
            /** - URL adresa služby. */
            url: string;
        };

        interface IResultBehavior {
            /** - Nastavení grafických prvků. */
            graphics: {
                /** - Mají se výsledky přidat do výběru? */
                select: boolean;
                /** - Má se vykreslit geometrie prvního nalezeného prvku, která se vymaže při zavžení pop-upu? */
                display: boolean;
            },
            /** - Nastavení negrafických prvků. */
            notGraphics: IResultBehavior['graphics'];
        };
        //#endregion END - Search
        
        /** - Interface hodnoty v databázovém registru pod klíčem {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.PopupHeight}. */
        interface IPopupHeightDbValue {
            /**
             * - URL služby, ze které se načítá výška terénu.
             * - @example https://ags.cuzk.cz/arcgis2/rest/services/dmr5g/ImageServer/identify
             */
            heightServiceUrl: string;
            /** - Podvrstvy do v jejichž popupu se má zobazovat výška terénu. */
            sublayers: Array<ISublayerDefinition>;
        };

        //#region - TableOfContents 
        /** - Interface hodnoty v databázovém registru pod klíčem {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.TableOfContents}. */
        interface ITableOfContentsDbValue {
            /** - Nastavení pro widgetu ("TableOfContents") uložené pod klíčem, který se definuje v konfiguraci widgetu. */
            [key: string]: {
                /** - Nastavení zobrazování vrstev ve stromové struktuře. */
                layerStructure: Array<ILayerStructureItem>;
                /** - Nastavení funkce pro potvrzení platnosti dat (Specifická funkcionalita pro LetGIS). */
                dataValidity?: {
                    /** - Definice vrstev 'Správci vrstev'. */
                    layerRightsTables: Array<ITableDefinition & {
                        /** - Název atributu obsahujicí uživatelské jméno. */
                        userAttribute: string;
                        /** - Název atributu obsahujicí identifikátor podvrstvy. */
                        layerIdAttribute: string;
                        /** - Název atributu obsahujicí datum verifikace. */
                        veraficationDateAttribute: string
                    }>;
                    /** - Definice vrstev 'Potvrzení platnosti dat' (LetGIS funkcionalita). */
                    layerVerificationTables: Array<ITableDefinition & {
                        /** - Název atributu obsahujicí poznámku. */
                        noteAttribute: string;
                        /** - Název atributu obsahujicí identifikátor tabulky 'Správci vrstev'. */
                        layersRightsOidAttribute: string;
                    }>;
                }
            }
        }

        /** - Definice vrstvy ve stromové struktuře {@link ITableOfContentsDbValue} */
        type ILayerStructureItem = IVirtualLayerStructureItem | ILayerTreeStructureItem;

        interface ILayerStructureItemBase {
            /** - Mají ve výchozím stavu být vidět potomci této vrstvy? */
            expandedByDefault: boolean;
            /** - Má být tato podvrstva ve výchozím stavu vybíratelná? */
            selectableByDefault?: boolean;
            /** - Potomci této vrstvy? */
            children: ITableOfContentsDbValue['key']['layerStructure'];
        };

        /** - Definice virtuální vrstvy ve stromové struktuře {@link ITableOfContentsDbValue} */
        interface IVirtualLayerStructureItem extends ILayerStructureItemBase {
            /**
             * - Je vrstva neexistujicí (virtuální)?
             * @see {@link IVirtualLayerDefinition}
             */
            virtual: true;
            /**
             * - Popis neexistujicí vrstvy.
             * - Tato vrstva se sobrazuje ve stromové struktuře widgetu "TableOfContents", a umožňuje aby se jevila jako nadřazená vrstva vrstvám, které jsou ve webmapě zanořené někde jinde.
             */
            layer: {
                /** - Název vrstvy zobrazujicí se ve stromové struktuře. */
                title: string;
            };
        };

        /** - Definice vrstvy ve stromové struktuře {@link ITableOfContentsDbValue} */
        interface ILayerTreeStructureItem extends ILayerStructureItemBase {
            /** - Definice podvrstvy nebo mapové služby. */
            layer: ISublayerDefinition | ILayerDefinition | IWmsLayerDefinition | IFeatureLayerDefinition;
            /**
             * - Vrstvy jejichž viditelnost se mění na základě viditelnosti {@link layer této vrstvy}. 
             * - Závislost je i obrácená. Pokud dojde ke změně viditelnosti jedné z těchto vrstev, tak se podle ní změní viditelnost {@link layer této vrstvy}.
             */
            dependentVisibilityLayers: Array<ILayerTreeStructureItem['layer']>;
        };
        //#endregion END - TableOfContents 

        //#region - PopupFeatureQuery
        /** - Interface hodnoty v databázovém registru pod klíčem {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.PopupFeatureQuery}. */
        interface IPopupFeatureQueryDbValue {
            /** - Definice vrstev u kterých se tlačítko zobrazí, uložené pod klíčem z konfigurace widgetu. */
            [key: string]: Array<IPopupFeatureQueryDefinition>;
            /** - Definice vrstev u kterých se tlačítko zobrazí, pokud v konfiguraci widgetu není zadán klíč. */
            default: Array<IPopupFeatureQueryDefinition>;
        };

        /** - Definice vrstev u kterých se v popupu zobrazí tlačítko, které vyvolá nový popup s navazbenými prvky. */
        type IPopupFeatureQueryDefinition = IPopupFeatureAttributeQueryDefinition | IPopupFeatureRelationDefinition;

        interface IPopupFeatureQueryDefinitionBase {
            /** - Vrstva pro jejíž prvky v popupu zobrazujeme tlačítko. */
            originLayer: ITableDefinition | ISublayerDefinition;
            /** - Vrstva ve které se vyhledávají navazbené prvky. */
            destinationLayer: ITableDefinition | ISublayerDefinition;
            /** - Název tlačítka. */
            title: string;
        };

        interface IPopupFeatureAttributeQueryDefinition extends IPopupFeatureQueryDefinitionBase {
            /** - Atributy, ve kterých jsou v prvku z {@link originLayer origin vrstvy} hodnoty, podle kterých se v {@link destinationLayer destination vrstvě} hledjí navazbené prvky. */
            originLayerAttributes: string | Array<string>;
            /** - Atributy, podle kterých se v {@link destinationLayer destination vrstvě} hledjí navazbené prvky. */
            destinationLayerAttributes: string | Array<string>;
        };

        interface IPopupFeatureRelationDefinition extends IPopupFeatureQueryDefinitionBase {
            /** - Jednoznačný technologický identifikátor relační třídy. */
            relationshipClassId: string;
        };
        //#endregion END - PopupFeatureQuery

        /** - Interface hodnoty v databázovém registru pod klíčem {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.BookRooms}. */
        interface IBookRoomsDbValue {
            /** - Identifikátory vrstev ve kterých lze vytvořit žádanku. */
            sublayers: Array<ISublayerDefinition & {
                /** - Název atributu pod kterým je uložen identifikátor prvku používaný letištěm. */
                fid: string;
                /** - Název atributu pod kterým je uložen identifikátor objektu používaný letištěm, ve kterém je prvek. */
                fidObject: string;
            }>;
        };

        //#region - ObstacleAreas
        /** - Interface hodnoty v databázovém registru pod klíčem {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.ObstacleAreas}. */
        interface IObstacleAreasDbValue {
            /**
             * - URL služby pro poskytnutí výšky stávajícího terénu.
             * @example "https://ags.cuzk.cz/arcgis2/rest/services/dmr5g/ImageServer"
             */
            groundHeightService: string;
            /** - Velikost obalové zóny (v metrech) ve které se hledají překážky. */
            buffer: number;
            /** - Definice vrstev ze kterých se zjišťuje výška překážek. */
            obstacleLayers: Array<IObstacleLayerWithService | IObstacleLayerWithoutService | IObsacleGroupLayer>;
        };

        interface IObstacleLayerBase extends ISublayerDefinition {
            /** - Atribut z {@link layerId této vrtvy} který se zobrazuje ve výsledku. */
            dispalyAttribute: string;
        };
        
        interface IObstacleLayerWithService extends IObstacleLayerBase {
            /**
             * - Služba poskytující výšku pro {@link layerId tuto vrstvu}.
             * @example "https://ags.cuzk.cz/arcgis2/rest/services/dmr5g/ImageServer"
             */
            identifyService: string;
            /** - Vrstva, ze které se zjišťuje obrys geometrie všech prvků {@link layerId této vrstvy}. */
            contourLayer: {
                /** - URL adresa vrstvy. */
                url: string;
                /** - OBJECTID prvků, které obsahují geometrii, která je obrysem všech prvků {@link layerId této vrstvy}. */
                objectId: number | Array<number>;
            },
            /**
             * - Souřadnicový systém ve kterém se budou posílat souřadnice do {@link identifyService služby poskytující výšku}.
             * - Pokud není definováno, tak se použije souřadnicový systém {@link identifyService služby}.
             */
            identifyServiceSpatialReference: __esri.SpatialReferenceProperties;
            // /**
            //  * - Atribut ve kterém je uložena výška překážky.
            //  * - Pokud je vyplněno, tak se v výsledcích budou zobrazovat dvě výšky.
            //  */
            // heightAttribute: string;
        };
        
        interface IObstacleLayerWithoutService extends IObstacleLayerBase {
            /** - Atribut ze kterého se získává výška překážky. */
            heightAttribute: string;
            /** - Atributy, které se pro tuto překážku budou zobrazovat. */
            displayFields?: Array<string>;
        };
        
        /** - Interface skupinové vrstvy, pro jejíž všechny podvrstvy se zjišťuje výška. */
        interface IObsacleGroupLayer extends IObstacleLayerBase {
            /**
             * - URL adresa složky, ve které jsou služby (typu ImageServer), ze kterých se zjišťuje výška pro podvrstvy této vrstvy.
             * - Názvy služeb v této složce, by měli odpovídat názvům podvstev této vstvy. Podle názvů se určuje které podvrtvě odpovídá která služba.
             */
            identifySevicesFolder: string;
        };
        //#endregion END - ObstacleAreas

        //#region - NewFeaturesLayers
        /** - Interface hodnoty v databázovém registru pod klíčem {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.NewFeaturesLayers}. */
        interface INewFeaturesLayersDbValue {
            /** - Podvrstvy, ve kterých lze vytvořit nový prvek. */
            sublayers: Array<ISublayerDefinition & {
                /** - Vykreslování velikosti symbologie v grafické vrstvě. */
                sizeRenderer?: ISymbolSizeRenderer;
                /** - Má se automaticky po vytvoření prvku aktivovat rotace? */
                autoRotate: boolean;
                symbolOverrides?: (({
                    type: "unique-value-info",
                    uniqueValueInfos: Array<__esri.UniqueValueInfoProperties & Pick<INewFeaturesLayersDbValue['sublayers'][number], "sizeRenderer">>;
                } & Partial<Pick<__esri.UniqueValueRenderer, "field" | "field2" | "field3">>) | {
                    type: "simple",
                    properties: __esri.SimpleRendererProperties
                });
            }>;
            /** - Tabulky (negrafické vrstvy), ve kterých lze vytvořit nový prvek. */
            tables: Array<ITableDefinition>;
        };

        type ISymbolSizeRenderer<T extends import("widgets/shared-code/enums").ESymbolRenderType = import("widgets/shared-code/enums").ESymbolRenderType> =  T extends import("widgets/shared-code/enums").ESymbolRenderType.ScaleRatio ? {
            /** - Typ vykreslení velikosti symbolu. */
            type: T;
            /** - Měřítko, ve kterém má sýmbol výchzí velikost (originHeight a originWidth pokud jsou definovány, jinak podle symbolu). */
            originScale: number;
            /** - Výchozí výška symbolu. */
            originHeight?: number;
            /** - Výchozí šířka symbolu. */
            originWidth?: number;
        } : {
            /** - Typ vykreslení velikosti symbolu. */
            type: T;
        };

        //#endregion END - NewFeaturesLayers

        //#region - Floors
        /** - Interface hodnoty v databázovém registru pod klíčem {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.Floors}. */
        interface IFloorDbValue {
            [key: string]: {
                /** - Hodnota podlaží na kterou se přepne, pokud aktivní podlaží není v aktuálním rozsahu mapy. */
                defaultValue: string | number;
                /** - Podvrstvy, ve kterých dochází k vyhledání viditelných pater. */
                search: Array<IFloorSearchSublayerDefinition>;
                /** - Podvrstvy, kterým se mění definitionExpression podle aktivního podlaží. */
                restrict: Array<IFloorRestrictSublayerDefinition>;
                /** - Má widget kontrolovat zda jsou prvky ve výběru v aktivním podlaží? */
                reduceSelection: boolean;
                /** - Má widget automaticky přepnou podlaží, pokud aktivní podlaží není v extentu mapy? */
                adjustFloor: boolean;
                /** - Tile vrstvy, jejichž viditelnost se mění podle aktivního podlaží. */
                restrictVectorTiles: Array<IFloorRestrictVectorTyleLayerDefinition>;
                /** - Mapové služby, jejichž viditelnost se mění podle aktivního podlaží. */
                restrictServices: Array<IRestrictServiceDefinition>;
            };
        };

        /** - Definice mapové služby, jejíž viditelnost se mění podle aktivního podlaží. */
        interface IRestrictServiceDefinition {
            /** - Identifikace mapové služby. */
            layer: ILayerDefinition;
            /** - Podlaží ve kterých bude u {@link layer této služby} zapnutá viditelnost. */
            floors: Array<number | string>;
            /** - Identifikace podvrstvy, podle jejíž viditelnosti se řídí viditelnost {@link layer této služby}. */
            visibilityDependency: ISublayerDefinition;
        };

        /** - Definice podvrstev, ve kterých dochází k vyhledání viditelných pater. */
        interface IFloorSearchSublayerDefinition {
            /** - Identifikace mapové služby. */
            layer: ILayerDefinition;
            /**
             * - Identifikátory doménových hodnot podlaží, v pořadí jak je chceme zobrazovat.
             * - Pokud zde nějaká hodnota nebude uvedena, tak se nebude zobrazovat.
             */
            visibleValues: Array<number | string>;
            /** - Definice podvrstvy, ve které dochází k vyhledání viditelných pater. */
            sublayers: Array<{
                /** - Identifikátor podvrstvy v rámci mapové služby {@link layer}. */
                layerId: number;
                /**
                 * - Název atributu, ve kterém je hodnota podlaží.
                 * - Pokud se liší od {@link attribute}
                 */
                attribute?: string;
            }>;
            /** - Název atributu, ve kterém je hodnota podlaží. */
            attribute: string;
        };

        /** - Definice vrstev, které ovlivňuje aktivní podlaží. */
        interface IFloorRestrictSublayerDefinition {
            /** - Identifikace mapové služby. */
            layer: ILayerDefinition;
            /** - Definice podvrstvy, kterou ovlivňuje aktivní podlaží. */
            sublayers: Array<{
                /** - Identifikátor podvrstvy v rámci mapové služby {@link layer}. */
                layerId: number;
            /** - Hodnoty přepisujicí nastavení {@link layerId} oproti {@link layer} */ 
            } & Partial<Pick<IFloorRestrictSublayerDefinition, "attribute" | "orNull" | "valueRanges" | "rangeEndAttibute">>>,
            /** - Název atributu, ve kterém je hodnota podlaží. */
            attribute: string;
            /**
             * - Mají se prvky s hodnotou podlazí null zobrazovat nezávisle na zvoleném patře?
             * - Pokud true a podlaží je např. 5, tak SQL podmínka bude: "{@link attribute}=5 OR {@link attribute} IS NULL"
             */
            orNull: boolean;
            /**
             * - Rozříření rozsahu konkrétních hodnot podlaží.
             * - Pokud hodnota bude např. [{"value":5, "extensions":[1,2]}] a podlaží je např. 5, tak SQL podmínka bude: "{@link attribute} IN (5,1,2)"
             */
            valueRanges: Array<{
                /** - Původní hodnota. */
                value: number | string;
                /** - Další akceptované hodnoty. */
                extensions: Array<number | string>;
            }>;
            /**
             * - Název atributu, určujicí podlaží ve kterém prvek končí.
             * - Pouze pro prvky, které protínají více podlaží (např. výtah).
             * - {@link valueRanges} má přednost, tzn. pokud je pro aktuální podlazí definéváno {@link valueRanges}, tak se použije SQL podmínka složená odtamtud.
             */
            rangeEndAttibute: string;
        };

        /** - Definice Tile vrstvy, jejíž viditelnost se mění podle aktivního podlaží. */
        interface IFloorRestrictVectorTyleLayerDefinition {
            /** - Identifikace vrstvy. */
            layer: IVectorTyleLayerDefinition;
            /** - Podlaží ve kterých bude u {@link layer této vrstvy} zapnutá viditelnost. */
            floors: Array<number | string>;
            /** - Podvrstva, podle jejíž viditelnosti se řídí viditelnost {@link layer této vrstvy}. */
            visibilityDependency: ISublayerDefinition;
        };
        //#endregion END - Floors

        //#region - LocateSettings
        /** - Interface hodnoty v databázovém registru pod klíčem {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.LocateSettings}. */
        interface ILocateSettingsDbValue {
            /** - Souřadnicové měřítka, které ve widgetu používáme. */
            spatialReferences: Array<ISpatialReferenceSetting>;
            /**
             * - Url adresa služeb pro práci s geometrií.
             * - Pokud není zadáno, tak se použije {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.GeometryServiceUrl}.
             */
            geometryServiceUrl: string;
        };

        /** - Template informací o souřadnicovém měřátku pro widget "LocateCoordinate". */
        interface ISpatialReferenceSetting {
            /** - Identifikace souřadnicového měřítka. */
            wkid: __esri.SpatialReference['wkid'];
            /** - Titulek souřadnicového systému. */
            title: string;
            /**
             * - Typ zápisu souřadnic.
             * [Read more...](https://developers.arcgis.com/javascript/latest/api-reference/esri-rest-geometryService.html#fromGeoCoordinateString)
             */
            conversionType: __esri.geometryServiceFromGeoCoordinateStringParams['conversionType'];
            /**
             * - Parametr "Epocha" předávaný do ČÚZK služby při transformaci souřadnic.
             * - Parametr se zadává v případě že je zvolen jako vstupní nebo výstupní CRS některý z WGS84 a nemá se použít aktuální datum. Požadovaný formát: dd.mm.rrrrr
             */
            epocha: string;
            /**
             * - Pokud true, tak se zadané souřadnice před převodem převedou do záporných hodnot (pokud již záporné nejsou).
             */
            alwaysNegative: boolean;
            /**
             * - Určuje zda se první souřadnice zapisuje Y.
             * - Irelevantní pokud je definováno {@link conversionType}
             */
            yFirst: boolean;
            /** - Příklady zápisu. */
            examples: Array<string>;
        };
        //#endregion END - LocateSettings

        /**
         * - Interface hodnoty v databázovém registru pod klíčem {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.DisplayFeatureFormat}.
         * - Kdykoliv se může doplnit další klíč.
         */
        type IDisplayFeatureFormatDbValue = {
            /** - Výchozí zobrazení. */
            default: DisplayFeatureFormats;
            /** - Zobrazení s názvem vrstvy. */
            withLayerTitle: DisplayFeatureFormats;
        };

        //#region - Metadata
        /** - Interface hodnoty v databázovém registru pod klíčem {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.Metadata}. */
        interface IMetadataDbValue {
            translations: {
                [key: string]: {
                    [key: string]: string;
                };
                /** - České překlady metadat uložené pod jejich klíčem. */
                cs?: IMetadataDbValue['translations'][string];
                /** - Anglické překlady metadat uložené pod jejich klíčem. */
                en?: IMetadataDbValue['translations'][string];
            };
            defalutLanguage: keyof IMetadataDbValue['translations'];
            treeStructure: Array<IMetadataTreeStructureItem>;
            /** - Podvrstvy, pro které nechceme zobrazovat metadata. */
            exclutedSublayers: Array<ISublayerDefinition>;
            /** - Tabulky, ve kterých se vyhledávají údaje o správě dat. */
            administrationTables: Array<ITableDefinition & {
                itemTitle: string;
                /** - Název atributu podle obsahujicí identifikátor vrstvy. */
                layerIdAttribute: string;
                /** - Atributy, které se zobrazují. */
                fields: Array<{
                    /** - Klíč pod kterým je v {@link translations překladech} uložen název. */
                    title: string;
                    /** - Název atributu, ze kterého se čte hodnota. */
                    attributeName: string;
                    /**
                     * - Pokud true, tak se zobrazí seznam hodnot všech nalezených prvků.
                     * - Pokud false, tak se předpokládá, že pro dannou vrstvu mají všechny prvky stejné hodnoty tohoto atributu, tudíž se zobrazují pouze hodnoty z prvního nalezeného prvku.
                     */
                    isUnique: boolean;
                }>;
            }>;
            domains: {
                [key: keyof IMetadataDbValue['translations']]: {
                    [key: string]: {
                        [key: string]: string;
                    }
                }
            }
        };

        type IMetadataTreeStructureItem<T extends "children" | "value" | "administration" = "children" | "value" | "administration"> = {
            title: keyof IMetadataDbValue['translations'][string];
        } & (
            T extends "children" ? {
                children: IMetadataDbValue['treeStructure'];
            } :
            T extends "value" ? {
                value: string;
                default?: keyof IMetadataDbValue['translations'][string];
                wrappedInHtml?: boolean;
                domain?: keyof IMetadataDbValue['domains'][string][string];
                isDate?: boolean;
                isArray: Array<string>;
            } :
            T extends "administration" ? {
                /** - Zobrazení správy dat v tabulkách {@link IMetadataDbValue.administrationTables}. */
                type: "administration";
            } : any
        );
        //#endregion END - Metadata

        /** - Interface hodnoty v databázovém registru pod klíčem {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.CoordinateConversion}. */
        interface ICoordinateConversionDbValue {
            /** - Druhy převodů geometrie. */
            geometryConversion: Array<{
                /** - Titulek převodu. */
                title: string;
            } & (Pick<__esri.geometryServiceToGeoCoordinateStringParams, "conversionMode" | "conversionType" | "numOfDigits" | "addSpaces" | "rounding"> & {
                /**
                 * - Typ převodu (pomocí funkce "toGeoCoordinateString").
                 * - [Read more...](https://developers.arcgis.com/javascript/latest/api-reference/esri-rest-geometryService.html#toGeoCoordinateString)
                 */
                type: "convert";
                /**
                 * - Souřadnicový systém na který se převádí.
                 * - Pokud není definováno, tak použije souřadnicový systém mapy.
                 */
                spatialReference: __esri.SpatialReferenceProperties;
            } | {
                /**
                 * - Typ převodu (pomocí funkce "project").
                 * - [Read more...](https://developers.arcgis.com/javascript/latest/api-reference/esri-rest-geometryService.html#project)
                 */
                type: "project";
                /** - Souřadnicový systém na který se převádí. */
                spatialReference: __esri.SpatialReferenceProperties;
                /** - Počet desetinných míst na které chceme zaoktouhlit. */
                numOfDigits: number;
            } | {
                /**
                 * - Typ převodu (pomocí ČÚZK služby pro transformaci souřadnic mezi SRS S-JTSK, ETRS89 a WGS84).
                 * - [Read more...](https://ags.cuzk.cz/arcgis2/rest/services/Transformacni/TransformaceSouradnic/GPServer/TransformaceSouradnic/)
                 */
                type: "cuzk",
                /** - Souřadnicový systém na který se převádí. */
                spatialReference: __esri.SpatialReferenceProperties;
            })>;
            /**
             * - Url adresa služeb pro práci s geometrií.
             * - Pokud není zadáno, tak se použije {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.GeometryServiceUrl}.
             */
            geometryServiceUrl: string;
        };

        /** - Interface hodnoty v databázovém registru pod klíčem {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.Basemaps}. */
        interface IBasemapsDbValue {
            /** - Nastavení podkladových map uložené pod unikátním klíčem. */
            [key: string]: Array<{
                /**
                 * - Url náhledu podkladové mapy. 
                 * - Pokud není definováno, tak se použije výchozí.
                 */
                thumbnailUrl?: string;
                /** - Má se k dotazu pro náhled podkladové mapy přidat token?. */
                useToken?: boolean;
                /**
                 * - Název podkladové mapy- 
                 * - Pokud není definováno, tak se použije výchozí.
                 */
                title?: string;
                /** - Souřadnicový systém, ve kterém se má zobrazovat podkladová mapa. */
                spatialReference?: __esri.SpatialReferenceProperties;
            } & (
                {
                    /** - Vytvoření podkladové mapy z mapové služby. */
                    type: "mapImageLayer";
                    /** - URL mapové služby. */
                    url: string;
                    /** - Má se v podkladové ignorovat měřítkové omezení? */
                    ignoreScales?: boolean;
                } | {
                    /** - Vytvoření podkladové mapy z položky v portálu. */
                    type: "portalItem";
                    /** - Identifikátor položky v portálu. */
                    id?: string;
                    /** - URL položky v portálu. */
                    url?: string;
                } | {
                    /** - Přepsání parametrů původní podkladové mapy. */
                    type: "default";
                } | {
                    /** - Vytvoření podkladové mapy z image služby. */
                    type: "ImageryLayer";
                    /** - Má se v podkladové ignorovat měřítkové omezení? */
                    ignoreScales?: boolean;
                    /** - URL image služby. */
                    url: string;
                } | {
                    /** - Vytvoření podkladové mapy z WMS služby. */
                    type: "WMS";
                    /** - URL WMS služby. */
                    url: string;
                } | {
                    /** - Vytvoření podkladové mapy z WMTS služby. */
                    type: "WMTS";
                    /** - URL WMTS služby. */
                    url: string;
                }
            )>;
        };

        /** - Interface hodnoty v databázovém registru pod klíčem {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.GeometryProvider}. */
        interface IGeometryProviderDbValue {
            /** - Vrstvy, ve kterých se vyhledává geometrie pro negrafické prvky. */
            geometryProviders: Array<IGeometryProvider>;
        };

        
        /** - Interface hodnoty v databázovém registru pod klíčem {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.ContingentValues}. */
        interface IContingentValuesDbValue {
            /** - Mapové služby, ve kterých je omezení číselníků. */
            mapServices: Array<ILayerDefinition & {
                /** - Vrstvy v rámci mapové služby, ve kterých je omezení číselníků. */
                layers: Array<{
                    /** - Identifikátor vrstvy v rámci mapové služby, ve které je omezení číselníků. */
                    layerId: number;
                    /**
                     * - Omezení číselníků v této vrstvě pomocí "Contingent Values".
                     * - Atributy, které jsou již omezeny podle vrstvy, nebuou omezovány podle "Contingent Values".
                     */
                    contingentValueDefinitions: Array<CodedValuesHandler.IContingentValueDefinition>;
                    /** - Omezení číselníků v této vrstvě pomocí jiné vstvy. */
                    dependencyLayers: Array<CodedValuesHandler.IDependencyLayerDefinition>;
                }>;
            }>;
        };

        
        /** - Interface hodnoty v databázovém registru pod klíčem {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.Attachments}. */
        interface IAttachmentsDbValue {
            /** - Nastavení kontextového menu podvrstev. */
            sublayers: Array<{
                /** - Identifikace podvrstvy. */
                layer: ISublayerDefinition;
                /** - Název atributu, ve kterém je uložen identifikátor hlavního souboru. */
                attribute: string;
            }>;
            /** - Nastavení kontextového menu tabulek (negrafických vrstev). */
            tables: Array<{
                /** - Identifikace podvrstvy. */
                layer: ITableDefinition;
                /** - Název atributu, ve kterém je uložen identifikátor hlavního souboru. */
                attribute: string;
            }>;
        };

        //#region - AttributeTableLayers
        /** - Interface hodnoty v databázovém registru pod klíčem {@link import("./enums/EDbRegistryKeys").EDbRegistryKeys.AttributeTableLayers}. */
        interface IAttributeTableLayersDbValue {
            /** - Podvrstvy, které se zobrazují v atributové tabulce. */
            sublayers: Array<ISublayerDefinition & {
                /** - Výchozí nastavení viditelnosti sloupců v tabulce. */
                visibleFields?: Array<string>;
                /** - Atributy, které chceme filtrovat jako text, přestože mají doméhové hodnoty. */
                textDomains?: Array<string>;
                /** - Názvy sloupců, které nelze zobrazit v tabulce. */
                hiddenFields?: Array<string>;
                /**
                 * - Názvy sloupců, před které chceme při exportu do CSV přidat znaménko '='.
                 * - Je to potřeba např. u podlaží, protože pokud se exportuje hodnota "02", tak se v excelu zobrazuje 2, ="02" zachová požadované zobrazení 02.
                 */
                prefixEqualSignAttributes?: Array<string>;
            }>;
            /** - Negrafické vrstvy (tabulky), které se zobrazují v atributové tabulce. */
            tables: Array<ITableDefinition & Pick<IAttributeTableLayersDbValue['sublayers'][0], "visibleFields" | "textDomains" | "hiddenFields" | "prefixEqualSignAttributes">>;
            /** - Nastavení reportů pro jednotlivé vrstvy. */
            reports: Array<(ISublayerDefinition | ITableDefinition) & {
                /** - Reporty, které jdou z této vrtsvy vyvolat. */
                reports: Array<IAttributeTableLayersDbValueReport>;
            }>;
        }
        
        /** - Konfigurace reportu v atributové tabulce. */
        interface IAttributeTableLayersDbValueReport extends Pick<ReportComponent.IWhereClauseReportProps, "fileName" | "reportServiceUrl" | "templateName"> {
            /**
             * - Název reportu který se zobrazí v kontextovém menu.
             * - Pokud není definováno, tak se použije {@link templateName}.
             */
            label: string;
        }
        //#endregion

        //#region - RelationshipQueries
        /** - Interface hodnoty v databázovém registru pod klíčem {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.RelationshipQueries}. */
        interface IRelationshipQueriesDbValue {
            /** - Definice atributních relačních tříd. */
            attributeRelationships: Array<IAttributeRelationship>;
        };

        interface IAttributeRelationship {
            /** - Kardinalita relace. */
            cardinality: "OneToOne" | "OneToMany" | "ManyToMany";
            originPrimaryKey: string;
            originForeignKey: string;
            destinationPrimaryKey: string;
            destinationForeignKey: string;
            /* - Název vazební tabulky, pokud jde o relaci M:M. */
            joinTableName?: string;
            /** - Jednoznačný technologický identifikátor relační třídy - definuje správce. */
            id: string;
            /* - Definice podvrstvy v roli origin. */
            originLayer: ISublayerDefinition | ITableDefinition;
            /* - Definice podvrstvy v roli destination. */
            destinationLayer: ISublayerDefinition | ITableDefinition;
            /* - Titulek pro cestu origin - destination */
            forwardLabel: string;
            /* - Titulek pro cestu destination - origin */
            backwardLabel: string;
        };
        //#endregion END - RelationshipQueries

        //#region - SelectionContextMenu
        /** - Interface hodnoty v databázovém registru pod klíčem {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.SelectionContextMenu}. */
        interface ISelectionContextMenuDbValue {
            /** - Nastavení kontextového menu mapových služeb. */
            layers: Array<ILayerDefinition & {
                /** - Nastavení kontextového menu podvrstev. */
                sublayers: Array<{
                    /** - Identifikátor podvrstvy v rámci mapové služby. */
                    layerId: number;
                    /** - Nastavení akcí v kontextovém menu nad prvky z této vrstvy. */
                    actions: Array<IContextMenuAction>;
                }>;
            }>
        }

        /** - Interface akce, kterou lze vyvolat v kontextové nabídce nad prvkem ve výběru. */
        type IContextMenuAction<K extends import("./enums/EContextMenuKeys").EContextMenuKeys = import("./enums/EContextMenuKeys").EContextMenuKeys> = K extends import("./enums/EContextMenuKeys").EContextMenuKeys.CreateRelation ? ICreateRelationContextMenu : K extends import("./enums/EContextMenuKeys").EContextMenuKeys.ReviewDate ? IReviewDateContextMenu : K extends import("./enums/EContextMenuKeys").EContextMenuKeys.RouteHighlight ? IRouteHighlightContextMenu : K extends import("./enums/EContextMenuKeys").EContextMenuKeys.RemoveRelation ? IRemoveRelationContextMenu : K extends import("./enums/EContextMenuKeys").EContextMenuKeys.GenerateProtocol ? IProtocolContexMenu : never;

        /** - Interface akce pro vytvoření relací mezi objekty.*/
        interface ICreateRelationContextMenu extends IContextMenuActionBase<import("./enums/EContextMenuKeys").EContextMenuKeys.CreateRelation> {
            /** - Kolekce identifikátorů relačních tříd, které lze k prvku připojit. */
            allowedRelations?: Array<string>;
        };

        /** - Interface akce pro odebrání relací mezi objekty.*/
        interface IRemoveRelationContextMenu extends IContextMenuActionBase<import("./enums/EContextMenuKeys").EContextMenuKeys.RemoveRelation> {
            /** - Kolekce identifikátorů relačních tříd, které lze odebrat. */
            allowedRelations?: Array<string>;
        };

        /** - Interface akce pro vyplnění data revize.*/
        interface IReviewDateContextMenu extends IContextMenuActionBase<import("./enums/EContextMenuKeys").EContextMenuKeys.ReviewDate> {
            /** - Název atributu, ve kterém se aktualizuje datum. */
            attributeName: string;
        };

        /** - Interface akce pro přidání trasy do výběru.*/
        interface IRouteHighlightContextMenu extends IContextMenuActionBase<import("./enums/EContextMenuKeys").EContextMenuKeys.RouteHighlight> {
            /** - Atribut obsahující identifikátor prvku, nad kterým se vyvolala tato akce, podle kterého se budou vyhledávat prvky ve {@link highVoltageLayer vrstvě Silnoproud trasy}. */
            cableAttribute: string;
            /** - Vrstva Silnoproud trasy, ve které se vyhledají prvky, podle kterých se dohledají prvky ve {@link lowVoltageLayer vrstvě Slaboproud trasy}. */
            highVoltageLayer: ISublayerDefinition | ITableDefinition;
            /** - Vrstva Slaboproud trasy, ve které se vyhledají prvky, které se přidají do výběru. */
            lowVoltageLayer: ISublayerDefinition | ITableDefinition;
            /** - Atribut obsahující identifikátor prvků, z vrstvy {@link lowVoltageLayer Slaboproud trasy}, podle kterého se prvky vyhledávají. */
            lowVoltageAttribute: string;
            /** - Atribut, který obsahuje identifikátor prvku nad kterým se vyvolala tato akce, podle kterého se vyhledávají prvky {@link highVoltageLayer Silnoproud trasy}. */
            highVoltageCableAttribute: string;
            /** - Atribut, který obsahuje identifikátor prvku z vrstvy {@link lowVoltageLayer Slaboproud trasy}. */
            highVoltageSearchAttribute: string;
        };

        interface IProtocolContexMenu extends IContextMenuActionBase<import("./enums/EContextMenuKeys").EContextMenuKeys.GenerateProtocol> {
            /** - URL adresa služby pro vytvoření PDF souboru s protokolem. */
            reportServiceUrl: string;
            /** - Negrafická vstva, ve které se pro tuto vrstvu vytváří protokol. */
            reportTable: ITableDefinition;
            /**
             * - Pole pro vytvoření protokolu.
             * - Pokud zde nebudou nějaká povinná (v datovém modelu nejsou "nullable") pole, tak se automaticky doplní na konec.
             */
            fields: Array<IProtocolField>;
            /**
             * - Vzor podle kterého se vytváří název souboru.
             * @example "{C_TYP}_{CISLO}"
             */
            fileNameTemplate: string;
        };

        interface IContextMenuActionBase<K extends import("./enums/EContextMenuKeys").EContextMenuKeys = import("./enums/EContextMenuKeys").EContextMenuKeys> {
            /** - Identifikátor akce. */
            key: K;
            /** - Je tato akce povolena? */
            enabled: boolean;
        };

        interface IProtocolField {
            /** - Název pole. */
            fieldName: string;
            /**
             * - Musí {@link fieldName toto pole} být vyplněné, aby šel vytvořit protokol?
             * - Pokud je hodnota false, ale v datovém modelu {@link fieldName pole} není "nullable", tak se i tak považuje za povinné.
             */
            required: boolean;
            /**
             * - Hodnoty podle kterých se určuje jaký protokol se vygeneruje.
             * - Pouze pokud se podle hodnoty tohoto pole určuje protokol.
             * - Mělo by být vyplněno pouze pro jedno pole. Pokud je vyplněno pro více polí, tak se bude zohledňovat první pole.
             */
            reportOptions?: Array<{
                /** - Hodnota pro kterou se použije reportName. */
                value: string | number;
                /** - Název souboru s reportem, který se použije pokud je vybraná tato hodnota. */
                reportName: string;
            }>;
            /** - Atribut z prvku na kterém se vyvolala kontextová nabídka, jehož hodnotou se naplní {@link fieldName toto pole}. */
            relateAttribute?: string;
            /** - Je {@link fieldName toto pole} editovatelné? */
            editable: boolean;
            /** - Má se {@link fieldName toto pole} naplnit přihlášeným uživatelem? */
            currentUser: boolean;
            /**
             * - Definice tabulky pro zjištění identifikátoru přihlášeného uživatele, kterým se naplní {@link fieldName toto pole}.
             * - Pouze pokud je {@link currentUser} rovno true.
             */
            loginTableDefinition: ITableDefinition & {
                /** - Atribut, podle kterého se vyhledává přihlášený uživatel. */
                userNameAttribute: string;
                /** - Atribut, ve kteréme je identifikátor uživatele shodující se s doménovou hodnotou {@link fieldName tohoto pole}. */
                userIdAttribute: string;
            };
        };
        //#endregion END - SelectionContextMenu

        //#region - Editability
        /** - Interface hodnoty v databázovém registru pod klíčem {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.Editability}. */
        interface IEditabilityDbValue {
            /**
             * - Kolekce infomací o editovatelnosti podvrstev a negrafických vrstev jednotlivých mapových služeb.
             * - Podvrstvy a negrafické vrstvy mapové služby, která v kolekci chybí, se považují za needitovatelné a všechny jejich atributy za viditelné.
             */
            layerInfos: Array<IServiceLayerEditabilityConfiguration>;
            /** - Barva zvíraznění editované geometrie. */
            geometryColor: string;
            /** - Velikost editované bodové geometrie. */
            pointSize: number;
            /**
             * - Chceme aby se prvkům zobrazovala záložka s přílohami?
             * - Na prvek se aplikuje pokud není nastaveno jinak v {@link ISublayerEditabilityConfiguration.displayAttachments nastavení konkrétní vrstvy}.
             */
            displayAttachmentsByDefault: boolean;
            /**
             * - Atributy nad kterými je možno aplikovat "Attribute rules".
             * - Na prvky se aplikuje pokud není nastaveno jinak v {@link ISublayerEditabilityConfiguration.attributeRulesAttributes nastavení konkrétní vrstvy}.
             */
            attributeRulesAttributes: Array<string>;
        };

        interface IServiceLayerEditabilityConfiguration {
            /** - Název mapové služby. */
            serviceLayer: string;
            /* - Název mapy z mapové služby. */
            mapName: string;
            /**
             * - Kolekce informací o editovatelnosti podvrstev.
             * - Podvrstva, která v této kolekci není, se považuje za needitovatelnou a všechny její atributy jsou viditelné.
             */
            sublayerInfos: Array<ISublayerEditabilityConfiguration>;
            /**
             * - Kolekce informací o editovatelnosti negrafických vrstev.
             * - Vrstva, která v této kolekci není, se považuje za needitovatelnou a všechny její atributy jsou viditelné.
             */
            tableInfos: Array<ITableEditabilityConfiguration>;
        };

        interface ITableEditabilityConfiguration extends Pick<ISublayerEditabilityConfiguration, "fieldInfos" | "allowUpdate" | "allowDefineMainAttachment" | "allowAddAttachment" | "allowDeleteAttachment" | "displayAttachments" | "updateCondition" | "allowDelete" | "allowMassUpdate" | "attributeRulesAttributes" | "allowAttributeRules" | "allowMassDelete"> {
            /** - Identifikátor vrstvy. */
            tableId: number;
        };

        interface ISublayerEditabilityConfiguration {
            /** - Identifikátor podvrstvy. */
            sublayerId: number;
            /** - Je povolená editovatelnost geometrie? */
            allowGeometryUpdate: boolean;
            /** - Je povolená editovatelnost atributů? */
            allowUpdate: boolean;
            /** - Je povolená hromadná editovatelnost atributů (více prvků současně)? */
            allowMassUpdate: boolean;
            /** - Je povoleno prvky ve vrstvě smazat? */
            allowDelete: boolean;
            /** - Je povoleno definovat soubor, který se zobrazuje v pop-upu? */
            allowDefineMainAttachment: boolean;
            /** - Je povoleno přidat soubor do prvku? */
            allowAddAttachment: boolean;
            /** - Je povoleno odebrat soubor z prvku? */
            allowDeleteAttachment: boolean;
            /** - Chceme pro tuto podvrstvu zobrazit záložku s přílohomi? */
            displayAttachments: boolean;
            /** - Je nad vrstvou možno aplikovat "Attribute rules"? */
            allowAttributeRules: boolean;
            /** - Je povoleno pvrky hromadně mazat? */
            allowMassDelete: boolean;
            /**
             * - Atributy nad kterými je možno aplikovat "Attribute rules".
             * - Platné pouze pokud {@link allowAttributeRules je aplikace povolena}.
             */
            attributeRulesAttributes?: Array<string>;
            /**
             * - Kolekce informací o editovatelnosti atributů.
             * - Pokud atribut v této kolekci není, považuje se za viditelný a needitovatelný.
             */
            fieldInfos?: Array<IFieldEditabilityConfiguration>;
            /**
             * - Podmínky, které musí prvek splňovat, aby byly jeho atributy editovatelné.
             * - Pouze pokud je hodnota {@link allowUpdate} true.
             */
            updateCondition?: Array<IFeatureMustNotExistUpdateCondition>;
        };

        interface IFieldEditabilityConfiguration {
            /** - Název atributu. */
            fieldName: string;
            /**
             * - Je atribut editovatelný?
             * - Výchozí hodnota je 'false'.
             */
            isEditable?: boolean;
            /** 
             * - Je atribut viditelný?
             * - Výchozí hodnota je 'true'.
             */
            visible?: boolean;
            /**
             * - Je atribut povinný?
             * - Výchozí hodnota je 'false'.
             */
            isRequired?: true;
            /**
             * - Definice prostrorového dotazu, podle kterého lze filtrovat povolené hodnoty pro {@link fieldName tento atribut}.
             * - Relevantní pouze pro doménové hodnoty grafické třídy prvků.
             */
            spatialFilter?: {
                /** - Je povolené pro {@link fieldName tento atribut} filtrovat hodnoty prostorovým dotazem? */
                allowed: boolean;
                /** Výchozí velikost obalové zóny pro prostorový dotaz filtrace v metrech. */
                defaulBuffer?: number;
                /** - Má se při filtraci prvků zohledňovat podlaží? */
                floor?: boolean;
                /** - Grafická vrstva do které se provádí prostorový dotaz filtrující povolené hodnoty. */
                layer: { 
                    /** - Název atributu, jehož hodnoty odpovídají kódům v doméně {@link fieldName filtrovaného atributu}. */
                    codeAttribute: string;
                } & ISublayerDefinition;
            };
        };

        interface IFeatureMustNotExistUpdateCondition {
            /**
             * - Typ podmínky.
             * - Prvek bude editovatelný, pouze pokud vrstva {@link conditionLayerId} nebude obsahovat prvek, s hodnotou atributu {@link conditionAttribute} rovnajicí se hodnotě atributu {@link attribute} v editovaném prvku.
             */
            type: "feature-must-not-exist";
            /** - Atribut prvku, jehož editovatelnost zjišťujeme. */
            attribute: string;
            /**
             * - ID vrstvy, ve které ověřujeme, za existuje hledaný prvek.
             * - Vrstva musí být ze stejné mapové služby jako editovaný prvek.
             */
            conditionLayerId: number;
            /** - Atribut, podle kterého hledámě prvek. */
            conditionAttribute: string;
            /** - Zpráva o tom, že prvek není editovatelný, která se zobrazí uživateli. */
            message: string;
        };
        //#endregion END - Editability

        
        /** - Interface hodnoty v databázovém registru pod klíčem {@link import("./enums/ESelectionActionKeys").EDbRegistryKeys.AttributeTableLayers}. */
        interface IAttributeTableLayersDbValue {
            /** - Podvrstvy, které se zobrazují v atributové tabulce. */
            sublayers: Array<ISublayerDefinition & {
                /** - Výchozí nastavení viditelnosti sloupců v tabulce. */
                visibleFields?: Array<string>;
                /** - Atributy, které chceme filtrovat jako text, přestože mají doméhové hodnoty. */
                textDomains?: Array<string>;
                /** - Názvy sloupců, které nelze zobrazit v tabulce. */
                hiddenFields?: Array<string>;
                /**
                 * - Názvy sloupců, před které chceme při exportu do CSV přidat znaménko '='.
                 * - Je to potřeba např. u podlaží, protože pokud se exportuje hodnota "02", tak se v excelu zobrazuje 2, ="02" zachová požadované zobrazení 02.
                 */
                prefixEqualSignAttributes?: Array<string>;
            }>;
            /** - Negrafické vrstvy (tabulky), které se zobrazují v atributové tabulce. */
            tables: Array<ITableDefinition & Pick<IAttributeTableLayersDbValue['sublayers'][0], "visibleFields" | "textDomains" | "hiddenFields" | "prefixEqualSignAttributes">>;
        };
    };

    namespace SelectFilter {
        interface ISelectFilterProps {
            /** - Vlastnosti číselníku. */
            selectProps: import("jimu-ui").SelectProps;
            /** - Volby v číselníku. */
            options: Array<ISelectFilterOption | ISelectNotValueOption>;
            /** - Velikost filtračního pole. */
            filterSize?: import("jimu-ui").TextInputProps["size"];
            /** - Možnost vybrat výce hodnot. */
            multiple?: false;
            /** - Možnot vybrat hondotu null (přídání prázdné možnosti)?. */
            nullable?: boolean;
            /** - Komponenty, které se zobrazí ve vrchní části číleníku. */
            prefixElements?: JSX.Element | Array<JSX.Element>;
            /** - Má se zobrazit komponenta značící načítání obsahu číselníku? */
            loading?: boolean;
        };

        interface IMultiSelectFilterProps extends Pick<ISelectFilterProps, "filterSize" | "options" | "prefixElements" | "loading"> {
            /** - Vlastnosti číselníku. */
            selectProps: Omit<import("jimu-ui").MultiSelectProps, "items">;
            /** - Možnost vybrat výce hodnot. */
            multiple: true;
            /** - Možnot vybrat hondotu null (přídání prázdné možnosti)?. */
            nullable?: false;
        };
        
        interface ISelectFilterOption {
            /** - Unikátní klíč volby. */
            value: string | number;
            /**
             * - Hodnota volby, podle které se filtruje.
             * - Pokud není definováno {@link display}, tak se zobrazuje uživateli.
             */
            label: string;
            /** - Hodnota volby, která se zobrazuje uživateli. */
            display?: string | JSX.Element;
        };
        
        interface ISelectNotValueOption extends Pick<import("jimu-ui").SelectOptionProps, "divider" | "header" | "key">,  Partial<Pick<ISelectFilterOption, "label" | "value">> {}
    };

    namespace Feature {
        interface IFeatureValueOptions {
            intl: import("jimu-core").IntlShape;
            /** - Má se hodnota formátovat podle šablony popupu? */
            popupFormat?: boolean;
            /** - Funkce, která se volá při načtení metadat, nebo nástrojů potřebných ke správnému formátování (např. aby mohlo dojít k rerenderu). */
            onLoad?(): void;
        }
        
        interface IDisplayFeatureOptions extends Pick<IFeatureValueOptions, "intl"> {
            /** - Skupina prvků ze které prvek pochází. */
            featureSet?: __esri.FeatureSet;
            /** - Styl zobrazení. */
            style?: HSI.DisplayFeatureFormats;
            displayField?: string;
        }
        
            
        interface IUpdateGeometryRotationInfoValue {
            /** - Nová rotace symbologe. */
            currentValue: number;
        };

        interface IApplyEditsSoeBody {
            deletes?: Array<Pick<IApplyEditsSoeBody['edits']['updates'][number], "table" | "objectId">>;
            updates?: Array<{
                table: string;
                attributes: IFeatureJson['attributes'];
                objectId: number;
            }>;
            adds?: Array<Pick<IApplyEditsSoeBody['edits']['updates'][number], "table" | "attributes">>;
        }

        
        /** - Parametry vyhledávání z URL, podle kterých se vyhledávají prvky. */
        type ISelectUrlQuery = ISelectUrlQueryWhere | ISelectUrlQueryFeature;

        interface ISelectUrlQueryBase {
            /** - Identifikátor vrstvy, unikátní v mapové služby {@link mapServiceName}. */
            layerId: number;
            /** - Název mapové služby. */
            mapServiceName?: string;
            /**
             * - URL, nebo název na IIS, aplikace v které chceme prvky zobrazit.
             * - Relevantní pouze pokud se proklik provádí přes aplikaci obsahující widget "Redirector".
             */
            appUrl?: string;
        };

        interface ISelectUrlQueryFeature extends ISelectUrlQueryBase {
            /**
             * - Unikátní (v rámci podvrstvy {@link ILetGisSelectUrlQuery.layerId}) identifikátor prvku.
             * - Jedná se o atribut, který je definován v konfiguraci v DB registrech.
             * - V tomto případě se vyhledá pouze jeden prvek.
             */
            featureId: number;
        };

        interface ISelectUrlQueryWhere extends ISelectUrlQueryBase {
            /** - Podmínka vyhledávání. */
            where: string;
        };
    }

    namespace FloorHelper {
        interface IFloorValues {
            /** - Hodnota aktivních podlaží pod identifikátorem druhu podlaží (podlaží, úroveň ploch, atd...).  */
            [key: string]: string | number;
        }
    }

    namespace CodedValuesHandler {
        interface ICodedValuesStateBase<T extends import("./enums/ELoadStatus").ELoadStatus | "no-filter"> extends Pick<HSI.SelectFilter.ISelectFilterProps, "prefixElements"> {
            /** - Stav filtrace doménových hodnot. */
            loadStatus: T;
        }
        
        interface ICodedValuesStateSuccess extends ICodedValuesStateBase<import("./enums/ELoadStatus").ELoadStatus.Loaded> {
            /** - Vyfiltrované doménové hodnoty. */
            codedValues: Array<__esri.CodedValue>;
        }
        
        interface ICodedValuesErrorState extends ICodedValuesStateBase<import("./enums/ELoadStatus").ELoadStatus.Error> {
            /** - Chyba, která nastala při filtraci doménových hodnot. */
            error: Error;
        }

        interface IContingentValueDefinition {
            /** - Klíč omezení. */
            name: string;
            /**
             * - Názvy atributů v pořadí závislosti omezení.
             * @example ["attributeA", "attributeB"] => Možné hodntoy atributu "attributeB" budou omezeny v závislosti na hodnotě atributu "attributeA"
             */
            fieldOrder: Array<string>;
        };

        
    interface IDependencyLayerDefinition {
        /** - Atribut s číselníkem, který se bude omezovat. */
        attributeName: string;
        /** - Atribut podle jehož hodnoty se budou vyhledávat omezující prvky ve {@link layer vrstvě}. */
        dependencyAttributeName: string;
        /** - Atribut podle kterého se vyhledávají omezující prvky ve {@link layer vrstvě}. */
        dependencyLayerSearchAttributeName: string;
        /** - Vrstva ve které se vyhledávají omezující prvky, podle kterých se omezuje číselník. */
        layer: ISublayerDefinition | ITableDefinition;
        /** - Atribut kterým se podle omezujících prvků omezuje číselník. */
        dependencyLayerAttributeName: string;
        /**
         * - Where klauzule, které se uplatní pro vyhledání omezujících prvků, na základě hodnoty {@link dependencyAttributeName vyhledávacího atributu}.
         * - Pokud zde nebude nalezena hodnota {@link dependencyAttributeName vyhledávacího atributu}, tak se bude vhledávat podle této hodnoty.
         */
        whereClauses: Array<{
            /** - Hodnota {@link dependencyAttributeName vyhledávacího atributu}, při které se použije tato where klauzule pro vyhledání omezujících prvků. */
            value: any,
            /**
             * - Where klauzule.
             * - Klauzuje by měla obsahovat {0}, což bude nahrazeno atributem {@link dependencyLayerSearchAttributeName}.
             * @example "{0} IN ('P1', 'P2')"
             */
            whereClause: string;
        }>;
    };
        
        type ICodedValuesState = ICodedValuesStateSuccess | ICodedValuesErrorState | ICodedValuesStateBase<import("./enums/ELoadStatus").ELoadStatus.Pending | "no-filter">;        
    }

    namespace UseLandQueries {
        interface IQuery {
            Category: string;
            Description: string;
            DetailedDescription: string;
            IsReport: boolean;
            Name: string;
            Parameters: Array<IQueryParameter<IParameterType>>;
        }

        interface IQueryParameter<T extends IParameterType> {
            Caption: string;
            IsRequired: boolean;
            Name: string;
            Type: T;
            ChoiceValues: T extends "Choice" ? Array<IQueryParameterChoice> : undefined;
        }

        interface IQueryParameterChoice {
            Description: string;
            Value: number; 
        }

        interface IExecuteQueryResponse extends IExecuteQueryResponseBase<false> {
            ActionNames: Array<string>;
            DataRows: Array<{
                id: string;
                Values: Array<string>;
            }>;
            Fields: Array<{
                Caption: string;
            }>;
            IsSingleObjectView: boolean;
            TableViewTypeName: "ViewParcela" | "ViewBudova" | "ViewPronajPoz" | "TableViewPropertyBound" | "ViewParcelaInterni";
        }

        interface IExecuteQueryReportResponse extends IExecuteQueryResponseBase<true> {
            FileBase64: string;
            FileSize: number;
        }

        interface IExecuteQueryResponseBase<T extends boolean> {
            IsReport: T;
        }

        type IState = HSI.LoadingState.IState<{
            /** - Načtené dotazy. */
            queries: Array<IQuery>;
        }>;

        type IExecuteQueryState = LoadingState.IState<{
            /** - Výsledek dotazu. */
            response: IExecuteQueryResponse | IExecuteQueryReportResponse;
            /** - Parametry podle kterých byl vyhledán {@link response dotaz}. */
            queryParams: ILandSearchParams;
        }>;

        type IParameterType = "Choice" | "Text" | "Numeric";

        interface ILandSearchParams {
            /** - Dotaz do kterého se dotazujeme. */
            query?: IQuery;
            /** - Hodnoty parametrů {@link query dotazu}. */
            queryParametresValues?: {
                [name: string]: number | string;
            };
        };

        interface ILandSearchReturn {
            /** - Stav dotazu pozemku. */
            landSearchState: IExecuteQueryState | undefined;
            /** - Vyvolání {@link landSearchState dotazu}. */
            searchLand(params: ILandSearchParams): Promise<void>;
        }
    }

    namespace WarningContentComponent {
        interface ITitleProps {
            message?: string;
            title: string;
        }

        interface IMessageProps {
            message: string;
            title?: string;
        }

        type IProps = IMessageProps | ITitleProps;
    }

    namespace ArcGISJSAPIModuleLoader {
        /** - Názvy modulů v ArcGIS API for JavaScript. */
        export type IModuleName = "Graphic" | "Color" | "Polygon" | "Point" | "Multipoint" | "Polyline" | "geometryEngine" | "geometryEngineAsync" | "SimpleFillSymbol" | "SimpleLineSymbol" | "SimpleMarkerSymbol" | "TextSymbol" | "GraphicsLayer" | "SpatialReference" | "geometryService" | "Extent" | "request" | "IdentityManager" | "SketchViewModel" | "SnappingOptions" | "FeatureSnappingLayerSource" | "ButtonMenuItem" | "FeatureTable" | "config" | "BufferParameters" | "FeatureLayer" | "UniqueValueInfo" | "PictureMarkerSymbol" | "reactiveUtils" | "SimpleRenderer" | "Search" | "LayerSearchSource" | "LocatorSearchSource" | "FeatureTableViewModel" | "ActionButton" | "ServerInfo" | "OAuthInfo" | "Credential" | "BaseElevationLayer" | "ElevationLayer" | "CustomContent" | "ImageryLayer" | "Layer" | "RasterFunction" | "Basemap" | "BasemapGallery" | "MapImageLayer" | "TileLayer" | "ImageryTileLayer" | "WMSLayer" | "WMTSLayer" | "print" | "geoprocessor" | "WebMap" | "MapView" | "Compass" | "Home" | "ScaleBar" | "AreaMeasurement2D" | "DistanceMeasurement2D" | "AreaMeasurement2DViewModel" | "DistanceMeasurement2DViewModel" | "projection" | "Bookmarks" | "Viewpoint" | "Bookmark" | "Print" | "TileInfo" | "intl" | "FeatureSet" | "ProjectParameters" | "DataFile" | "GeoJSONLayer" | "Collection" | "Field" | "TableTemplate" | "Attachments" | "FieldColumnTemplate" | "Handles" | "Portal" | "PortalGroup" | "Map" | "symbolUtils" | "Sketch";

        export type IModule<T extends IModuleName> = T extends "Color" ? typeof __esri.Color : 
        T extends "Graphic" ? typeof __esri.Graphic :
        T extends "Polygon" ? typeof __esri.Polygon :
        T extends "Point" ? typeof __esri.Point :
        T extends "Multipoint" ? typeof __esri.Multipoint :
        T extends "Polyline" ? typeof __esri.Polyline :
        T extends "geometryEngine" ? __esri.geometryEngine :
        T extends "geometryEngineAsync" ? __esri.geometryEngineAsync :
        T extends "SimpleFillSymbol" ? typeof __esri.SimpleFillSymbol :
        T extends "SimpleLineSymbol" ? typeof __esri.SimpleLineSymbol :
        T extends "SimpleMarkerSymbol" ? typeof __esri.SimpleMarkerSymbol :
        T extends "TextSymbol" ? typeof __esri.TextSymbol :
        T extends "GraphicsLayer" ? typeof __esri.GraphicsLayer :
        T extends "SpatialReference" ? typeof __esri.SpatialReference :
        T extends "geometryService" ? __esri.geometryService :
        T extends "Extent" ? typeof __esri.Extent :
        T extends "request" ? __esri.request['esriRequest'] :
        T extends "IdentityManager" ? __esri.IdentityManager :
        T extends "SketchViewModel" ? typeof __esri.SketchViewModel :
        T extends "SnappingOptions" ? typeof __esri.SnappingOptions :
        T extends "FeatureSnappingLayerSource" ? typeof __esri.FeatureSnappingLayerSource :
        T extends "ButtonMenuItem" ? typeof __esri.ButtonMenuItem :
        T extends "FeatureTable" ? typeof __esri.FeatureTable :
        T extends "config" ? __esri.config :
        T extends "BufferParameters" ? typeof __esri.BufferParameters :
        T extends "FeatureLayer" ? typeof __esri.FeatureLayer :
        T extends "UniqueValueInfo" ? typeof __esri.UniqueValueInfo :
        T extends "PictureMarkerSymbol" ? typeof __esri.PictureMarkerSymbol :
        T extends "reactiveUtils" ? __esri.reactiveUtils :
        T extends "SimpleRenderer" ? typeof __esri.SimpleRenderer :
        T extends "Search" ? typeof __esri.widgetsSearch :
        T extends "LayerSearchSource" ? typeof __esri.LayerSearchSource :
        T extends "LocatorSearchSource" ? typeof __esri.LocatorSearchSource :
        T extends "FeatureTableViewModel" ? typeof __esri.FeatureTableViewModel :
        T extends "ActionButton" ? typeof __esri.ActionButton :
        T extends "ServerInfo" ? typeof __esri.ServerInfo :
        T extends "OAuthInfo" ? typeof __esri.OAuthInfo :
        T extends "Credential" ? typeof __esri.Credential :
        T extends "BaseElevationLayer" ? typeof __esri.BaseElevationLayer :
        T extends "ElevationLayer" ? typeof __esri.ElevationLayer :
        T extends "CustomContent" ? typeof __esri.CustomContent :
        T extends "ImageryLayer" ? typeof __esri.ImageryLayer :
        T extends "Layer" ? typeof __esri.Layer :
        T extends "RasterFunction" ? typeof __esri.RasterFunction :
        T extends "Basemap" ? typeof __esri.Basemap :
        T extends "BasemapGallery" ? typeof __esri.BasemapGallery :
        T extends "MapImageLayer" ? typeof __esri.MapImageLayer :
        T extends "TileLayer" ? typeof __esri.TileLayer :
        T extends "ImageryTileLayer" ? typeof __esri.ImageryTileLayer :
        T extends "WMSLayer" ? typeof __esri.WMSLayer :
        T extends "WMTSLayer" ? typeof __esri.WMTSLayer :
        T extends "print" ? __esri.print :
        T extends "geoprocessor" ? __esri.geoprocessor :
        T extends "WebMap" ? typeof __esri.WebMap :
        T extends "MapView" ? typeof __esri.MapView :
        T extends "Compass" ? typeof __esri.Compass :
        T extends "Home" ? typeof __esri.Home :
        T extends "ScaleBar" ? typeof __esri.ScaleBar :
        T extends "AreaMeasurement2D" ? typeof __esri.AreaMeasurement2D :
        T extends "DistanceMeasurement2D" ? typeof __esri.DistanceMeasurement2D :
        T extends "AreaMeasurement2DViewModel" ? typeof __esri.AreaMeasurement2DViewModel :
        T extends "DistanceMeasurement2DViewModel" ? typeof __esri.DistanceMeasurement2DViewModel :
        T extends "projection" ? __esri.projection :
        T extends "Bookmarks" ? typeof __esri.Bookmarks :
        T extends "Viewpoint" ? typeof __esri.Viewpoint :
        T extends "Bookmark" ? typeof __esri.Bookmark :
        T extends "Print" ? typeof __esri.Print :
        T extends "TileInfo" ? typeof __esri.TileInfo :
        T extends "intl" ? __esri.intl :
        T extends "FeatureSet" ? typeof __esri.FeatureSet :
        T extends "ProjectParameters" ? typeof __esri.ProjectParameters :
        T extends "DataFile" ? typeof __esri.DataFile :
        T extends "GeoJSONLayer" ? typeof __esri.GeoJSONLayer :
        T extends "Collection" ? typeof __esri.Collection :
        T extends "Field" ? typeof __esri.Field :
        T extends "TableTemplate" ? typeof __esri.TableTemplate :
        T extends "Attachments" ? typeof __esri.Attachments :
        T extends "FieldColumnTemplate" ? typeof __esri.FieldColumnTemplate :
        T extends "Handles" ? typeof __esri.Handles :
        T extends "Portal" ? typeof __esri.Portal :
        T extends "PortalGroup" ? typeof __esri.PortalGroup :
        T extends "Map" ? typeof __esri.Map :
        T extends "Sketch" ? typeof __esri.Sketch :
        T extends "symbolUtils" ? __esri.symbolUtils :
        never;
    }

    namespace RelationHelper {
        type IGetNotEvaluatedReachableRelationshipsResponse = Array<HSI.IGetReachableRelationshipsResponse['relationships'][number] & {
            /** - Druh prvku - grafický / negrafický (z tabulky). */
            featureType: import("./enums/EFeatureType").EFeatureType;
        }>;
        
        interface IGetEvaluatedReachableRelationshipsResponse {
            /** - Úspěšně vyhledané relační třídy. */
            success: Array<IGetNotEvaluatedReachableRelationshipsResponse[number] & {
                /** - Navazbené prvky v této relační třídě. */
                featureSet: __esri.FeatureSet;
            }>;
            /** - Chyby při vyhledávání relací. */
            errors: Array<IGetEvaluatedReachableRelationshipsError>;
        };
        
        interface IGetEvaluatedReachableRelationshipsError {
            /** - Chyby při vyhledávání relací. */
            error: Error;
            /** - Mapová služba ve které došlo k {@link error chybě}. */
            mapService: __esri.MapImageLayer;
        }

        /** - Odpověď dotazu pro navazbené prvky. */
        interface IGetRelatedObjectsResponse {
            /* Id vstupní (zpracovavané) relační třídy */
            relationshipClassId: string;
            /** - Předaný identifikátor podvrstvy. */
            layer: ISublayerDefinition;
            /** - Předaný prvek. */
            feature: IFeatureJson;
            /** - Získané navazbené objekty. */
            relatedObjects: {
                /** - Identifikátor podvrstvy. */
                layer: ISublayerDefinition | ITableDefinition;
                /** - Získané objekty. */
                features: Array<IFeatureJson>;
            };
        };

        interface IGetReachableRelationshipsResponse<E extends boolean = false> {
            /** - Předaný identifikátor podvrstvy. */
            layer: ISublayerDefinition | ITableDefinition;
            /** - Nalezené relační třídy. */
            relationships: Array<{
                /**
                 * - Jednoznačný technologický identifikátor relační třídy
                 * - Definuje správce.
                 */
                id: string;
                /** Uživatelský titulek relace pro UI. */
                label: string;
                /** - Cílová podvrstva relace. */
                layer: ISublayerDefinition;
                /** - True, pokud je vstupní objekt dotazu v dané relační třídě v roli origin, jinak false. */
                forward: boolean;
                /**
                 * - Interní typ relační třídy.
                 * - @see {@link https://hsi0916.atlassian.net/wiki/spaces/CETINWGIS/pages/2829352969/Vlastn+implementace+rela+n+ch+t+d#Typy-relac%C3%AD}
                 */
                type: import("widgets/shared-code/enums").ERelationshipType;
                features?: E extends true ? Array<IFeatureJson> : never;
            }>;
        };
    }

    //#region - Extensions
    namespace NotificationStore {
        type IAlertProps = IAlertPropsWithTitle | IAlertPropsWithMessage;

        interface IAlertPropsWithTitle extends Pick<Required<IAlertPropsWithMessage>, "id" | "title" | "type">, Pick<Partial<IAlertPropsWithMessage>, "message"> {
        }

        interface IAlertPropsWithMessage {
            /** - Type notifikace. */
            type: "success" | "info" | "warning" | "error";
            /** - Titulek notifikace. */
            title?: string;
            /** - Obsah notifikace. */
            message: string | JSX.Element;
            /** - Identifikátor notifikace. */
            id: number;
        }
        
        interface IAddNotificationAction extends INotificationActionBase<ENotificationActionKeys.Add> {
            /** - Parametry notifikace. */
            alertProps: Omit<IAlertProps, "id">;
        };
        
        interface IInitNotificationAction extends INotificationActionBase<ENotificationActionKeys.Init> {
            /** - Id widgetu, který zobrazuje notifikace. */
            widgetId: string;
        };
        
        interface ICloseNotificationAction extends INotificationActionBase<ENotificationActionKeys.Close> {
            /** - Identifikátor notifikace, kterou chceme zavřít. */
            alertId: number;
        };

        interface INotificationActionBase<T extends ENotificationActionKeys> {
            /** - Typ změny state. */
            type: T;
        }
    }

    namespace FirstRenderHandlerStore {
        interface IRegisterHandlerAction {
            /** - Id widgetu, který se o akci stará. */
            widgetId: string;
            /** - Název akce o kterou se widget stará. */
            actionName: keyof IState;
            /** - Identifikátor podle kterého redux rozezná správný store. */
            type: "register-first-render-handler"
        }
        
        interface IState {
            /**
             * - Id widgetu, který se stará o přečtení url parametrů, podle kterých vyvolá požadované akce.
             * @see {@link HSI.WidgetWrapper.IOptionProps.urlParser}
             */
            urlParser: string;
            /** - Id widgetu, který se stará o zrušení časového limitu esri dotazů. */
            requestTimeout: string;
            /** - Id widgetu, který se stará o zobrazení geometrie vývěru v mapě. */
            drawSelection: string;
            /**
             * @todo - Komentář + spojit s {@link drawSelection}.
             */
            selectionHandler: string;
            /** - Id widgetu, který se stará o obnovu tokenu v esri requestu. */
            tokenRefresh: string;
            /** - Id widgetu, který se stará zabránění (mazání) standardních výběrů. */
            disebleSelection: string;
            /** - Id widgetu, který při startu aplikace aplikuje záložku (widget "UserSettings") s názvem "Start". */
            startBookmark: string;
            /** - Id widgetu, který kontroluje dostupnost vrstev ve webové mapě a v případě nedostupnosti je odebere a zobrazí notifikaci uživateli. */
            checkLayersAccessibility: string;
        };

        type IMState = import("jimu-core").ImmutableObject<IState>
    }

    namespace SelectionStore {
        type ISelectionStartAction = {
            /** - Typ změny state. */
            type: import("./enums/ESelectionActionKeys").ESelectionActionKeys.SelectionStart;
            /** - Identifikátor skupiny výběru. */
            selectionSetKey: string;
            /** - Vrstvy ve kterých probíhá výběr. */
            sublayers: Array<__esri.Sublayer>;
            /** - Chceme odebrat dosavadní výběry? */
            dropSelection?: boolean;
        };
        
        type ISelectionEndAction = {
            /** - Typ změny state. */
            type: import("./enums/ESelectionActionKeys").ESelectionActionKeys.SelectionEnd;
            /** - Podvrstva ve které skončil výběr. */
            sublayer: __esri.Sublayer;
            /** - Identifikátor skupiny výběru. */
            selectionSetKey: string;
            /** - Identifikátor skupiny výběru podvrstvy pod kterým je skupina uložena v "MutableStoreManager". */
            featureSetId: string;
        };
        
        type ISelectionFailAction = {
            /** - Typ změny state. */
            type: import("./enums/ESelectionActionKeys").ESelectionActionKeys.SelectionFail;
            /** - Podvrstva ve které skončil výběr. */
            sublayer: __esri.Sublayer;
            /** - Identifikátor skupiny výběru. */
            selectionSetKey: string;
            /** - Chyba, která nastala pří výběru. */
            error: Error;
        };
        
        type ITableSelectionStartAction = Pick<ISelectionStartAction, "dropSelection" | "selectionSetKey"> & {
            /** - Typ změny state. */
            type: import("./enums/ESelectionActionKeys").ESelectionActionKeys.TableSelectionStart;
            /** - Negrafické vrstvy (tabulky) ve kterých probíhá výběr. */
            tables: Array<__esri.FeatureLayer>;
        };
        
        type ITableSelectionEndAction = Pick<ISelectionEndAction, "featureSetId" | "selectionSetKey"> & {
            /** - Typ změny state. */
            type: import("./enums/ESelectionActionKeys").ESelectionActionKeys.TableSelectionEnd;
            /** - Negrafická vrstva (tabulka) ve které skončil výběr. */
            table: __esri.FeatureLayer;
        };
        
        type ITableSelectionFailAction = Pick<ISelectionFailAction, "error" | "selectionSetKey"> & {
            /** - Typ změny state. */
            type: import("./enums/ESelectionActionKeys").ESelectionActionKeys.TableSelectionFail;
            /** - Negrafická vrstva (tabulka) ve které skončil výběr. */
            table: __esri.FeatureLayer;
        };
        
        type IDropSelectionAction = {
            /** - Typ změny state. */
            type: import("./enums/ESelectionActionKeys").ESelectionActionKeys.DropSelection;
            /** - Identifikátor skupiny výběru. */
            selectionSetKey: string;
        };
        
        type IRerenderAction = {
            /** - Typ změny state. */
            type: import("./enums/ESelectionActionKeys").ESelectionActionKeys.Rerender;
            /** - Identifikátor skupiny výběru. */
            selectionSetKey: string;
        }
        
        type IToggleSelectabilityAction = {
            /** - Typ změny state. */
            type: import("./enums/ESelectionActionKeys").ESelectionActionKeys.ToggleSelectability;
            /** - Identifikátor skupiny výběru. */
            selectionSetKey: string;
            /** - Kolekce změn vybíratelnosti. */
            layers: Array<ILayerSelectability>;
        };
        
        interface ILayerSelectability {
            /** - GisId podvrstvy. */
            gisId: string;
            /** - Vybíratelnost podvrstvy. */
            selectable: boolean;
        }
        
        type ISelectionActions = ISelectionStartAction | ISelectionEndAction | IDropSelectionAction | IToggleSelectabilityAction | IRerenderAction | ISelectionFailAction | ITableSelectionStartAction | ITableSelectionEndAction | ITableSelectionFailAction;
        
        /** - Slovník všech výběrů. */
        interface ISelectionState {
            selectionSetDictionary: {
                [selectionSetKey: string]: ISelectionSetState;
            };
        };
        
        type IMSelectionState = import("jimu-core").ImmutableObject<ISelectionState>;
    }
    //#endregion
}