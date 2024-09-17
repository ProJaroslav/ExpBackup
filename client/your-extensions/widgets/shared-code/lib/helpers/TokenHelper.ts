import { ArcGISJSAPIModuleLoader } from "widgets/shared-code/helpers";

export default class TokenHelper {

    /**
     * - Poskytuje validní token.
     * - Před vypršením platnosti naposledy poskytnutého tokenu, vygeneruje a poskytne nový token.
     * @param portalUrl - Url adresa portálu.
     * @param callback - Funkce poskytující validní token.
     * @param errorCallback - Funkce, která se zavolá pokud nastane chyba.
     * @returns - Funkce pro zrušení generování tokenů.
     */
    public static provideValidToken(portalUrl: string, callback: (token: string) => void, errorCallback?: (error: Error) => void): () => void {
        let isActive = true;
    
        const onError = (error: Error) => {
            if (isActive) {
                isActive = false;
                if (typeof errorCallback === "function") {
                    errorCallback(error);
                } else {
                    console.warn(error);
                }
            }
        }
    
        /**
         * - 30s před vypršením platnosti {@link token tokenu} se vygeneruje nový token.
         * @param token - Současný token.
         */
        const updateToken = (token: Pick<IToken, "expires" | "token">) => {
            if (isActive) {
                if ((token.expires - Date.now() - 30000) < 1) {
                    TokenHelper.generateToken(portalUrl, token.token)
                        .then(updateToken)
                        .catch(onError);
                } else {
                    callback(token.token);
    
                    setTimeout(() => {
                        TokenHelper.generateToken(portalUrl, token.token)
                            .then(updateToken)
                            .catch(onError);
                    }, token.expires - Date.now() - 30000)
                }
            }
        }
    
        ArcGISJSAPIModuleLoader.getModule("IdentityManager")
            .then(async IdentityManager => {
                return IdentityManager.getCredential(portalUrl);
            })
            .then(updateToken)
            .catch(onError);
    
        return () => {
            isActive = false;
        }
    }
    
    /**
     * - Vygenerování nového tokenu.
     * @param portalUrl Url adresa portálu.
     * @param validToken - Ještě validní token.
     */
    public static async generateToken(portalUrl: string, validToken?: string): Promise<IToken> {
        const IdentityManager = await ArcGISJSAPIModuleLoader.getModule("IdentityManager");
        return IdentityManager.generateToken(
            IdentityManager.findServerInfo(portalUrl),
            IdentityManager.findOAuthInfo(portalUrl),
            { token: validToken, serverUrl: portalUrl, ssl: true }
        );
    }
};


interface IToken extends Pick<__esri.Credential, "expires" | "ssl" | "token"> {
    validity: number;
}