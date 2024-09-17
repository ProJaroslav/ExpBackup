import { React } from "jimu-core";

/**
 * - Předává funkci, která poskytuje cestu k souboru uloženeho ve složce "assets".
 * @see {@link https://developers.arcgis.com/experience-builder/guide/use-assets/#load-dynamically}.
 * @see {@link https://reactjs.org/docs/context.html}.
 */
export const AssetsProviderContext = React.createContext<(fileName: string) => string>(() => {
    console.warn("Assets provider is not implemented!");
    return "";
});

export default AssetsProviderContext;