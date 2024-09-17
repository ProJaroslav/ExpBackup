import { React, JimuMapViewStatus, BaseWidget, loadArcGISJSAPIModule, urlUtils } from 'jimu-core';
import { Card, CardBody, Loading, LoadingType, Popper, PopperProps } from "jimu-ui";
import { JimuMapViewComponent, JimuMapView } from 'jimu-arcgis';
import { ConfigContext, JimuMapViewContext, PopperContext, ClosePopperContext, AssetsProviderContext, IntlContext } from "widgets/shared-code/contexts";
import { Suspense, ErrorBoundary } from "widgets/shared-code/components";
import { LayerHelper, WidgetStateHelper, NotificationHelper, BookmarkHelper, BookmarkConfigManager, UrlParamsHandler } from "widgets/shared-code/helpers";
import ENotificationActionKeys from '../enums/ENotificationActionKeys';
import { EConstants, EKnownWidgetExtentison } from "widgets/shared-code/enums";

const NotificationManager = React.lazy(() => import ("./NotificationManager"));
const ContextMenu = React.lazy(() => import("./ContextMenu"));
const DrawSelectionHandler = React.lazy(() => import("./DrawSelectionHandler"));
const WarningContent = React.lazy(() => import("./WarningContent"));
const SelectionStateHandler = React.lazy(() => import("./SelectionStateHandler"));
const TokenRefresher = React.lazy(() => import("./TokenRefresher"));
const DisableSelection = React.lazy(() => import("./DisableSelection"));

interface IState {
    /**
     * - Aktivní JimuMapView, které widget používá.
     * @see {@link https://developers.arcgis.com/experience-builder/api-reference/jimu-arcgis/JimuMapView}.
     */
    jimuMapView: JimuMapView;
    loadnigJimuMapView: JimuMapView;
    /** - Parametry componenty Popperu. */
    popperProps: PopperProps;
};



/**
 * - Obaluje komponentu widgetu často používanými funkcemi (načtení JimuMapView, předání konfigurace, atd...).
 * - @see {@link https://reactjs.org/docs/higher-order-components.html}
 * @param WidgetComponent - Hlavní komponeta widgetu.
 * @param options - Specifikace chování componenty.
 */
export default class WidgetWrapper extends BaseWidget<HSI.WidgetWrapper.IExtendedProps, IState> {
    constructor(props: HSI.WidgetWrapper.IExtendedProps) {
        super(props);

        this.initialQueryObject = props.queryObject;
        this.state = {
            jimuMapView: undefined,
            loadnigJimuMapView: undefined,
            popperProps: {
                open: false,
                children: <></>,
                reference: null,
                placement: "right-start",
                id: `popper-${props.widgetId}`,
                toggle: this.closePopper
            }
        };
    }

    /**
     * - Element, který se vytvoří na míště kam se má vytvořit Popper.
     * - Popper se řídí polohou tohoto elementu.
     * - Důvod je ten, že Popper lze umístit jen na okraj elementu a parametr 'offset'. kterým lze polohu upravit, nefunguje správně.
     */
    private popperHolder: HTMLDivElement;
    /** - Zrušení průběbu metody {@link applyStartBookmark}. */
    private userSettingsAbortController: AbortController;
    /**
     * - Hodnoty URL parametrů při inicializaci widgetu.
     * - Teoreticky to nemusí odpovívat hodnotám při startu aplikace (např. když se widget otevře až v průběhu užívání aplikace), ale vzhledem k tomu, že se hodnoty používají nastavení výchozího stavu aplikace, tak by to neměl být problém. 
     */
    private readonly initialQueryObject: typeof this.props.queryObject;
    /** - Kanál pomocí kterého se předávají parametry mezi aplikacemi v prohlížeči. */
    private channel: BroadcastChannel;
    /** - Interval, pro zvýraznění záložky prohlížeče po aplikování akce z jiné aplikace v prohlížeči, předané pomocí {@link channel}. */
    private tableHighlightInterval: NodeJS.Timeout;

