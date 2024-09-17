import { getAppStore, React } from "jimu-core";
import { ENotificationActionKeys } from "widgets/shared-code/enums";
import { ArcGISJSAPIModuleLoader } from "widgets/shared-code/helpers";

export default class NotificationHelper {
    /**
     * - Vytvoření notifikace uživateli.
     * - V "manifest.json" musí být přidat cesta k "widgets/shared-code/lib/reduxStores/notification-store".
     * - @see {@link https://developers.arcgis.com/experience-builder/guide/extension-points/}
     * @param params - Parametry notifikace.
     */
    public static addNotification(params: Omit<HSI.NotificationStore.IAlertProps, "id">) {
        getAppStore().dispatch(NotificationHelper.createAddNotificationAction(params));
    }
    
    /**
     * - Vytvoření akce pro notifikace uživateli.
     * - V "manifest.json" musí být přidat cesta k {@link HSI.NotificationStore}.
     * @param params - Parametry notifikace.
     */
    public static createAddNotificationAction(params: Omit<HSI.NotificationStore.IAlertProps, "id">): HSI.NotificationStore.IAddNotificationAction {
        return {
            type: ENotificationActionKeys.Add,
            alertProps: params
        };
    }

    /**
     * - Zobrazení chybové notifikace.
     * - V "manifest.json" musí být přidat cesta k {@link HSI.NotificationStore}.
     * @param title - Titulek notifikace.
     * @param error - Odchycená výjimka.
     * @param type - Typ notifikace.
     */
    public static handleError(title: string, error: Error | __esri.Error, type: HSI.NotificationStore.IAlertProps['type'] = "error") {
        NotificationHelper.addNotification({ type, message: NotificationHelper.getErrorMessage(error), title });
    }

    /**
     * - Poskytuje popis {@link error chyby}.
     * @param error - Odchycená chyba.
     */
    public static getErrorMessage(error: Error | __esri.Error): string {
        let message: string = "";
        if (error instanceof Error || (typeof error === "object" && "message" in error)) {
            message = error.message;
        } else if (typeof error === "string") {
            message = error;
        } 

        return message;
    }
    
    /**
     * - Vytvoření notifikace uživateli o chybě při ukládání změn přes "applyEdits".
     * - {@link error Chybová hláška z applyEdits} by měla v textu obsahovat "Error number", "Error message" a "Script error", což zobrazíme v notifikaci.
     * - V "manifest.json" musí být přidat cesta k {@link HSI.NotificationStore}.
     * @param message - Chybová hláška.
     * @param error - Objekt chyby z applyEdits, obsahující "Error number", "Error message" a "Script error".
     */
    public static addApplyEditsErrorNotification(message: string, error: any) {
        const errNo = NotificationHelper.findSubstring(error, "Error number:");
        const errMessage = NotificationHelper.findSubstring(error, "Error message:");
        const errScript = NotificationHelper.findSubstring(error, "Script error:");
    
        let messageElement = <span>
            {message}
            {!!errNo && !!errMessage ? <span><br/>{errNo.trim()}: {errMessage.trim()}</span> : null}
            {!!errScript ? <span><br/>{errScript.trim()}</span> : null}
        </span>;
    
        NotificationHelper.addNotification({ type: "error", message: messageElement });
    }
    
    /**
     * - Nalezení hodnoty v {@link error chybové hlášce z applyEdits}.
     * @param error - Objekt chyby z applyEdits.
     * @param key - Klíč v textu jehož hodnotu hledáme.
     * @example findSubstring([Objekt obsahující text "Arcade script raised an error. [\nRule name: PO_HP_POVINNOST,\nTriggering event: Insert,\nClass name: PO_HP,\nGlobalID: {8E516E7B-18B4-4523-98F5-813FB2DF9188},\nError number: 10001,\nError message: Není nastavený povinný atribut,\nScript error: Není nastaven správně rok výroby.]"], "Error number:") => "10001"
     * @example findSubstring([Objekt obsahující text "Arcade script raised an error. [\nRule name: PO_HP_POVINNOST,\nTriggering event: Insert,\nClass name: PO_HP,\nGlobalID: {8E516E7B-18B4-4523-98F5-813FB2DF9188},\nError number: 10001,\nError message: Není nastavený povinný atribut,\nScript error: Není nastaven správně rok výroby.]"], "Script error:") => "Není nastaven správně rok výroby"
     */
    private static findSubstring(error: any, key: string) {
        if (Array.isArray(error?.details?.messages)) {
            let errorDetail = error.details.messages[0];
    
            if (typeof errorDetail === "string") {
                const errNoIndex = errorDetail.indexOf(key);
                if (errNoIndex !== -1) {
                    let errNoComaIndex = errorDetail.indexOf(",", errNoIndex + key.length)
                    if (errNoComaIndex > (errNoIndex + key.length)) {
                        return errorDetail.substring(errNoIndex + key.length, errNoComaIndex);
                    }
    
                    errNoComaIndex = errorDetail.indexOf(".", errNoIndex + key.length)
    
                    if (errNoComaIndex > (errNoIndex + key.length)) {
                        return errorDetail.substring(errNoIndex + key.length, errNoComaIndex);
                    }
    
                    errNoComaIndex = errorDetail.indexOf("]", errNoIndex + key.length)
    
                    if (errNoComaIndex > (errNoIndex + key.length)) {
                        return errorDetail.substring(errNoIndex + key.length, errNoComaIndex);
                    }
                }
        
            }
        }
    }
};
