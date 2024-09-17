import { React, type AllWidgetProps, utils } from 'jimu-core';
import { Button, ButtonGroup } from 'jimu-ui';
import EnvironmentList from "./components/reactstrap/EnvironmentList";
import SaveAsModal from "./components/SaveAsModal";
import { WidgetBody, WidgetWrapper, WarningContent } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { ArcGISJSAPIModuleLoader, NotificationHelper, LayerDefinitionHelper, LayerHelper } from "widgets/shared-code/helpers";
import translations from "./translations/default";
import { loadEnvironments, removeEnvironment, setEnvironments } from "./helpers/store";
import { CalciteLoader } from "calcite-components";
import { ELoadStatus } from 'widgets/shared-code/enums';
import SelectionManager from 'widgets/shared-code/SelectionManager';

const ModuleLoader = new ArcGISJSAPIModuleLoader(["Extent", "Viewpoint", "Point"]);

function Widget(props: AllWidgetProps<HSI.EnvironmentSettingsWidget.IMConfig>) {
    const messageFormater = useMessageFormater(translations);
    const jimuMapView = React.useContext(JimuMapViewContext);
    const [state, dispatchState] = React.useReducer(reducer, defaultState);

    //#region - Načtení prostředí.
    /** - Id dotazu načíání prostředí. */
    const lastLoadId = React.useRef<string>();
    /** Nové načtení prostředí. */
    const reloadEnvironments = React.useCallback(async () => {
        const loadId = lastLoadId.current = utils.getUUID();
        try {
            dispatchState({ type: EStateChange.loadEnvironment });

            const environments = await loadEnvironments(props.config.appKey);

            if (loadId === lastLoadId.current) {
                dispatchState({ type: EStateChange.environmentSuccess, environments });
            }
        } catch(err) {
            console.warn(err);
            if (loadId === lastLoadId.current) {
                dispatchState({ type: EStateChange.loadEnvironmentError, error: err });
            }
        }
    }, [props.config.appKey, lastLoadId]);

    React.useEffect(() => {
        reloadEnvironments();   

        return function() {
            lastLoadId.current = undefined;
        }
    }, [reloadEnvironments, lastLoadId]);
    //#endregion END - Načtení prostředí.

    /**
     * - Aplikace prostředí.
     * @param environmentId - Unikátní id prostředí. 
     */
    async function applyEnvironment(environmentId: string) {
        try {
            if (!ModuleLoader.isLoaded) {
                await ModuleLoader.load();
            }

            let environment: HSI.EnvironmentSettingsWidget.IPredefinedEnvironment | HSI.EnvironmentSettingsWidget.IEnvironment;
            environment = props.config.predefinedEnvironments.find(env => env.id === environmentId);

            if (!environment && state.loadState === ELoadStatus.Loaded) {
                environment = state.environments.find(env => env.id === environmentId);
            }

            let target: __esri.Viewpoint | __esri.Extent;

            if (!environment.viewpoint) {
                target = new (ModuleLoader.getModule("Extent"))(environment.extent);
            } else {
                const targetGeometry = new (ModuleLoader.getModule("Point"))(environment.viewpoint.targetGeometry);
                target = new (ModuleLoader.getModule("Viewpoint"))({ ...environment.viewpoint, targetGeometry });
            }

            jimuMapView.view.goTo(target);

            if ("layers" in environment) {
                const selectability: Array<HSI.SelectionStore.ILayerSelectability> = [];
                await Promise.all(environment.layers.map(layerSettings => {
                    return LayerDefinitionHelper
                        .findMapImageLayerByDefinition(jimuMapView, layerSettings)
                        .then(mapImageLayer => {
                            if (!!mapImageLayer) {
                                mapImageLayer.visible = layerSettings.visible;
                            } else if ("layerId" in layerSettings) {
                                return LayerDefinitionHelper
                                    .findSublayerByDefinition(jimuMapView, layerSettings)
                                    .then(sublayer => {
                                        if (!!sublayer) {
                                            sublayer.visible = layerSettings.visible;
                                            selectability.push({
                                                selectable: layerSettings.selectable,
                                                gisId: LayerHelper.getGisIdLayersFromLayer(sublayer)
                                            });         
                                        }
                                    });
                            }
                        })
                }));

                SelectionManager.getSelectionSet(jimuMapView).setSelectability(selectability);
            }

        } catch(err) {
            console.warn(err);
            NotificationHelper.handleError(messageFormater("filedToApplyEnvironment"), err, "warning");
        }
    }

    /**
     * - Odstranění prostředí.
     * @param environmentId - Id prostředí, které chceme odstranit.
     */
    async function deleteEnvironment(environmentId: string) {
        try {
            dispatchState({ type: EStateChange.setDeletingState, id: environmentId, state: ELoadStatus.Pending });
            await removeEnvironment(environmentId);
            dispatchState({ type: EStateChange.setDeletingState, id: environmentId, state: ELoadStatus.Loaded });
        } catch(err) {
            console.warn(err);
            NotificationHelper.handleError(messageFormater("failedToDeleteEnvironments"), err, "warning");
            dispatchState({ type: EStateChange.setDeletingState, id: environmentId, state: ELoadStatus.Error });
        }
    }

    /** - Vykreslení uživatelských prostředí. */
    function renderEnvironmentList() {
        switch(state.loadState) {
            case ELoadStatus.Pending:
                return <CalciteLoader label='' scale='m' />;

            case ELoadStatus.Error:
                return <WarningContent
                    title={messageFormater("failedToLoadEnvironments")}
                    message={state.error instanceof Error ? state.error.message : state.error}
                />;

            case ELoadStatus.Loaded:
                return <EnvironmentList
                    title={messageFormater("userEnvironmentsTitle")}
                    items={state.environments}
                    apply={applyEnvironment}
                    delete={deleteEnvironment}
                />;

            default:
                return <WarningContent
                    message={messageFormater("unhandledLoadState")}
                />;

        }
    }

    /** - Stažení uživatelských prostředí do souboru. */
    function downloadEnvironments() {
        try {
            if (state.loadState === ELoadStatus.Loaded && state.environments.length > 0) {
                const link = document.createElement("a");
                const file = new Blob([JSON.stringify(state.environments)], { type: 'application/json' });
                link.href = URL.createObjectURL(file);
                link.download = `${props.config.fileName}.json`;
                link.click();
                URL.revokeObjectURL(link.href);
            }
        } catch(err) {
            console.warn(err);
            NotificationHelper.handleError(messageFormater("failedToDownloadEnvironments"), err, "warning");
        }
    }

    /** - Načtení prostředí ze souboru. */
    function uploadEnvironments() {
        const loadId = lastLoadId.current = utils.getUUID();
        const currentEnvironments = state.loadState === ELoadStatus.Loaded ? state.environments : [];
        new Promise<typeof currentEnvironments>((resolve, reject) => {
            const input = document.createElement('input');
            input.setAttribute("type", "file");
            input.setAttribute("accept", "application/json");
            input.addEventListener('change', () => {
                dispatchState({ type: EStateChange.loadEnvironment });
                try {
                    const file = input.files[0];
                    if (!file) {
                        resolve(currentEnvironments);
                    } else {
                        var reader = new FileReader();
                        reader.onload = () => {
                            try {
                                const newEnvironments: typeof currentEnvironments = JSON.parse(reader.result.toString());
                
                                if (!Array.isArray(newEnvironments)) {
                                    throw new Error(messageFormater("invalidFile"));
                                }
                                let allEnvironments = [...currentEnvironments];
                                for (let environment of newEnvironments) {
                                    if (allEnvironments.some(({ id }) => id === environment.id)) {
                                        allEnvironments = allEnvironments.map(env => env.id === environment.id ? environment : env);
                                    } else {
                                        allEnvironments.push(environment);
                                    }
                                }
                                resolve(allEnvironments);
                            } catch(err) {
                                reject(err);
                            }
                        };
                        reader.readAsText(file);
                    }
                } catch(err) {
                    reject(err);
                }
            });
            input.click();
        })
            .then(async environments => {
                if (loadId === lastLoadId.current) {
                    await setEnvironments(environments, props.config.appKey);
                    if (loadId === lastLoadId.current) {
                        dispatchState({ environments, type: EStateChange.environmentSuccess });
                    }
                }
            })
            .catch(err => {
                if (loadId === lastLoadId.current) {
                    console.warn(err);
                    NotificationHelper.handleError(messageFormater("failedToUploadEnvironments"), err, "warning");
                    dispatchState({ environments: currentEnvironments, type: EStateChange.environmentSuccess });
                }
            });
    }

    /** - Vykreslení tlačítek v záhlavý. */
    function renderFooter(): JSX.Element {
        if (state.loadState === ELoadStatus.Error) {
            return <Button
                type='primary'
                onClick={reloadEnvironments}
            >
                {messageFormater("tryAgainButton")}
            </Button>;
                {/* <Button
                    type='danger'
                >
                    {messageFormater("clearButton")}
                </Button> */}
        }

        return <>
            <SaveAsModal
                onEnvironmetSaved={environment => dispatchState({ type: EStateChange.addEnvironment, environment })}
                disabled={state.loadState === ELoadStatus.Pending}
            />
            <Button
                disabled={state.loadState === ELoadStatus.Pending || state.loadState === ELoadStatus.Loaded && state.environments.length < 1}
                onClick={downloadEnvironments}
            >
                {messageFormater("backupButton")}
            </Button>
            <Button
                onClick={uploadEnvironments}
                disabled={state.loadState === ELoadStatus.Pending}
            >
                {messageFormater("loadFromFileButton")}
            </Button>
        </>;
    }

    return <WidgetBody
        widgetName='environment-settings'
        footer={<ButtonGroup size="sm">{renderFooter()}</ButtonGroup>}
    >
        <EnvironmentList
            title={messageFormater("predefinedEnvironmentsTitle")}
            items={props.config.predefinedEnvironments.asMutable()}
            apply={applyEnvironment}
        />
        <br/>
        {renderEnvironmentList()}
    </WidgetBody>
}

