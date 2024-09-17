/** - Seznam funkcí v kontextové nabídce výsledků výběru (widget "SelectionResult"). */
export enum EContextMenuKeys {
    /** - Vytvoření relací mezi objekty. */
    CreateRelation = 'create-relation',
    /** - Vyplnění data revize. */
    ReviewDate = 'review-date',
    /** - Zvýraznění trasy. */
    RouteHighlight = "route-highlight",
    /** - Odebrání relací mezi objekty. */
    RemoveRelation = 'remove-relation',
    /** - Generování protokolu. */
    GenerateProtocol = 'generate-protocol'
}

export default EContextMenuKeys;