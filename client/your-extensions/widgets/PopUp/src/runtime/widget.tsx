/** @todo KUT: Z widgetu se stala dlouhá špageta. Chtělo by to refactoring. */
import { React, ReactDOM, useIntl } from "jimu-core";
import { WidgetWrapper, LinkFeatureModal, OnScreenButton, ErrorBoundary } from "widgets/shared-code/components";
import SelectionManager from "widgets/shared-code/SelectionManager";
import { useMessageFormater, useConfig } from "widgets/shared-code/hooks";
import { EFeatureType, EDbRegistryKeys } from  "widgets/shared-code/enums";
import { JimuMapViewContext, AssetsProviderContext } from  "widgets/shared-code/contexts";
import {
    WidgetStateHelper,
    LayerDefinitionHelper,
    LayerHelper,
    FeatureHelper,
    DbRegistryLoader,
    ArcGISJSAPIModuleLoader,
    TokenHelper,
    EsriHelper,
    LayerInfoHelper,
    FromDataHelper
} from "widgets/shared-code/helpers";
import translations from "./translations/default";
import { openPopupForRelatedFeatures, openRoomBooking } from "./helpers/helpers";
import Loader from "./components/Loader";
import PopUpTable from "./components/PopUpTable"

const FeatureHeight = React.lazy(() => import("./components/FeatureHeight"));

/** - Identifikátor tlačítka pro vyvolání žádanky. */
const roomBookingActionId = "room-booking-action";
/** - Identifikátor tlačítka pro vygenerování URL adresy. */
const generateUrlId = "generate-url";
/** - Identifikátor tlačítka pro přidání prvku do výběru. */
const selectId = "select-url";
/** - Identifikátor tlačítka pro vyvolání nového popupu s navazbenými prvky. */
const queryFeaturesId = "query-features";
/** - Pořadí tlačítek v popupus. */
const buttonIdsOrder: Array<string> = [roomBookingActionId, queryFeaturesId, selectId, generateUrlId];
const JSAPIModuleLoader = new ArcGISJSAPIModuleLoader(["IdentityManager", "ActionButton", "OAuthInfo", "ServerInfo", "config", "CustomContent"]);

/**
 * - Hlavní komponenta widgetu.
 * - @see {@link https://developers.arcgis.com/experience-builder/guide/extend-base-widget/}.
 */
