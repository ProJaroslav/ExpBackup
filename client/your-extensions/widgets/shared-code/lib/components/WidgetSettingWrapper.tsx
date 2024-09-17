import { type ImmutableObject, React } from 'jimu-core';
import { Button, CollapsablePanel, TextInput, UrlInput } from 'jimu-ui';
import { type AllWidgetSettingProps } from 'jimu-for-builder';
import { MapWidgetSelector, SettingRow, SettingSection } from 'jimu-ui/advanced/setting-components';
import { useMessageFormater } from "widgets/shared-code/hooks";
import translations from "./translations/default";
import { TrashOutlined } from 'jimu-icons/outlined/editor/trash';

// type IExtraProps<P extends boolean = false, D extends boolean = false> = {
//     /**
//      * - True pokud widget nemá JimuMapView (žádným způsobem napracuje s mapou).
//      * - Pokud 'false', componenta nezobrazí možnost výběru widgetu poskytujicí JimuMapView.
//      */
//     ignoreJimuMapView?: boolean;
//     /** - Mají se u tohoto widgetu nastavit rolem které jsou potřeba pro otevření widgetu? */
//     permissionSettings?: P;
//     /** - Má se u tohoto widgetu zobrazit nastavení pro {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-FeatureLayer.html#dynamicDataSource dynamicDataSource vrstvy}? */
//     dynamicLayerSettings?: D;
// } & (D extends true ? IDynamicLayerExtraProps : {})

type IExtraProps<P extends boolean, D extends boolean> = P extends true ? ( D extends true ? IFullExtraProps : IPermissionExtraProps ) : ( D extends true ? IDynamicExtraProps : IMapOnlyExtraProps );

interface IExtraPropsBase<P extends boolean, D extends boolean> {
    /**
     * - True pokud widget nemá JimuMapView (žádným způsobem napracuje s mapou).
     * - Pokud 'false', componenta nezobrazí možnost výběru widgetu poskytujicí JimuMapView.
     */
    ignoreJimuMapView?: boolean;
    /** - Mají se u tohoto widgetu nastavit rolem které jsou potřeba pro otevření widgetu? */
    permissionSettings?: P;
    /** - Má se u tohoto widgetu zobrazit nastavení pro {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-FeatureLayer.html#dynamicDataSource dynamicDataSource vrstvy}? */
    dynamicLayerSettings?: D;
}

interface IDynamicLayerExtraProps<P extends boolean> {
    dynamicLayerExtension?: React.FunctionComponent<AllWidgetSettingProps<ImmutableObject<IConfig<P, true>>>>;
}

interface IFullExtraProps extends IDynamicLayerExtraProps<true>, IExtraPropsBase<true, true> {}
interface IDynamicExtraProps extends IDynamicLayerExtraProps<false>, IExtraPropsBase<false, true> {}
interface IPermissionExtraProps extends IExtraPropsBase<true, false> {}
interface IMapOnlyExtraProps extends IExtraPropsBase<false, false> {}

interface IFullConfig extends HSI.ConfigExtensions.IRequiredRoles, HSI.ConfigExtensions.IDynamicLayerExtension {}

type IConfig<P extends boolean, D extends boolean> = P extends true ? (D extends true ? IFullConfig : HSI.ConfigExtensions.IRequiredRoles) : (D extends true ? HSI.ConfigExtensions.IDynamicLayerExtension : any);

/**
 * - Obaluje komponentu nastavení widgetu často používanými funkcemi (výběr widgetu poskytujicí JimuMapView, atd...).
 * - @see {@link https://reactjs.org/docs/higher-order-components.html}
 * @param WidgetSettingComponent - Hlavní komponeta nastavení widgetu.
 * @param options - Specifikace chování componenty.
 */
