import { React } from "jimu-core";

/** - Poskytuje prvky poskytujicí geometrii negrafickým prvkům, uložené pod GisId negragického prvku. */
export const SupportFeatureSetsContext = React.createContext<{[gisId: string]: __esri.FeatureSet;}>({});

export default SupportFeatureSetsContext;