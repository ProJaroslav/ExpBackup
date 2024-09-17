/** - Zajišťuje, že definované vrstvy budou mít vždy stejnou viditelnost. */
export default class DependentVisibilityManager {
    private static readonly listeners: Array<IDependentVisibilityManagerListener> = [];

    /**
     * - Zajišťuje, že při změně viditelnosti jakékoliv z {@link dependencyLayers vrstev} se změní i viditelnost ostatních {@link dependencyLayers vrstev}.
     * @param dependencyLayers - Vrstvy u kterých chceme zajistit stejnou viditelnost.
     */
    public static register(dependencyLayers: IDependentVisibilityManagerListener['dependentVisibilityLayers']): void {
        if (!Array.isArray(dependencyLayers) || dependencyLayers.length < 2) { //Funkčnost má smysl pouze s více než jednou vrstvou
            return;
        }

        dependencyLayers.forEach(dependentLayer => {
            DependentVisibilityManager.addListener(dependentLayer, dependencyLayers.filter(l => l !== dependentLayer));
        });
    }

    /**
     * - Vytváří naslouchání na změnu viditelnosti {@link layer vrstvy} a podle ní mění viditelnost {@link dependentVisibilityLayers závislých vrstev}.
     * @param layer - Vrstva na jejíž změnu viditelnosti se vytvoří naslouchání a podle které se bude měnit viditelnost {@link dependentVisibilityLayers závislých vrstev}.
     * @param dependentVisibilityLayers - Vrstvy jejichž viditelnist se změní při změně viditelnosti vrstvy {@link layer}.
     */
    private static addListener(layer: IDependentVisibilityManagerListener['layer'], dependentVisibilityLayers: IDependentVisibilityManagerListener['dependentVisibilityLayers']): void {
        if (!Array.isArray(dependentVisibilityLayers) || dependentVisibilityLayers.length < 1) {
            return;
        }
        
        const currentLayerListener = DependentVisibilityManager.listeners.find(listener => listener.layer === layer);

        if (!currentLayerListener) {
            const newListener: IDependentVisibilityManagerListener = {
                dependentVisibilityLayers,
                layer,
                listener: layer.watch("visible", visible => {
                    newListener.dependentVisibilityLayers.forEach(dependentLayer => {
                        dependentLayer.visible = visible;
                    });
                })
            };

            DependentVisibilityManager.listeners.push(newListener);
        } else {
            dependentVisibilityLayers.forEach(dependentLayer => {
                if (!currentLayerListener.dependentVisibilityLayers.includes(dependentLayer)) {
                    currentLayerListener.dependentVisibilityLayers.push(dependentLayer);
                }
            });
        }
    }

};

interface IDependentVisibilityManagerListener {
    /** - Vrstva na jejíž změnu viditelnosti je vytvořené {@link listener naslouchání}. */
    layer: __esri.Layer | __esri.Sublayer;
    /** - Vrstvy jejichž viditelnist se změní při změně viditelnosti vrstvy {@link layer}. */
    dependentVisibilityLayers: Array<IDependentVisibilityManagerListener['layer']>;
    /** - Naslouchání na změnu viditelnosti {@link layer vrstvy}. */
    listener: __esri.WatchHandle;
}