export default function<P extends boolean, D extends boolean, T extends IConfig<P, D>>(WidgetSettingComponent: React.FunctionComponent<AllWidgetSettingProps<ImmutableObject<T>>>, options: IExtraProps<P, D> = {}) {
    return function(props: AllWidgetSettingProps<ImmutableObject<T>>) {
        const messageFormater = useMessageFormater(translations);

        function jimuMapView(child: JSX.Element) {
            if (options.ignoreJimuMapView) {
                return child;
            }
            return <>
                <SettingSection title={messageFormater("selectMap")}>
                    <SettingRow>
                        <MapWidgetSelector
                            onSelect={useMapWidgetIds => {
                                props.onSettingChange({ id: props.id, useMapWidgetIds });
                            }}
                            useMapWidgetIds={props.useMapWidgetIds}
                        />
                    </SettingRow>
                </SettingSection>
                {child}
            </>;
        }

        function permissionSettings(child: JSX.Element) {
            if (options.permissionSettings) {
                const config = props.config as ImmutableObject<HSI.ConfigExtensions.IRequiredRoles>;
                return <>
                    <SettingSection>
                        <CollapsablePanel label={messageFormater("permissionSettings")}>
                            <SettingRow>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        props.onSettingChange({
                                            id: props.widgetId,
                                            config: config.set("requiredRoles", !config.requiredRoles ? [""] : config.requiredRoles.concat(""))
                                        });
                                    }}
                                >
                                    {messageFormater("addRole")}
                                </Button>
                            </SettingRow>
                            {
                                !config.requiredRoles ? <></> : config.requiredRoles.asMutable().map((role, index) => {
                                    return <SettingRow key={index}>
                                        <TextInput
                                            value={role}
                                            onChange={ev => {
                                                const requiredRoles = config.requiredRoles.asMutable();
                                                requiredRoles[index] = ev.target.value;
                                                props.onSettingChange({
                                                    id: props.widgetId,
                                                    config: config.set("requiredRoles", requiredRoles)
                                                });
                                            }}
                                        />
                                        <Button onClick={() => {
                                            const requiredRoles = config.requiredRoles.asMutable();
                                            requiredRoles.splice(index, 1);
                                            props.onSettingChange({
                                                id: props.widgetId,
                                                config: config.set("requiredRoles", requiredRoles)
                                            });
                                        }}>
                                            <TrashOutlined style={{ margin: 0 }}/>
                                        </Button>
                                    </SettingRow>;
                                })
                            }
                        </CollapsablePanel>
                    </SettingSection>
                    {child}
                </>;
            }
            return child;
        }

        function dynamicDataSource(child: JSX.Element) {
            if (!options.dynamicLayerSettings) {
                return child;
            }

            const config = props.config as unknown as ImmutableObject<IConfig<boolean, true>>;

            return <>
                <SettingSection>
                    <CollapsablePanel label={messageFormater("dynamicLayer")}>
                        <SettingRow label={messageFormater("searchUrlLabel")}></SettingRow>
                        <SettingRow>
                            <UrlInput
                                schemes={["https"]}
                                onChange={res => {
                                    props.onSettingChange({
                                        id: props.widgetId,
                                        config: config.set("dynamicServiceUrl", res.value)
                                    });
                                }}
                                value={config.dynamicServiceUrl}
                            />
                        </SettingRow>
                        <SettingRow label={messageFormater("workspaceId")}>
                            <TextInput
                                className='w-50'
                                onChange={ev => {
                                    props.onSettingChange({
                                        id: props.widgetId,
                                        config: config.set("workspaceId", ev.target.value)
                                    });
                                }}
                                value={config.workspaceId}
                            />
                        </SettingRow>
                        {
                            !options.dynamicLayerExtension ? <></> : 
                            //@ts-ignore
                            <options.dynamicLayerExtension {...props} />
                        }
                    </CollapsablePanel>
                </SettingSection>
                {child}
            </>;
        }

        return <div className={`widget-setting-${props.manifest.name}`}>
            {jimuMapView(permissionSettings(dynamicDataSource(<WidgetSettingComponent {...props} />)))}
        </div>;
    }
}