import ILayerStructure from "./ILayerStructure";

export interface ITreeStructureState {
    /** - Současné měřítko mapy. */
    scale: number;
    /** - Informace o stavu vrstev/podvrstev ve stromové struktuře správce vrstev uložená pod jejich unikátním id. */
    layerStructure: ILayerStructure;
    /**
     * - Pořadí vstev/podvrstev na nejvišší urovni.
     * - Kolekce id/GisId vrstev/podvrstev.
     */
    baseLayers: Array<string>;
    /** - Má být umožněno potvrzení platnosti dat (Specifická funkcionalita pro LetGIS)? */
    canValidateData: boolean;
};

export default ITreeStructureState; 