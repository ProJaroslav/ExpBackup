/** - Informace o stavu vrstev/podvrstev ve stromové struktuře správce vrstev uložená pod jejich unikátním id. */
export interface ILayerStructure {
    [uniqueId: string]: {
        /** - Informace o tom zda je vrstva/podvrstva "otevrěná" ve stromové struktuře správce vrstev. */
        expanded: boolean;
        /**
         * - Pořadí vnořených vstev/podvrstev.
         * - Kolekce unikátních id zobrazení vrstev/podvrstev ve stromové struktuře.
         */
        sublayers?: Array<string>;
    };
};

export default ILayerStructure; 