    componentDidMount() {
        try {
            if (WidgetStateHelper.hasExtension(this.props.widgetId, EKnownWidgetExtentison.FirstRenderHandler)) {
                if (this.props.urlParser && !this.props.ignoreJimuMapView) {
                    const action: HSI.FirstRenderHandlerStore.IRegisterHandlerAction = {
                        actionName: "urlParser",
                        type: "register-first-render-handler",
                        widgetId: this.props.widgetId
                    };
    
                    this.props.dispatch(action);
                }
    
                const requestTimeoutAction: HSI.FirstRenderHandlerStore.IRegisterHandlerAction = {
                    actionName: "requestTimeout",
                    type: "register-first-render-handler",
                    widgetId: this.props.widgetId
                };
    
                this.props.dispatch(requestTimeoutAction);
    
                const tokenRefreshAction: HSI.FirstRenderHandlerStore.IRegisterHandlerAction = {
                    actionName: "tokenRefresh",
                    type: "register-first-render-handler",
                    widgetId: this.props.widgetId
                };
    
                this.props.dispatch(tokenRefreshAction);

                const disebleSelectionhAction: HSI.FirstRenderHandlerStore.IRegisterHandlerAction = {
                    actionName: "disebleSelection",
                    type: "register-first-render-handler",
                    widgetId: this.props.widgetId
                };
    
                this.props.dispatch(disebleSelectionhAction);

                if (WidgetStateHelper.containsWidgetWithName("UserSettings")) {
                    const startBookmarkAction: HSI.FirstRenderHandlerStore.IRegisterHandlerAction = {
                        actionName: "startBookmark",
                        type: "register-first-render-handler",
                        widgetId: this.props.widgetId
                    };
        
                    this.props.dispatch(startBookmarkAction);
                }
    
                if (WidgetStateHelper.hasExtension(this.props.widgetId, EKnownWidgetExtentison.Selection)) {
                    const drawSelectionAction: HSI.FirstRenderHandlerStore.IRegisterHandlerAction = {
                        actionName: "drawSelection",
                        type: "register-first-render-handler",
                        widgetId: this.props.widgetId
                    };
        
                    this.props.dispatch(drawSelectionAction);

                    const selectionHandlerAction: HSI.FirstRenderHandlerStore.IRegisterHandlerAction = {
                        actionName: "selectionHandler",
                        type: "register-first-render-handler",
                        widgetId: this.props.widgetId
                    };
        
                    this.props.dispatch(selectionHandlerAction);
                }

                if (!this.props.ignoreJimuMapView && WidgetStateHelper.hasExtension(this.props.widgetId, EKnownWidgetExtentison.Notification)) {
                    const layersAccessibilityAction: HSI.FirstRenderHandlerStore.IRegisterHandlerAction = {
                        actionName: "checkLayersAccessibility",
                        type: "register-first-render-handler",
                        widgetId: this.props.widgetId
                    };
        
                    this.props.dispatch(layersAccessibilityAction);
                }
            }

            if (WidgetStateHelper.hasExtension(this.props.widgetId, EKnownWidgetExtentison.Notification)) {
                const notificationAction: HSI.NotificationStore.IInitNotificationAction = {
                    type: ENotificationActionKeys.Init,
                    widgetId: this.props.widgetId
                };
    
                this.props.dispatch(notificationAction);
            }

        } catch(err) {
            console.warn(err);
        }
    }

    componentWillUnmount() {
        this.closePopper();
        if (!!this.channel) {
            this.channel.close();
        }
        clearInterval(this.tableHighlightInterval);
    }

    /**
     * - Ověřuje zda se zrovna načetlo mapView, nebo zrovna došlo k registraci tohoto widgetu jako handleru {@link actionName této akce}.
     * @param prevProps - Předchozí hodnota {@link props}.
     * @param prevState - Předchozí hodnota {@link state}.
     * @param actionName - Akce (funkcionalita) o kterou se má starat pouze jeden widget.
     */
    isInitRender(prevProps: HSI.WidgetWrapper.IExtendedProps, prevState: IState, actionName: HSI.FirstRenderHandlerStore.IRegisterHandlerAction['actionName']) {
        return this.props.hsiFirstRenderHandler?.[actionName] === this.props.widgetId &&
            this.state.jimuMapView?.status === JimuMapViewStatus.Loaded &&
            (
                prevState.jimuMapView?.id !== this.state.jimuMapView.id ||
                prevProps.hsiFirstRenderHandler?.[actionName] !== this.props.hsiFirstRenderHandler?.[actionName]
            )
    }

