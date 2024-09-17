/** - Druhy objektů ve stromové struktuře výsledků výběru. */
export enum ESelectedFeaturesType {
    /** - Grafický prvek z výběru podvrstvy. */
    Feature = 'feature',
    /** - Podvrstva s prvky ve výběru. */
    Layer = 'layer',
    /** - Relační třída. */
    RelationClass = 'relationship',
    /** - Navazbený grafický prvek. */
    RelationFeature = 'relation',
    /** - Navazbený negrafický prvek. */
    RelationTableFeature = 'table-relation',
    /** - Není zvolen žádný prvek. */
    Empty = 'empty',
    /** - Negrafická vrstva (tabulka) s prvky ve výběru. */
    Table = 'table',
    /** - Negrafický prvek z výběru. */
    TableFeature = "table-feature"
};

export default ESelectedFeaturesType;