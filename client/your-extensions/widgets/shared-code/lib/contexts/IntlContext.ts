import { React, IntlShape, AllWidgetProps } from "jimu-core";

/**
 * - Předává parametr {@link AllWidgetProps.intl} z widgetu.
 * @see {@link https://developers.arcgis.com/experience-builder/guide/extend-base-widget/#i18n-support}.
 * @see {@link https://reactjs.org/docs/context.html}.
 */
export const IntlContext = React.createContext<IntlShape>(null);

export default IntlContext;