/**
 * - Relativní cesty k rozšíření widgetů.
 * - [Read more...](https://developers.arcgis.com/experience-builder/guide/extension-points/)
 */
export enum EKnownWidgetExtentison {
    /**
     * - Rozšíření HSI.
     * - Registrace widgetů které se starají o určité akce v aplikaci.
     * - Jedná se o akce, které se mají vyvolat hned po načtení aplikace a pouze jednou (např. přečtení url parametrů).
     * - Vždy se zaregistruje první načnený widget, který má povoleno se o určitou akci starat.
     */
    FirstRenderHandler = "extensions/reduxStores/first-render-handler-store",
    /**
     * - Rozšíření HSI.
     * - Vyvolání a zobrazení notifikací.
     */
    Notification = "extensions/reduxStores/notification-store",
    /**
     * - Rozšíření HSI.
     * - Měnit a číst prvky ve výběru.
     */
    Selection = "extensions/reduxStores/selection-store"
}

export default EKnownWidgetExtentison;