export default WidgetWrapper(Widget, { provideConfiguration: true });

/**
 * - Rozhoduje o změně state komponenty.
 * @param currentState - Současný state.
 * @param params - Parametry podle kterých se mění state.
 * @returns - Nový state.
 */
function reducer(currentState: IState, params: IStateChangeParams): IState {
    try {
        switch(params.type) {
            case EStateChange.addEnvironment:
                if (currentState.loadState !== ELoadStatus.Loaded) {
                    return currentState;
                }
                return {
                    environments: currentState.environments.concat(params.environment),
                    loadState: ELoadStatus.Loaded
                };
            case EStateChange.loadEnvironment:
                return {
                    loadState: ELoadStatus.Pending
                };
            case EStateChange.loadEnvironmentError:
                return {
                    loadState: ELoadStatus.Error,
                    error: params.error
                };

            case EStateChange.environmentSuccess:
                return {
                    loadState: ELoadStatus.Loaded,
                    environments: params.environments
                };

            case EStateChange.setDeletingState:
                if (currentState.loadState !== ELoadStatus.Loaded) {
                    return currentState;
                }

                let environments = currentState.environments;

                switch(params.state) {
                    case ELoadStatus.Loaded: // Došlo k odstranění
                        environments = environments.filter(({ id }) => id !== params.id);
                        break;
                    
                    case ELoadStatus.Error:
                        environments = environments.map(env => {
                            if (env.id === params.id) {
                                return {
                                    ...env,
                                    deleting: false
                                };
                            }
                            return env;
                        });
                        environments = [...environments];
                        break;

                    case ELoadStatus.Pending:
                        if (environments.some(({ id, deleting }) => id === params.id && deleting)) {
                            return currentState;
                        }

                        environments = environments.map(env => {
                            if (env.id === params.id) {
                                return {
                                    ...env,
                                    deleting: true
                                };
                            }
                            return env;
                        });
                        environments = [...environments];
                        break;
                }

                return {
                    loadState: ELoadStatus.Loaded,
                    environments
                };

            default:
                throw new Error(`Unhandled state change ${params['type']}`);
        }
        
    } catch(err) {
        console.warn(err);
        return currentState;
    }
}

