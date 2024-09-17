import CreateRelationFeature, { ICreateRelationFeatureRef } from "../componets/CreateRelationFeature";
import { React } from "jimu-core";

/** - Poskytuje referenci komponenty {@link CreateRelationFeature}. */
export const CreateRelationFeatureContext = React.createContext<React.MutableRefObject<ICreateRelationFeatureRef>>(null);

export default CreateRelationFeatureContext;