    componentDidUpdate(prevProps: HSI.WidgetWrapper.IExtendedProps, prevState: IState) {
        /** - Pokud se zrovna načetlo mapView, nebo zrovna došlo k registraci tohoto widgetu jako handleru url. */
        if (this.isInitRender(prevProps, prevState, "urlParser")) {
            UrlParamsHandler.handleUrlParams(this.state.jimuMapView, this.initialQueryObject)
                .catch(err => {
                    console.warn(err);
                    this.props.dispatch(NotificationHelper.createAddNotificationAction({ type: "error", message: "Při parsování URL parametrů nastala chyba" }));
                });

            this.createParamsListener();
        }

        if ((prevProps.hsiFirstRenderHandler?.requestTimeout !== this.props.hsiFirstRenderHandler?.requestTimeout) && (this.props.hsiFirstRenderHandler?.requestTimeout === this.props.widgetId)) {
            this.preventRequestTimeout();
        }

        if (this.isInitRender(prevProps, prevState, "startBookmark")) {
            this.applyStartBookmark();
        }
    }

    private static trimPathName(pathName: string): string {
        if (typeof pathName !== "string") {
            return "";
        }

        while(pathName.startsWith("/")) {
            pathName = pathName.substring(1, pathName.length);
        }

        while(pathName.endsWith("/")) {
            pathName = pathName.substring(pathName.length - 1, 0);
        }

        return pathName;
    }

    /**
     * - Zahájení {@link tableHighlightInterval intervalu pro zvýraznění záložky}.
     * - Zvýraznění záložky se ukončí po aktivaci záložky.
     */
    private highlightTab() {
        const originalTitle = document.title;
        clearInterval(this.tableHighlightInterval);
        if (document.hidden) {
            this.tableHighlightInterval = setInterval(() => {
                if (document.hidden) {
                    document.title = document.title === originalTitle ? "Odkaz aplikován ZDE" : originalTitle;
                } else {
                    document.title = originalTitle;
                    clearInterval(this.tableHighlightInterval);
                }
            }, 2000);
        }
    }

    /** - Začne naslouchat jestli jiná aplikace pomocí {@link channel} nepředá parametry ke změně výběru. */
    private createParamsListener() {
        this.channel = new BroadcastChannel(EConstants.tabChannelRequest);

        this.channel.onmessage = ev => {
            const data: HSI.ITabChannelEvent = ev.data;
            if (data.type === "action") {
                const responseData: HSI.ITabChannelEvent = { type: "action-response", success: false };
                
                if (WidgetWrapper.trimPathName(urlUtils.isAbsoluteUrl(data.params?.appUrl) ? new URL(data.params?.appUrl).pathname : data.params?.appUrl) === WidgetWrapper.trimPathName(location.pathname)) {
                    responseData.success = true;
                    this.highlightTab();
                    UrlParamsHandler.handleSelect(this.state.jimuMapView, data.params)
                        .catch(err => {
                            console.warn(err);
                            NotificationHelper.addNotification({ type: "warning", message: "Nepodařilo se aplikovat parametry z prokliku" });
                        });
                }
                this.channel.postMessage(responseData);
            }
        };
    }

    /** - Zrušení časového limitu esri dotazů. */
    private async preventRequestTimeout() {
        try {
            const config = await loadArcGISJSAPIModule("esri/config") as __esri.config;

            config.request.timeout = 0;
        } catch(err) {
            console.warn(err);
        }
    }

