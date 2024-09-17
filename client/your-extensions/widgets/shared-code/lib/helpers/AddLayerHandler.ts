import { JimuMapView } from "jimu-arcgis";
import { ArcGISJSAPIModuleLoader, DbRegistryLoader } from "widgets/shared-code/helpers";
import { getAppStore } from "jimu-core";

export default class AddLayerHandler {
    private static promise: Promise<void>;

    public static execute(jimuMapView: JimuMapView): Promise<void> {
        if (!AddLayerHandler.promise) {
            AddLayerHandler.promise = new Promise(async (resolve, reject) => {
                try {
                    const config = await DbRegistryLoader.fetchDbRegistryValue(jimuMapView, {
                        //@ts-ignore
                        name: "services.on.load",
                        scope: "g",
                        type: "json"
                    });
                    const userName = getAppStore().getState().user.username;

                    const servideArr = config[userName in config ? userName : "default"];
                    
                    const MapImageLayer = await ArcGISJSAPIModuleLoader.getModule("MapImageLayer");
                    const FeatureLayer = await ArcGISJSAPIModuleLoader.getModule("FeatureLayer");

                    for (let url of servideArr) {
                        const mapImageLayer = new MapImageLayer({ url });
                        await mapImageLayer.load();
                        jimuMapView.view.map.add(mapImageLayer);

                        for (let table of mapImageLayer.sourceJSON.tables) {
                            jimuMapView.view.map.tables.add(new FeatureLayer({ url: `${mapImageLayer.url}/${table.id}` }));
                        }
                    }

                    resolve();
                } catch(err) {
                    reject(err);
                }
            });
        }
        return AddLayerHandler.promise;
    }
};