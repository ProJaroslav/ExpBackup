/** - Způsoby volby vrstev ve kterých se bude prováďet výběr. */
export enum ESelectInOption {
    /** - Vybíratelné vrstvy dle tabulky (TOC). */
    Toc = "toc",
    /** - Výběr jedné vrstvy ve formuláři. */
    Layer = "layer",
    /** - Výběr pouze z nejvišší vrstvy v mapě. */
    Top = 'top' 
};

export default ESelectInOption;