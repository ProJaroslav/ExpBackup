import ArcGISJSAPIModuleLoader from "./ArcGISJSAPIModuleLoader";

export default class RequestInterceptor {
    private static readonly ArcGISJSAPIModuleLoader = new ArcGISJSAPIModuleLoader(['config']);
    private static interceptors: Array<__esri.RequestInterceptor> = [];

    public static register(interceptor: __esri.RequestInterceptor) {
        RequestInterceptor.interceptors.push(interceptor);
        return RequestInterceptor.update();
    }

    public static unregister(interceptor: __esri.RequestInterceptor) {
        RequestInterceptor.interceptors = RequestInterceptor.interceptors.filter(i => i !== interceptor)
        return RequestInterceptor.update();
    }

    private static async update() {
        if (!RequestInterceptor.ArcGISJSAPIModuleLoader.isLoaded) {
            await RequestInterceptor.ArcGISJSAPIModuleLoader.load();
        }

        const config = RequestInterceptor.ArcGISJSAPIModuleLoader.getModule("config");

        const urls: Array<string | RegExp> = [];

        for (let interceptor of RequestInterceptor.interceptors) {
            if (!interceptor.urls) {
                interceptor = null;
                break;
            }

            if (Array.isArray(interceptor.urls)) {
                urls.push(...interceptor.urls);
            } else {
                urls.push(interceptor.urls);
            }
        }

        let interceptor: __esri.RequestInterceptor = { urls };

        if (RequestInterceptor.interceptors.some(interceptor => !!interceptor.before)) {
            interceptor.before = (params: IInterceptorBefore) => {
                let beforeReturnValue: any;
                for (let inter of RequestInterceptor.interceptors) {
                    if (!!inter.before && RequestInterceptor.matchUrls(params.url, inter.urls)) {
                        let returnValue = inter.before(params);
                        if (!!returnValue) {
                            beforeReturnValue = returnValue;
                        }
                    }
                }

                return beforeReturnValue;
            }
        }

        if (RequestInterceptor.interceptors.some(interceptor => !!interceptor.after)) {
            interceptor.after = params => {
                for (let inter of RequestInterceptor.interceptors) {
                    if (!!inter.after && RequestInterceptor.matchUrls(params.url, inter.urls)) {
                        inter.after(params);
                    }
                }
            }
        }

        config.request.interceptors = [interceptor];
    }

    private static matchUrls(url: string, urls: __esri.RequestInterceptor['urls']): boolean {
        if (!urls) {
            return true;
        }

        if (Array.isArray(urls)) {
            return urls.some(u => RequestInterceptor.matchUrls(url, u));
        }

        if (typeof urls === "string") {
            return url.startsWith(urls);
        }

        if (urls instanceof RegExp) {
            return !!url.match(urls)?.[0];
        }

        return false;
    }
}

interface IInterceptorBefore {
    url: string;
    requestOptions: __esri.RequestOptions;
}