    /** - Aplikování výchozí záložky (záložka s názvem {@link EConstants.startBookmarkName} ve widgetu "UserSettings"). */
    private async applyStartBookmark() {
        const abortController = new AbortController();
        try {
            if (!!this.userSettingsAbortController?.signal && !this.userSettingsAbortController.signal.aborted) {
                this.userSettingsAbortController.abort();
            }
            this.userSettingsAbortController = abortController;
            const jimuMapView = this.state.jimuMapView;
            if (!!jimuMapView && WidgetStateHelper.containsWidgetWithName("UserSettings")) {

                const bookmarkConfigManager = new BookmarkConfigManager(jimuMapView, WidgetStateHelper.getWidgetConfigurationByName("UserSettings")[0].dbRegistryConfigKey);

                await bookmarkConfigManager.loadBookmarkSettings();

                if (Array.isArray(bookmarkConfigManager.bookmarkSettings?.userSettings)) {
                    const startBookmarkSetting = bookmarkConfigManager.bookmarkSettings.userSettings.find(userSetting => {
                        return userSetting.title.toLowerCase() === EConstants.startBookmarkName.toLowerCase();
                    });

                    if (!!startBookmarkSetting) {
                        const startBookmark = await BookmarkHelper.createBookmark(jimuMapView, startBookmarkSetting);
                        if (!abortController.signal.aborted) {
                            /** - Je v URL parametr {@link EConstants.selectUrl select}? */
                            const hasSelectParameter = UrlParamsHandler.parseUrlQueryJson(EConstants.selectUrl, this.initialQueryObject);
                            await BookmarkHelper.applyBookmark(jimuMapView, startBookmark, !hasSelectParameter && !UrlParamsHandler.parseUrlQueryJson(EConstants.floorUrl, this.initialQueryObject));
                            if (!hasSelectParameter && !UrlParamsHandler.parseUrlQueryJson(EConstants.extentUrl, this.initialQueryObject)) {
                                jimuMapView.view.goTo(startBookmark.viewpoint);
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
    }

    /** - Odebrání {@link WidgetWrapper.popperHolder} z DOM. */
    private destroyPopperHolder(): void {
        if (this.popperHolder) {
            this.popperHolder.remove();
        }
    }

    /** - Načtení a JimuMapView a předání potomkům. */
    private jimuMapViewContext(children: JSX.Element): JSX.Element {
        if (this.props.ignoreJimuMapView) {
            return children;
        } else if (!this.props.useMapWidgetIds?.[0]) {
            return <Suspense>
                <WarningContent
                    message={this.props.intl.formatMessage({ id: "_missingMap", defaultMessage: "Nemáte zvolený widget poskytujicí view mapy" })}
                />
            </Suspense>;
        } else {

            const jimuMapViewLoader = <JimuMapViewComponent
                useMapWidgetId={this.props.useMapWidgetIds?.[0]}
                onActiveViewChange={newJimuMapView => {
                    const loadnigJimuMapView = newJimuMapView?.status === JimuMapViewStatus.Loaded ? newJimuMapView : undefined;
                    this.setState(
                        { loadnigJimuMapView },
                        () => {
                            if (!!loadnigJimuMapView) {
                                LayerHelper.loadAccessibleLayers(loadnigJimuMapView, this.props.widgetId === this.props.hsiFirstRenderHandler?.checkLayersAccessibility)
                                    .then(() => {
                                        this.setState(prevState => {
                                            if (prevState.loadnigJimuMapView !== loadnigJimuMapView) {
                                                return prevState;
                                            }
        
                                            return {
                                                ...prevState,
                                                jimuMapView: loadnigJimuMapView,
                                                loadnigJimuMapView: undefined
                                            };
                                        });
                                    });
                            }
                        });
                }}
            />;

            if (!this.state.jimuMapView) {
                return <div key="loading">
                    {jimuMapViewLoader}
                    <Loading type={LoadingType.Primary} />
                </div>;
            }

            return <>
                {jimuMapViewLoader}

                <JimuMapViewContext.Provider value={this.state.jimuMapView}>
                    {children}
                </JimuMapViewContext.Provider>
            </>;
        }
    }

    /**
     * - Otevření Popperu (kontextové nabídky).
     * @param params - Parametry Popperu.
     */
    private openPopper = (params: HSI.IPopperParams): void => {
        this.destroyPopperHolder();

        const element = params.reference instanceof HTMLElement ? params.reference : params.reference.current;

        const position = element.getBoundingClientRect();
        element.style.position = "relative";

        this.popperHolder = document.createElement("div");
        this.popperHolder.style.position = "absolute";
        this.popperHolder.style.top = `${params.position.y - position.y}px`;
        this.popperHolder.style.left = `${params.position.x - position.x}px`;

        element.appendChild(this.popperHolder);

        const loading = <Card><CardBody><Loading type={LoadingType.Secondary} /></CardBody></Card>;

        this.setState(state => ({
            popperProps: {
                ...state.popperProps,
                open: true,
                reference: this.popperHolder,
                children: "children" in params ? params.children : "list" in params ? <React.Suspense fallback={loading} ><ContextMenu items={params.list} close={this.closePopper} /></React.Suspense> : params.loading ? loading : <></>
            }
        }));

    }

    /** - Zavření Popperu. */
    private closePopper = (): void => {
        this.destroyPopperHolder();
        if (this.state.popperProps.open) {
            this.setState(state => ({
                popperProps: {
                    ...state.popperProps,
                    open: false
                }
            }));
        }
    }

    /** - Přidání Popperu (kontextové nabídky) do widgetu a předání funkce k jeho otevření. */
    private popper(children: JSX.Element): JSX.Element {
        if (!this.props.usePopper) {
            return children;
        }

        return <>
            <PopperContext.Provider value={this.openPopper}>
                <ClosePopperContext.Provider value={this.closePopper}>
                    {children}
                </ClosePopperContext.Provider>
            </PopperContext.Provider>
            <Popper {...this.state.popperProps}  />
        </>;
    }

    /** - Předání konfigurace widgetu potomkům. */
    private config(children: JSX.Element): JSX.Element {
        if (!this.props.provideConfiguration) {
            return children;
        }

        return <ConfigContext.Provider value={this.props.config as any}>
            {children}
        </ConfigContext.Provider>;
    }

    /** - Obalení potomků komponnetou {@link Suspense}. */
    private lazy(children: JSX.Element): JSX.Element {
        if (!this.props.lazy) {
            return children;
        }

        return <Suspense>{children}</Suspense>;
    }

    /** - Poskytnutí cesty k souboru uloženého ve složce 'assets'. */
    private getFilePath = (fileName: string) => {
        return `${this.props.context.folderUrl}dist/runtime/assets/${fileName}`;
    }

    /** - Předává všem potomkům funkci pro poskytnutí cesty k souboru uloženého ve složce 'assets'. */
    private assetsProvider(children: JSX.Element): JSX.Element {
        if (!this.props.hasAssets) {
            return children;
        }

        return <AssetsProviderContext.Provider value={this.getFilePath}>
            {children}
        </AssetsProviderContext.Provider>;
    }

    /** - Vyrendrování komponenty {@link NotificationManager}. */
    private notification(children: JSX.Element): JSX.Element {
        if (this.props.notificationWidgetId !== this.props.widgetId) {
            return children;
        }

        return <>
            <Suspense>
                <NotificationManager/>
            </Suspense>
            {children}
        </>;
    }

    /** - Vyrendrování {@link DrawSelectionHandler komponenty starající se o vykreslení geometrie prvků ve výběru}. */
    private drawSelectionHandler(children: JSX.Element): JSX.Element {
        if (this.props.hsiFirstRenderHandler?.drawSelection !== this.props.widgetId && this.props.hsiFirstRenderHandler?.selectionHandler !== this.props.widgetId) {
            return children;
        }

        return <>
            <Suspense>
                {this.props.hsiFirstRenderHandler?.drawSelection === this.props.widgetId ? <DrawSelectionHandler/> : <></>}
                {this.props.hsiFirstRenderHandler?.selectionHandler === this.props.widgetId ? <SelectionStateHandler/> : <></>}
            </Suspense>
            {children}
        </>;
    }

    /** - Vyrendrování komponenty {@link TokenRefresher}. */
    private tokenRefresher(children: JSX.Element): JSX.Element {
        if (this.props.hsiFirstRenderHandler?.tokenRefresh === this.props.widgetId) {
            return <>
                <React.Suspense fallback={<></>}>
                    <TokenRefresher/>
                </React.Suspense>
                {children}
            </>;
        }
        
        return children;
    }

    /** - Vyrendrování komponenty {@link DisableSelection}. */
    private disableSelection(children: JSX.Element): JSX.Element {
        if (this.props.hsiFirstRenderHandler?.disebleSelection === this.props.widgetId) {
            return <>
                <React.Suspense fallback={<></>}>
                    <DisableSelection/>
                </React.Suspense>
                {children}
            </>;
        }
        
        return children;
    }

    render() {
        return <IntlContext.Provider value={this.props.intl}>
            <ErrorBoundary errorMessageTitle='Something went wrong' >
                {this.jimuMapViewContext(
                    this.popper(
                        this.config(
                            this.lazy(
                                this.assetsProvider(
                                    this.notification(
                                        this.drawSelectionHandler(
                                            this.tokenRefresher(
                                                this.disableSelection(
                                                    this.props.children as JSX.Element
                                                )
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                )}
            </ErrorBoundary>
        </IntlContext.Provider>;
    }
}