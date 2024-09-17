/** - Druhy aplikací výberu. */
export enum ESelectionType {
    /** - Nový výběr. */
    New = 'new',
    /** - Přidat k výběru. */
    Add = "add",
    /** - Odebrat z výběru. */
    Remove = "remove",
    /** - Výběr z výběru. */
    Reduce = "reduce"
};

export default ESelectionType;