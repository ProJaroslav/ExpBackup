/** - Známé rozšíření mapových služeb. */
export enum EKnownLayerExtension {
    /** - FeatureAccess. */
    FeatureServer = "FeatureServer",
    /** - SOE pro poskytnutí relací. */
    RelationSoe = 'RelationSoe',
    /** - SOE pro poskytnutí historie prvku. */
    HistorySoe = 'HistorySoe',
    /** - SOE pro poskytnutí dat z databázového registru. */
    DbRegistrySoe = 'DbRegistrySoe',
    /** - SOE pro práci s žádankami. */
    AssetManagementSoe = 'AssetManagementSoe',
    /** - SOE pro poskytnutí domén v mapové službě. */
    DomainSoe = 'DomainSoe',
    /** - SOE pro operace na SD (Pozemky, LayerInfo, ApplyEdits) */
    SdSoe = "SdSoe"
};

export default EKnownLayerExtension;