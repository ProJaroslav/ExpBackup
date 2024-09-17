declare namespace HSI {
    namespace TableOfContentsWidget {
        /** - Informace o stavu vrstev/podvrstev ve stromové struktuře správce vrstev uložená pod jejich unikátním id. */
        interface ILayerStructure {
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

        interface ITreeStructureState {
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

        /**
         * - Popis neexistujicí(virtuální) vrstvy.
         * - Tato vrstva se sobrazuje ve stromové struktuře widgetu "TableOfContents", a umožňuje aby se jevila jako nadřazená vrstva vrstvám, které jsou ve webmapě zanořené někde jinde.
         */
        interface IVirtualLayerDefinition {
            /** - Název vrstvy zobrazujicí se ve stromové struktuře. */
            title: string;
            /** - Identifikátor virtuální vrstvy. */
            id: string;
        }
        
        /**
         * Data využívána pro renderování symbolů dle typu jejich renderu:
         * {@link __esri.Symbol}, pro {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-symbols-support-symbolUtils.html#renderPreviewHTML}
         * {@link IPieChartSymbolData}, pro {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-symbols-support-symbolUtils.html#renderPieChartPreviewHTML}
         */
        interface ISymbolData {
            symbolForRender: __esri.Symbol | IPieChartSymbolData
            label?: string;
        }
        interface IPieChartSymbolData {
            colors: __esri.Color[]
        }
    }
}