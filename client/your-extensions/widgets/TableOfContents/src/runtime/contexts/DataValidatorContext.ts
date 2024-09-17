import { React } from "jimu-core";

/** - Poskytuje funkce souvisejicí s potvrzením platnosti dat (Specifická funkcionalita pro LetGIS). */
export const DataValidatorContext = React.createContext<IDataValidatorMethods>({
    canValidate() { return false; },
    validate() { return Promise.resolve(); }
});

export interface IDataValidatorMethods {
    /** - Ověřuje zda má přihlášený uživatel právo potvrdit platnost dat pro danou podvrstvu. */
    canValidate: (sublayer: __esri.Sublayer) => boolean;
    /** - Potvrzení platnosti dat pro danou podvrstvu. */
    validate: (sublayer: __esri.Sublayer) => Promise<void>;
}

export default DataValidatorContext;