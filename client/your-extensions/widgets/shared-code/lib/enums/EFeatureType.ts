/** - Typy prvků. */
export enum EFeatureType {
    /**
     * - Grafický prvek, získaný z podvrstvy.
     * - Prvek by měl být získaný pomocí metody queryFeatures.
     * - [Read more...](https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-support-Sublayer.html#queryFeatures)
     */
    Sublayer = 'sublayer',
    /**
     * - Negrafický prvkek získaný z tabulky.
     * - [Read more...](https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-FeatureLayer.html#isTable)
     */
    Table = "table"
};

export default EFeatureType;