function Widget (props: HSI.WidgetWrapper.IExtendedProps) {
    const jimuMapView = React.useContext(JimuMapViewContext);
    /** - Je povolenu otevření pop-upu? */
    const [isPopUpAllowed, togglePopupState] = React.useState<boolean>(jimuMapView.view.popupEnabled)
    const assetsProvider = React.useContext(AssetsProviderContext);
    const config = useConfig<HSI.PopUpWidget.IMConfig>();
    /** - Reference komponenty {@link CopyLinkModal}. */
    const copyLinkModalRef = React.useRef<HSI.LinkFeatureModalComponent.ILinkFeatureModalMethods>();
    const messageFormater = useMessageFormater(translations);
    const intl = useIntl();
    /** - Naslouchání na událost změny povolení otevírání popupu a následná aktualizace state. */
    React.useEffect(() => {
        togglePopupState(jimuMapView.view.popupEnabled);

        const listener = jimuMapView.view.watch("popupEnabled", togglePopupState);
        
        if (!jimuMapView.view.popup.visibleElements) {
			jimuMapView.view.popup.visibleElements = { spinner: true };
		} else {
			jimuMapView.view.popup.visibleElements.spinner = true;
		}

        
        return function () {
            EsriHelper.removeListeners(listener);
        }
    }, [jimuMapView]);

    /** - Načtení a zobrazení výšky v popupu určitých prvků. */
    React.useEffect(() => {
        const abortController = new AbortController();
        if (!!jimuMapView) {

            (async function() {
                try {
                    const popupHeightConfig = await DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { type: "json", scope: "g", name: EDbRegistryKeys.PopupHeight }, abortController.signal)

                    if (Array.isArray(popupHeightConfig?.sublayers) && popupHeightConfig.sublayers.length > 0) {
                        const sublayers = await LayerDefinitionHelper.findSublayersByDefinition(jimuMapView, popupHeightConfig.sublayers);

                        if (Array.isArray(sublayers) && sublayers.length > 0) {
                            const CustomContent = await ArcGISJSAPIModuleLoader.getModule("CustomContent");
                            const table = document.createElement("table");
                            const tbody = document.createElement("tbody");
                            table.className = "esri-widget__table";
                            table.appendChild(tbody);
                            const tr = document.createElement("tr");
                            tbody.appendChild(tr);
                            const th = document.createElement("th");
                            th.className = "esri-feature-fields__field-header"
                            tr.appendChild(th);
                            th.innerText = messageFormater("heightTitle");
                            const td = document.createElement("td");
                            td.className = "esri-feature-fields__field-data"
                            tr.appendChild(td);
                            

                            const heightLoader = new CustomContent({
                                outFields: [],
                                //@ts-ignore - Špatně napsaný typescript (ExB verze 1.9)
                                creator({ graphic }: { graphic: __esri.Graphic }) {
                                    try {
                                        ReactDOM.render(
                                            <ErrorBoundary errorMessageTitle={messageFormater("failedToFetchHeight")} >
                                                <React.Suspense fallback={<Loader/>} >
                                                    <FeatureHeight
                                                        graphic={graphic}
                                                        errorMessage={messageFormater("failedToFetchHeight")}
                                                        heightServiceUrl={popupHeightConfig.heightServiceUrl}
                                                    />
                                                </React.Suspense>
                                            </ErrorBoundary>
                                        , td);

                                        return table;
                                    } catch(err) {
                                        console.warn(err);
                                    }
                                },
                                destroyer() {
                                    ReactDOM.unmountComponentAtNode(td);
                                }
                            });

                            for (let sublayer of sublayers) {
                                if (sublayer.popupTemplate) {
                                    if (!sublayer.popupTemplate.content) {
                                        sublayer.popupTemplate.content = [];
                                    }

                                    if (Array.isArray(sublayer.popupTemplate.content)) {
                                        sublayer.popupTemplate.content.push(heightLoader);
                                    }
                                }
                            }
                        }
                    }
                } catch(err) {
                    if (!abortController.signal.aborted) {
                        console.warn(err);
                    }
                }
            })();
        }

        return function() {
            abortController.abort();
        }
    }, [jimuMapView, messageFormater]);

    /** - Rozšíření pop-upu podle konfigurarce v DB registrech */
    React.useEffect(() => {
        const abortController = new AbortController();
        
        /** - Funkce odebírající naslouchání na nový token. */
        let tokenProviderListenerRemover: () => void;
        /** - Přepsání funkce pro vyhledání prvků v pop-upu. */
        let fetchFeaturesOverride: (popup: __esri.Popup) => void;


        Promise.all([
            DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { type: "json", scope: "g", name: EDbRegistryKeys.BookRooms }, abortController.signal),
            DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { type: "bool", scope: "g", name: EDbRegistryKeys.PopupTopFeatureOnly, nameExtension: config.dbRegistryConfigKeyExtension }, abortController.signal),
            DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { type: "bool", scope: "g", name: EDbRegistryKeys.PopupOrderFeatures, nameExtension: config.dbRegistryConfigKeyExtension }, abortController.signal),
            JSAPIModuleLoader.load()
        ])
            .then(([bookRoomsDefinitions, topFeatureOnly, orderFeatures]) => {
                //#region - Zajištění, že se v popupu výsledky zobrazí podle nastavení v konfiguraci topFeatureOnly nebo orderFeatures.
                if (topFeatureOnly || orderFeatures) {
                    fetchFeaturesOverride = popup => {
                        /** - Původní funkce pro vyhledání prvků v pop-upu. */
                        const originalFetchFeatures = popup.viewModel.fetchFeatures.bind(popup.viewModel) as __esri.PopupViewModel['fetchFeatures'];
    
                        /** - Přepsání funkce pro vyhledání prvků v pop-upu. */
                        popup.viewModel.fetchFeatures = async (...args) => {
                            try {
                                /** - Výsledek standardní funkce {@link originalFetchFeatures}. */
                                const [response, featureSublayers] = await Promise.all([
                                    originalFetchFeatures(...args),
                                    LayerHelper.getAllFeatureSublayers(jimuMapView, args[1]?.signal)
                                ]);
    
                                //#region - Seřazení výsledků podle pozice ve struktuře mapy.
                                if (response.allGraphicsPromise instanceof Promise) {
                                    /** - Všechny feature podvrstvy v mapě, seřatené podle polohy ve struktuře mapy. */
                                    const orderedSublayers = LayerHelper.orderLayer(jimuMapView, featureSublayers);
    
                                    response.allGraphicsPromise = response.allGraphicsPromise
                                        .then(graphics => {
                                            if (!Array.isArray(graphics) || graphics.length < 2) {
                                                return graphics;
                                            }
                                            // Seřazení nalezených prvků podle polohy ve struktuře mapy.
                                            graphics.sort((a, b) => orderedSublayers.indexOf(LayerHelper.getSublayerFromFeature(a)) - orderedSublayers.indexOf(LayerHelper.getSublayerFromFeature(b)));
    
                                            //#region - Redukce výsledků na prvky z nejvyšší nalezené vrstvy.
                                            if (topFeatureOnly) {
                                                /** - Nejvyšší vrtva ve které byly nalezeny prvky. */
                                                const firstFoundLayer = LayerHelper.getSublayerFromFeature(graphics[0]);
                                                return graphics.filter(graphic => LayerHelper.getSublayerFromFeature(graphic) === firstFoundLayer);
                                            }
                                            //#endregion
                                            return graphics;
                                        });
                                }
                                //#endregion
                    
                                return response;
                            } catch(err) {
                                console.warn(err);
                                return originalFetchFeatures(...args);
                            }
                        }
                    };
                }
                //#endregion
                return Promise.all([
                    LayerDefinitionHelper.findSublayersByDefinition(jimuMapView, bookRoomsDefinitions?.sublayers || []),
                    LayerHelper.getAllFeatureSublayers(jimuMapView, abortController.signal),
                    DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { type: "json", scope: "g", name: EDbRegistryKeys.Attachments }, abortController.signal),
                    DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { type: "bool", scope: "g", name: EDbRegistryKeys.PopupSelectButton }, abortController.signal),
                    DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { type: "json", scope: "g", name: EDbRegistryKeys.PopupFeatureQuery }, abortController.signal),
                    DbRegistryLoader.fetchDbRegistryValue(jimuMapView, {
                        name: EDbRegistryKeys.FromData,
                        scope: "g",
                        type: "json"
                    })
                ]);
            })
            .then(([bookRoomsSublayers, allSublayers, attachmentsDefinitions, addSelectButton, popupFeatureQueryConfig, fromData]) => {
                if (abortController.signal.aborted) {
                    return;
                }

                //#region - Přidání custom tlačítek do popupu
                const ActionButton = JSAPIModuleLoader.getModule("ActionButton");
                const CustomContent =  JSAPIModuleLoader.getModule("CustomContent")

                
                //#region - Rozšíření popupu o proklik do žádanek.

                if (WidgetStateHelper.containsWidgetWithName("RoomBooking")) {
                    /** - Tlačítko pro rozšíření popupu o proklik do žádanek. */
                    const roomBookingButton = new ActionButton({
                        id: roomBookingActionId,
                        title: messageFormater("bookRoomButton"),
                        image: assetsProvider("room-booking-icon.svg")
                    });
    
                    for (let sublayer of bookRoomsSublayers) {
                        if (sublayer.popupTemplate) {
                            if (sublayer.popupTemplate.actions) {
                                if (sublayer.popupTemplate.actions.findIndex(action => action.id === roomBookingActionId) === -1) {
                                    sublayer.popupTemplate.actions.push(roomBookingButton);
                                }
                            } else {
                                sublayer.popupTemplate.actions = [roomBookingButton] as any;
                            }
                        }
                    }
                }

                //#endregion

                const allSublayersAndTables: Array<__esri.Sublayer | __esri.FeatureLayer> = [...allSublayers];
                allSublayersAndTables.push(...LayerHelper.getAllTables(jimuMapView));
                
                //#region - Rozšíření popupu o generování URL pro prvek a přidání prvku do výběru.
                /** - Tlačítko pro generování URL pro prvek. */
                const generateUrlButton = new ActionButton({
                    id: generateUrlId,
                    title: messageFormater("featureLinkButton"),
                    image: assetsProvider("toc-add-link.svg")
                });  

                /** - Tlačítko pro přidání prvku do výběru. */
                const selectButton = new ActionButton({
                    id: selectId,
                    title: messageFormater("selectButton"),
                    image: assetsProvider("add.svg")
                });
                    
                for (let sublayer of allSublayersAndTables) {
                    if (sublayer.popupTemplate) {
                        if (!sublayer.popupTemplate.content) {
                            sublayer.popupTemplate.content = [];
                        }
                            
                        (async function() {
                            /** - Vytvoří nové pole z @HSI.PopUpWidget.IPopUpCustomizedField, který obashuje půbodní field a přiřaženou akci.
                             *  Slouží k vykreslení vlastní tabulky, v rámci které jsou fieldy s action vráceny jako odkaz
                             * . */
                            let processedFieldsArray: HSI.PopUpWidget.IPopUpCustomizedField[] = []
                            try {
                                let actionExists = false    
                                if (Array.isArray(sublayer.popupTemplate.content)) {
                                    for (let i = 0; i < sublayer.fields.length; i++) {
                                        let newFieldObject: HSI.PopUpWidget.IPopUpCustomizedField = {
                                            field: sublayer.fields[i],
                                            action: null 
                                        };                                        
                                        newFieldObject["field"] = sublayer.fields[i]
                                        const matchingLayer = await LayerInfoHelper.findMatchingLayerBySublayer(sublayer as __esri.Sublayer);
                                        const action = FromDataHelper.findActionInFromData(sublayer.fields[i].name, fromData, matchingLayer)
                                        if (action !== undefined || null) {
                                            newFieldObject["action"] = action
                                            actionExists = true
                                        }
                                        else {
                                            newFieldObject["action"] = null;
                                        }
                                        
                                        processedFieldsArray.push(newFieldObject)
                                    }

                                    /** - V případě, že má jakýkoliv atribut akci, nahradit původní tabulku v PopUpu vlastní. */
                                    if (actionExists) {
                                        const div = document.createElement("div");
                                        
                                        const testContent = new CustomContent({
                                            outFields: ["*"],
                                            creator({ graphic }) {
                                                ReactDOM.render(
                                                        <PopUpTable processedFieldsArray={processedFieldsArray} intl={intl} graphic={graphic} subLayer={sublayer as __esri.Sublayer}></PopUpTable>  
                                                    ,div);
                                                return div;
        
                                            },
                                            destroyer() {
                                                ReactDOM.unmountComponentAtNode(div);
                                            }
                                        });
                                        
                                        sublayer.popupTemplate.content.push(testContent);
                                        sublayer.popupTemplate.content.shift();
    
                                    }
                                }
                            }
                         catch(err) {
                            console.warn(err);
                        }
                        })();

                    }

                }
                
                for (let layer of allSublayersAndTables) {
                    if (layer.popupTemplate) {
                        if (layer.popupTemplate.actions) {
                            if (layer.popupTemplate.actions.findIndex(action => action.id === generateUrlId) === -1 && !config.hideGenerateUrlButton) {
                                layer.popupTemplate.actions.push(generateUrlButton);
                            }
                        } else {
                            if (!config.hideGenerateUrlButton) {
                                layer.popupTemplate.actions = [generateUrlButton] as any;
                            }
                        }
                        if (addSelectButton && layer.popupTemplate.actions.findIndex(action => action.id === selectId) === -1) {
                            if (!layer.popupTemplate.actions) {
                                layer.popupTemplate.actions = [selectButton] as any;
                            } else {
                                layer.popupTemplate.actions.push(selectButton);
                            }
                        }
                    }
                }
                //#endregion

                //#region - Rozšíření popupu o tlačítko, které zobrazí nový popup s navazbenými prvky.
                const popupFeatureQueryDefinition = config.dbRegistryConfigKeyExtension in popupFeatureQueryConfig ? popupFeatureQueryConfig[config.dbRegistryConfigKeyExtension] : popupFeatureQueryConfig.default;

                /** - Promisa s asynchronním přidáváním tlačítek. */
                const addButtonPromise = !Array.isArray(popupFeatureQueryDefinition) ? Promise.resolve() : Promise.all(popupFeatureQueryDefinition.map(definition => {
                    return LayerDefinitionHelper.findLayerByDefinition(jimuMapView, definition.originLayer)
                        .then(layer => {
                            if (layer?.popupTemplate) {
                                const queryFeaturesButton = new ActionButton({
                                    id: queryFeaturesId,
                                    title: definition.title,
                                    image: assetsProvider("widget-list.svg")
                                });

                                if (layer.popupTemplate.actions) {
                                    if (layer.popupTemplate.actions.findIndex(action => action.id === queryFeaturesId) === -1) {
                                        layer.popupTemplate.actions.push(queryFeaturesButton);
                                    }
                                } else {
                                    layer.popupTemplate.actions = [queryFeaturesButton] as any;
                                }
                            }
                        })
                        .catch(err => {
                            console.warn(err);
                        });
                }));
                //#endregion

                //#region - Seřazení tlačítek
                addButtonPromise
                    .then(() => {
                        if (!abortController.signal.aborted) {
                            for (let layer of allSublayersAndTables) {
                                if (layer.popupTemplate?.actions) {
                                    layer.popupTemplate.actions = layer.popupTemplate.actions.sort((action1, action2) => {
                                        const index1 = buttonIdsOrder.indexOf(action1.id);
                                        const index2 = buttonIdsOrder.indexOf(action2.id);
            
                                        return index1 === -1 || index2 === -1 ? index2 - index1 : index1 - index2;
                                    });
                                }
                            }
                        }
                    });
                //#endregion
                //#endregion
                const attachmentLayerDefinitions = Array.isArray(attachmentsDefinitions?.sublayers) ? attachmentsDefinitions.sublayers.map(sublayerDefinition => sublayerDefinition.layer) : [];

                if (Array.isArray(attachmentsDefinitions?.tables)) {
                    attachmentLayerDefinitions.push(...attachmentsDefinitions.tables.map(tableDefinition => tableDefinition.layer));
                }

                return LayerDefinitionHelper.findLayersByDefinition(jimuMapView, attachmentLayerDefinitions);
            })
            .then(attachmentsSublayers => {
                if (abortController.signal.aborted || attachmentsSublayers.length < 1) {
                    return;
                }

                //#region - Přidání autorizačního tokenu do URL adresy obrázků.

                /** - Objekty s obrázky, ke kterým chceme přidat token. */
                const imagesToUpdate: Array<__esri.ImageMediaInfo> = [];

                for (let sublayer of attachmentsSublayers) {
                    if (Array.isArray(sublayer.popupTemplate?.content)) {
                        try {
                            for (let content of sublayer.popupTemplate.content) {
                                if (content.type === "media") {
                                    let image = content as __esri.MediaContent;
                                    
                                    if (Array.isArray(image.mediaInfos)) {
                                        for (let mediaInfo of image.mediaInfos) {
                                            if (mediaInfo.type === "image" && !(mediaInfo as __esri.ImageMediaInfo).value.sourceURL.includes("?token")) {
                                                imagesToUpdate.push(mediaInfo);
                                            }
                                        }
                                    } else if ((image.mediaInfos as __esri.ImageMediaInfo).type === "image" && !(image.mediaInfos as __esri.ImageMediaInfo).value.sourceURL.includes("?token")) {
                                        imagesToUpdate.push(image.mediaInfos as __esri.ImageMediaInfo);
                                    }
                                }
                            }
                        } catch(err) {
                            console.warn(err);
                        }
                    }
                }

                if (imagesToUpdate.length > 0) {
                    TokenHelper.provideValidToken(props.portalUrl, token => {
                        for (let image of imagesToUpdate) {
                            image.value.sourceURL = image.value.sourceURL.split("?token")[0];
                            image.value.sourceURL += `?token=${token}`;
                        }
                    });
                }
                //#endregion
            })
            .catch(err => {
                if (!abortController.signal.aborted) {
                    console.warn(err);
                }
            });

        /** - Naslouchání na vyvolání akce v pop-upu. */
        let triggerActionListener: IHandle;
        /** - Naslouchání na změnu objektu pop-upu. */
        const popupChangeListener = jimuMapView.view.watch("popup", (popup: __esri.Popup) => {
            if (typeof fetchFeaturesOverride === "function") {
                fetchFeaturesOverride(popup);
            }

            EsriHelper.removeListeners(triggerActionListener);

            if (typeof popup?.on === "function") {
                triggerActionListener = popup.on("trigger-action", ev => {
                    if (ev.action.id === roomBookingActionId) {
                        openRoomBooking(jimuMapView, popup.selectedFeature);
                    } else if (ev.action.id === generateUrlId) {
                        copyLinkModalRef.current.open(popup.selectedFeature);
                    } else if (ev.action.id === selectId) {
                        (async function() {
                            try {
                                if (FeatureHelper.getFeatureType(popup.selectedFeature) === EFeatureType.Table) {
                                    await SelectionManager.getSelectionSet(jimuMapView).updateByTableFeatureIds(LayerHelper.getTableFromFeature(popup.selectedFeature).id, [popup.selectedFeature.getObjectId()]);
                                } else {
                                    await SelectionManager.getSelectionSet(jimuMapView).updateByFeatureIds(LayerHelper.getGisIdLayersFromLayer(LayerHelper.getSublayerFromFeature(popup.selectedFeature)), [popup.selectedFeature.getObjectId()]);
                                }
                            } catch(err) {
                                console.warn(err);
                            }
                        })();
                    } else if (ev.action.id === queryFeaturesId) {
                        openPopupForRelatedFeatures(jimuMapView, popup.selectedFeature, config);
                    }
                });
            }
        });

        return function() {
            abortController.abort();
            if (typeof tokenProviderListenerRemover === "function") {
                tokenProviderListenerRemover();
            }

            EsriHelper.removeListeners(triggerActionListener);
            EsriHelper.removeListeners(popupChangeListener);
        };
    }, [jimuMapView, assetsProvider, messageFormater, config.dbRegistryConfigKeyExtension, props.portalUrl]);

    /**
     * - Odebrání hlavičky a zápatí v pop-upu.
     * - V ExB v 1.10. se do pop-upu přidává hlavička a zápatí. Nevím proč se to děje, ale je to dost otravné.
     * - Jelikož je hlavička tvořena jako ShadowRoot, tak nejde jednoduše upravit styl pomocí CSS.
     * - Řešení se mi moc nelíbí, ale na lepší jsem nepřišel.
     * */
    React.useEffect(() => {
        try {
            if (props.appConfig?.exbVersion === "1.10.0") {
                let container: Element;
                if (typeof jimuMapView.view.popup.container === "string") {
                    container = document.getElementById(jimuMapView.view.popup.container);
                } else if (jimuMapView.view.popup.container instanceof Element) {
                    container = jimuMapView.view.popup.container;
                }
        
                if (!!container) {
                    let containerChild: Element;
                    let popupContent: ShadowRoot;
                    let shadowRoot: ShadowRoot;
            
                    const shadowRootObserver = new MutationObserver(shadowRootLevel);
                    
                    const popupContentObserver = new MutationObserver(popupContentLevel);
                    
                    const containerChildObserver = new MutationObserver(containerChildLevel);
                    
                    const containerObserver = new MutationObserver(containerLevel);
                    
                    function shadowRootLevel() {
                        if (shadowRoot.childElementCount > 0) {
                            const child = shadowRoot.children.item(0);
                            for (let index = 0; index < child.childElementCount; index++) {
                                if (child.children.item(index).classList.contains("header") || child.children.item(index).classList.contains("footer")) {
                                    child.children.item(index).remove();
                                }
                            }
                        }
                    }
                    
                    function popupContentLevel() {
                        if (popupContent.childElementCount > 0) {
                            shadowRoot = popupContent.children.item(0).shadowRoot;
                            shadowRootObserver.disconnect();
                            shadowRootObserver.observe(shadowRoot, { childList: true });
                            shadowRootLevel();
                        }
                    }
                    
                    function containerChildLevel() {
                        if (containerChild.childElementCount > 0) {
                            for (let index = 0; index < containerChild.childElementCount; index++) {
                                let child = containerChild.children.item(index)
                                if (child.classList.contains("esri-popup__content")) {
                                    popupContent = child.children.item(0).children.item(0).shadowRoot;
                                    shadowRootObserver.disconnect();
                                    popupContentObserver.observe(popupContent, { childList: true });
                                    popupContentLevel();
                                    break;
                                }
                            }
                        }
                    }

                    function containerLevel() {
                        if (container.childElementCount > 0) {
                            containerChild = container.children.item(0);
                            containerChildObserver.disconnect();
                            popupContentObserver.disconnect();
                            shadowRootObserver.disconnect();
                            containerChildObserver.observe(containerChild, { childList: true });
                            containerChildLevel();
                        }
                    }
        
                    containerObserver.disconnect();
                    containerChildObserver.disconnect();
                    popupContentObserver.disconnect();
                    shadowRootObserver.disconnect();
            
                    containerObserver.observe(container, { childList: true });

                    jimuMapView.view.popup.watch("currentDockPosition", containerLevel);
        
                    return function() {
                        containerObserver.disconnect();
                        containerChildObserver.disconnect();
                        popupContentObserver.disconnect();
                        shadowRootObserver.disconnect();
                    }
                }
            }
        } catch(err) {
            console.warn(err);
        }
    }, [jimuMapView, props.appConfig?.exbVersion]);
    
    return <>
        {
            config.hideButton ? <></> : (
                <OnScreenButton
                    active={isPopUpAllowed}
                    name={props.manifest.name}
                    onClick={() => {
                        jimuMapView.view.popupEnabled = !jimuMapView.view.popupEnabled;
                        jimuMapView.view.popup.close();
                    }}
                    icon={props.icon}
                    title={props.label}
                    widgetId={props.id}
                />
            )
        }
        <LinkFeatureModal ref={copyLinkModalRef} />
    </>;
}

export default WidgetWrapper(Widget, { hasAssets: true, ignoreJimuMapView: false, provideConfiguration: true, urlParser: true });