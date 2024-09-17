/** - Způsoby získaní geometrie podle které se prování výběr. */
export enum EGeometrySelect {
    /** - Vytvořit kresbu. */
    Create = "create",
    /** - Převzít geometrii z prvku ve výběru. */
    Copy = "copy",
    /** - Převzít geometrii ze všech prvků ve výběru. */
    CopyAll = "copyAll"
};

export default EGeometrySelect;