import { React } from "jimu-core";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { ESymbolRenderType } from "widgets/shared-code/enums";

/**
 * - Poskytuje kopii symbolu {@link symbol}, s upravenou velikostí a polohou vůči kurzoru myši, na základě měřítka mapy.
 * @param symbol - Symbol ze kterého se vychází.
 * @param sizeRenderer - Parametry podle kterých se velikost mění.
 * @param callback - Funkce poskytujicí upravenou kopii symbolu {@link symbol}. Funkce by měla být memoizovaná aby nedocházelo k zbytečnému znovunaslouchání na změnu měřítka.
 */
export default function<T extends __esri.Symbol>(symbol: T, sizeRenderer: HSI.ISymbolSizeRenderer, callback: (symbol: T) => void): void {
    const jimuMapView = React.useContext(JimuMapViewContext);

    React.useEffect(() => {
        try {
            if (!!jimuMapView && !!symbol) {
                /** - Vytvoření kopie symbolu {@link symbol}. */
                function colneSymbol<S extends __esri.PictureMarkerSymbol | __esri.SimpleMarkerSymbol>(): S {
                    return (symbol as any as S).clone() as S;
                }

                /** - Úprava velikosti a polohy vůči kurzoru myši symbolu na základě měřítka mapy.*/
                function updateSymbolSize() {
                    try {
                        /** - Poměr velikosti symbolu vůči měřítku mapy {@link jimuMapView.view.scale}. */
                        let sizeRatio = 1,
                            originHeight: HSI.ISymbolSizeRenderer<ESymbolRenderType.ScaleRatio>['originHeight'],
                            originWidth: HSI.ISymbolSizeRenderer<ESymbolRenderType.ScaleRatio>['originWidth'];
                    
                        if (sizeRenderer?.type === ESymbolRenderType.ScaleRatio) {
                            sizeRatio = sizeRenderer.originScale / jimuMapView.view.scale;
                            originHeight = sizeRenderer.originHeight;
                            originWidth = sizeRenderer.originWidth;
                        }
                    
                        switch (symbol.type) {
                            case "picture-marker":
                                const pictureMarker = colneSymbol<__esri.PictureMarkerSymbol>();
                    
                                pictureMarker.width *= originWidth || sizeRatio;
                                pictureMarker.height *= originHeight || sizeRatio;
                                pictureMarker.xoffset *= sizeRatio;
                                pictureMarker.yoffset *= sizeRatio;
    
                                callback(pictureMarker as any);
                    
                                break;
                            default:
                                console.warn(`Unhandled symbol type ${symbol.type}`);
                                callback(symbol);
                                break;
                        }
                    } catch(err) {
                        console.warn(err);
                    }
                }

                const listener = jimuMapView.view.watch("scale", updateSymbolSize);

                updateSymbolSize();

                return function() {
                    listener.remove();
                }
            }
        } catch(err) {
            console.warn(err);
        }
    }, [jimuMapView, symbol, sizeRenderer, callback]);
}