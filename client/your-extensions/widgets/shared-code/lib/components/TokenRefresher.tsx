import { React } from "jimu-core";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { RequestInterceptor, DbRegistryLoader, TokenHelper } from "widgets/shared-code/helpers";
import { EDbRegistryKeys } from "widgets/shared-code/enums";

/**
 * - Zajišťuje aktualizaci tokenu pro standardní Esri request (pokud je to povoleno v konfiguraci).
 * - Vytvořeno z důvodu, že pro mapovou službu LetGISTech (projekt LetGIS) nám po vypršení tokenu vyskakuje přihlašovací okno, tímto řešením se tomu zabrání.
 */
export default React.memo(function() {
    const jimuMapView = React.useContext(JimuMapViewContext);

    React.useEffect(() => {
        /** - Funkce, odebírající aktualizaci tokenu. */
        let clear = () => {};
        (async function() {
            try {
                if (!!jimuMapView) {
                    const refreshToken = await DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.RefeshToken, scope: "g", type: "bool" });

                    if (refreshToken) {
                        const portalUrl: string = jimuMapView.view.map?.['portalItem']?.['portal']?.['url'] || "";
                        const serverUrl = portalUrl.split("portal")[0];

                        let token: string;

                        TokenHelper.provideValidToken(portalUrl, (t => {
                            token = t;
                        }));

                        const interceptor: __esri.RequestInterceptor = {
                            before(params: { url: string; requestOptions: __esri.RequestOptions; }) {
                                if (!!params.requestOptions) {
                                    if (!params.requestOptions.query) {
                                        params.requestOptions.query = {};
                                    }
                                    params.requestOptions.query.token = token;
                                }
                            },
                            urls: new RegExp(`${serverUrl}((?!\/server\/login).)*$`, "gm")
                        };

                        await RequestInterceptor.register(interceptor);
                        
                        clear = () => {
                            RequestInterceptor.unregister(interceptor);
                        }
                    }
                }
            } catch(err) {
                console.warn(err);
            }
        })();

        return function() {
            clear();
        }
    }, [jimuMapView]);

    return <></>;
})