import { React, BaseWidget, IMState } from 'jimu-core';
import { WidgetWrapperContent } from "widgets/shared-code/components";

/**
 * - Obaluje komponentu widgetu často používanými funkcemi (načtení JimuMapView, předání konfigurace, atd...).
 * - @see {@link https://reactjs.org/docs/higher-order-components.html}
 * @param WidgetComponent - Hlavní komponeta widgetu.
 * @param options - Specifikace chování componenty.
 */
export default function (WidgetComponent: React.FunctionComponent<HSI.WidgetWrapper.IExtendedProps>, options: HSI.WidgetWrapper.IOptionProps = {}) {
    class WidgetWrapper extends BaseWidget<HSI.WidgetWrapper.IProps, {}> {
        constructor(props: HSI.WidgetWrapper.IProps) {
            super(props);
        }

        static mapExtraStateProps(state: IMState): HSI.WidgetWrapper.IPropsExtension {
            let extraProps: HSI.WidgetWrapper.IPropsExtension = {};
    
            // if (options.urlParser) {
                extraProps = {
                    appConfig: state.appConfig,
                    queryObject: state.queryObject,
                    hsiFirstRenderHandler: state.hsiFirstRenderHandler
                };
            // }
    
            // if (options.useNotification) {
            //     if (!state.hsiNotification) {
            //         console.warn("Notifikace v Redux store nejsou inicializovány! Pravděpodobně chybí cesta v manifest.json")
            //     } else {
                    extraProps.notificationWidgetId = state.hsiNotification?.widgetId;
                // }
            // };
    
            return extraProps;
        }

        render() {
            return <WidgetWrapperContent {...this.props} {...options}>
                <WidgetComponent {...this.props} />
            </WidgetWrapperContent>;
        }
    }

    return WidgetWrapper;
}