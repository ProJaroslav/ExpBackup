import { RequestInterceptor } from "widgets/shared-code/helpers";

export default class IndexedDBCache {
    private static _isRunning = false;
    private static _cacheFromDb: Array<IDbCache>;
    private static _cacheDictionary: ICacheDictionary;
    private static _interceptor: __esri.RequestInterceptor;

    public static execute() {
        if (!IndexedDBCache._isRunning) {
            IndexedDBCache._isRunning = true;
            IndexedDBCache.setInterceptor();
            setTimeout(IndexedDBCache.clear, 60000);
        }
    }

    private static clear() {
        try {
            console.log("clear");

            RequestInterceptor.unregister(IndexedDBCache._interceptor)
            delete IndexedDBCache._cacheFromDb;
            if (!!IndexedDBCache._cacheDictionary) {
                for (let blobUrl of Object.values(IndexedDBCache._cacheDictionary)) {
                    URL.revokeObjectURL(blobUrl);
                }
            }
            delete IndexedDBCache._cacheDictionary;
            delete IndexedDBCache._interceptor;
        } catch(err) {
            console.warn(err);
        }
        finally {
            IndexedDBCache._isRunning = false;
        }
    }

    private static toBlob(cache: IDbCache): string {
        let blobUrl = URL.createObjectURL( new Blob( [ new TextEncoder().encode(cache.data) ], { type: "application/json;charset=utf-8" }) );

        if (!IndexedDBCache._cacheDictionary) {
            IndexedDBCache._cacheDictionary = {};
        }

        IndexedDBCache._cacheDictionary[cache.url] = blobUrl;

        return blobUrl;
    }

    private static getCachedUrl(url: string): string {
        try {
            if (!IndexedDBCache._isRunning) {
                return url;
            }

            if (!IndexedDBCache._cacheDictionary) {
                IndexedDBCache._cacheDictionary = {};
            }
    
            if (url in IndexedDBCache._cacheDictionary) {
                return IndexedDBCache._cacheDictionary[url];
            }

            if (!Array.isArray(IndexedDBCache._cacheFromDb)) {
                IndexedDBCache._cacheFromDb = [];
            }
    
            const cacheIndex = IndexedDBCache._cacheFromDb.findIndex(cache => cache.url === url);

            if (cacheIndex !== -1) {
                const cache = IndexedDBCache._cacheFromDb[cacheIndex];
                IndexedDBCache._cacheFromDb.splice(cacheIndex, 1);
                if (cache.exp > Date.now()) {
                    return IndexedDBCache.toBlob(cache);
                } else {
                    IndexedDBCache.deleteCache(url);
                }
            }

            return url;
        } catch(err) {
            console.warn(err);
            return url;
        }
    }

    private static getStore(callback: (store: IDBObjectStore) => void, error: (error: any) => void): void {
        const request = IndexedDBCache.request;
        request.onsuccess = function () { 
            try {
                const db = request.result;
                const transaction = db.transaction("cache", "readwrite");
            
                const store = transaction.objectStore("cache");
                callback(store);
                transaction.oncomplete = function () {
                    db.close();
                };
            } catch(err) {
                error(err);
            }
        }

        request.onerror = function(err) {
            error(err);
        }
    }

    private static async deleteCache(urls: Array<string> | string) {
        try {
            if (!urls) {
                return;
            }
            if (!Array.isArray(urls)) {
                urls = [urls];
            }
            if (urls.length > 0){
                IndexedDBCache.getStore(store => {
                    for (let url of urls) {
                        store.delete(url);
                    }
                }, err => {
                    console.warn(err);
                });
            }
        } catch(err) {
            console.warn(err);
        }
    }

    private static async loadCache() {
        try {
            IndexedDBCache.getStore(store => {
                const req = store.getAll();
                req.onsuccess = () => {
                    const toDelete: Array<string> = [];
                    const cacheFromDb: typeof IndexedDBCache._cacheFromDb = req.result;
    
                    if (Array.isArray(cacheFromDb)) {
                        IndexedDBCache._cacheFromDb = cacheFromDb.filter(cache => {
                            if (!!cache.exp && cache.exp > Date.now()) {
                                return true;
                            } else {
                                toDelete.push(cache.url);
                                return false;
                            }
                        });
                    }

                    console.log("start");
    
                    IndexedDBCache.deleteCache(toDelete);
                }
    
                req.onerror = err => {
                    console.warn(err);
                }
            }, err => {
                console.warn(err);
            });
        } catch(err) {
            console.warn(err);
        }
    }

    private static isBlob(url: string): boolean {
        return typeof url === "string" && url.includes("blob");
    }

    private static async storeResponse(response: __esri.RequestResponse) {
        try {
            if (!IndexedDBCache.isBlob(response.url) && typeof response.data === "object") {
                IndexedDBCache.getStore(store => {
                    const newCache: IDbCache = {
                        url: response.url,
                        data: JSON.stringify(response.data),
                        exp: new Date(Date.now() + 86400000).setHours(1)
                    };
                    store.put(newCache);
                    IndexedDBCache.toBlob(newCache);
                }, err => {
                    console.warn(err);
                });
            }
        } catch(err) {
            console.warn(err);
        }
    }

    private static async setInterceptor() {
        try {
            IndexedDBCache.loadCache();
            IndexedDBCache._interceptor = {
                before(args) {
                    console.log(args.url);
                    args.url = IndexedDBCache.getCachedUrl(args.url);
                },
                after: IndexedDBCache.storeResponse,
                urls: [
                    new RegExp(/MapServer\/layers/, "gm"),
                    new RegExp(/MapServer\/([0-9]+)$/, "gm"),
                    new RegExp(/MapServer\?/, "gm"),
                    // new RegExp(/MapServer$/, "gm"),
                    new RegExp(/MapServer\/([0-9]+)\?/, "gm")
                ]
            };

            await RequestInterceptor.register(IndexedDBCache._interceptor)
        } catch(err) {
            console.warn(err);
        }
    }

    private static get request() {
        const indexedDB = window.indexedDB
        const request = indexedDB.open("HSI", 1);

        request.onerror = function (event) {
            console.error("An error occurred with IndexedDB");
            console.error(event);
        };

        request.onupgradeneeded = function () {
            const db = request.result;
            db.createObjectStore("cache", { keyPath: "url" });
        };

        return request;
    }
}

interface IDbCache {
    url: string;
    data: string;
    exp: number;
}

interface ICacheDictionary {
    [url: string]: string;
}