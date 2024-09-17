export enum ESelectionActionKeys {
    /** - Započal výběr v podvrstvách. */
    SelectionStart = "selection-start",
    /** - Skončil výběr v jedné podvrstvě. */
    SelectionEnd = "selection-end",
    /** - Výběr v jedné podvrstvě skončil chybou. */
    SelectionFail = "selection-failed",
    /** - Započal výběr v negrafických vrstvách (tabulkách). */
    TableSelectionStart = "table-selection-start",
    /** - Skončil výběr v jedné negrafické vrstvě (tabulce). */
    TableSelectionEnd = "table-selection-end",
    /** - Výběr v jedné negrafické vrstvě (tabulce) skončil chybou. */
    TableSelectionFail = "table-selection-failed",
    /** - Odebraly se všechny prvky z výběru. */
    DropSelection = "drop-selection",
    /** - Přepnutí vybíratelnosti podvrstev. */
    ToggleSelectability = "toggle-selectability",
    /** - Vyvolání překreslení komponent (Např. při změně ve featureSetu). */
    Rerender = "rerender"
};

export default ESelectionActionKeys;