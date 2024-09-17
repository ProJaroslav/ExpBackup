
import { type JimuMapView } from "jimu-arcgis";
import { getAppStore } from "jimu-core";

/** - Metody pomáhající v práci s Esri objekty a ExB. */
export default class EsriHelper {
    /**
     * - Zničení {@link instance instance objektu}.
     * @param instance - Instance objektu, kterou chceme zničit.
     */
    public static destroy(instance: __esri.Accessor) {
        if (!!instance && !instance.destroyed && typeof instance.destroy === "function") {
            instance.destroy();
        }
    }

    /**
     * - Zrušení {@link listeners naslouchání}.
     * @param listeners - Naslouchání která chceme zrušit.
     */
    public static removeListeners(listeners: Array<__esri.Handle> | __esri.Handle) {
        if (!Array.isArray(listeners)) {
            if (!!listeners) {
                return EsriHelper.removeListeners([listeners]);
            }
        } else {
            listeners.forEach(listener => listener.remove());
        }
    }

    /**
     * - Odebrání {@link layer vrtvy} z {@link jimuMapView mapy}.
     * - Instance {@link layer vrtvy} se zničí pomocí {@link destroy}.
     * @param jimuMapView - View mapy, ze které se odebírá {@link layer vrtva}.
     * @param layer - Vrstva, která se odebírá z {@link jimuMapView mapy}.
     */
    public static removeLayerFromMap(jimuMapView: JimuMapView, layer: __esri.Layer) {
        if (typeof jimuMapView?.view?.map?.remove === "function") {
            jimuMapView.view.map.remove(layer);
        }

        EsriHelper.destroy(layer);
    }

    /**
     * - Je minor verze ExB vetší než {@link version číslo}?
     * @param version - Číslo ke kterému ověřujeme minor verzi.
     */
    public static isExbMinorVersionHigher(version: number): boolean {
        return EsriHelper.exbMinorVersion > version;
    }

    /** - Verze ExB. */
    public static get exbVersion(): string {
        return getAppStore().getState().appConfig.exbVersion;
    }

    /** - Minor verze ExB. */
    public static get exbMinorVersion(): number {
        return parseInt(EsriHelper.exbVersion.split(".")[1]);
    }
};
