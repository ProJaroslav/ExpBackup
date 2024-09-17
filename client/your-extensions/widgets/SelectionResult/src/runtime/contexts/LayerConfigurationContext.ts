import { React } from "jimu-core";

/** - Poskytuje konfiguraci editovatelnosti pro vrstvu ze které pochází označený prvek. */
export const LayerConfigurationContext = React.createContext<HSI.DbRegistry.ISublayerEditabilityConfiguration | HSI.DbRegistry.ITableEditabilityConfiguration>(null);

export default LayerConfigurationContext;