const defaultState: IState = {
    loadState: ELoadStatus.Pending
};

type IState = IStateBase<ELoadStatus.Pending> | IStateLoaded | IStateError;

interface IStateLoaded extends IStateBase<ELoadStatus.Loaded> {
    /** - Načtená prostředí. */
    environments: Array<HSI.EnvironmentSettingsWidget.IEnvironmentWithDelete>;
}

interface IDeletingEnvironment {
    /** - ID prostředí které chceme odebrat. */
    id: string;
    /** - Stav odstranění. */
    state: ELoadStatus;
};

interface IStateError extends IStateBase<ELoadStatus.Error> {
    /** - Chyba při načítání prostředí. */
    error: Error;
}

interface IStateBase<T extends ELoadStatus> {
    /** - Stav načtení {@link environments prostředí}. */
    loadState: T;
}

type IStateChangeParams = IStateChangeAddEnvironment | IStateChangeParamsBase<EStateChange.loadEnvironmentError> & Pick<IStateError, "error"> | IStateChangeParamsBase<EStateChange.loadEnvironment> | IStateChangeParamsBase<EStateChange.environmentSuccess> & Pick<IStateLoaded, "environments"> | IStateChangeParamsBase<EStateChange.setDeletingState> & IDeletingEnvironment;
interface IStateChangeAddEnvironment extends IStateChangeParamsBase<EStateChange.addEnvironment> {
    /** - Nové prostředí. */
    environment: HSI.EnvironmentSettingsWidget.IEnvironment;
}

interface IStateChangeParamsBase<T extends EStateChange> {
    /** - Typ změny state. */
    type: T;
}

enum EStateChange {
    /** - Přidání prostředí. */
    addEnvironment,
    /** - Začalo načítání prostředí. */
    loadEnvironment,
    /** - Načítání prostředí úspěšně dokončeno. */
    environmentSuccess,
    /** - Načítání prostředí skončilo chybou. */
    loadEnvironmentError,
    /** - Nastavení stavu odstraňování prostředí. */
    setDeletingState
}