import { React } from "jimu-core";

/**
 * - Poskytuje prnví nadřazený prvek ve stromové struktuře.
 * - Místo kde se tento context volá, je část kódu starajicí se o relační prvek / třídu, prvku který je tímto contextem poskytnut.
 */
export const ParentFeatureContext: React.Context<__esri.Graphic> = React.createContext(null);

export default ParentFeatureContext;