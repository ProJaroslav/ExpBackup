import { React } from "jimu-core";
import { ArcGISJSAPIModuleLoader } from "widgets/shared-code/helpers";
import translations from "../translations/default";
import { useMessageFormater } from "widgets/shared-code/hooks";

const symbolUtilsLoader = new ArcGISJSAPIModuleLoader(["symbolUtils"]);

/** 
 * Vykreslení {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-symbols-Symbol.html} pro daný 
 * SubLayerItem na základě typu jeho {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-renderers-Renderer.html}
 * */
export default function LegendItem(props: HSI.TableOfContentsWidget.ISymbolData) {
    const { symbolForRender, label } = props;
    const messageFormater = useMessageFormater(translations);
    const legendRef = React.useRef<HTMLDivElement>(null);
    const [loadStatus, setLoadStatus] = React.useState<{ status: "pending" | "success" | "error" | null, message: string | null }>({ status: null, message: null });

    React.useEffect(() => {
        let isActive = true;

        setLoadStatus({ status: "pending", message: "Načtání" });
        const loadSymbol = async () => {
            try {
                if (!symbolForRender || typeof symbolForRender !== "object") {
                    throw new Error(messageFormater("wrongSymbolType").replace("{4}", typeof symbolForRender));
                }

                if (!symbolUtilsLoader.isLoaded) {
                    await symbolUtilsLoader.load();
                }

                const symbolUtils = symbolUtilsLoader.getModule("symbolUtils");
                let element: HTMLElement;
                if ("type" in symbolForRender) {
                    element = await symbolUtils.renderPreviewHTML(symbolForRender, {});
                } else if ("colors" in symbolForRender) {
                    element = symbolUtils.renderPieChartPreviewHTML(symbolForRender.colors);
                } else {
                    throw new Error(messageFormater("wrongSymbolType").replace("{4}", (symbolForRender as Object).toString()));
                }

                if (isActive && legendRef.current) {
                    legendRef.current.innerHTML = '';
                    legendRef.current.appendChild(element);
                    setLoadStatus({ status: "success", message: null });
                }
            } catch (e) {
                if (isActive) {
                    const errorMessage = messageFormater("errorLoadingSymbol").replace("{3}", e.toString());
                    setLoadStatus({ status: "error", message: errorMessage });
                    console.warn(errorMessage);
                }
            }
        };

        loadSymbol();

        return () => {
            isActive = false;
        };
    }, [symbolForRender, messageFormater]);

    return (
        <div className={"hsi-tree hsi-tree-item hsi-tree-item-legend"}>
            {label !== null ? <label>{label}</label> : ""}
            <div ref={legendRef}></div>
            {loadStatus.status !== "success" && <p>{loadStatus.message || loadStatus.status}</p>}
        </div>
    );
}


