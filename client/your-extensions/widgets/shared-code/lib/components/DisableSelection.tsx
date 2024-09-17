import { React } from "jimu-core";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { DbRegistryLoader } from "widgets/shared-code/helpers";
import { EDbRegistryKeys } from "widgets/shared-code/enums";
import { type JimuLayerView } from "jimu-arcgis";

/** - Zabraňuje standadním výběrům ExB (pokud je to v konfiguaci povoleno). */
export default React.memo(function() {
    const jimuMapView = React.useContext(JimuMapViewContext);

    React.useEffect(() => {
        if (!!jimuMapView) {
            let isActive = true;

            function jimuLayerViewSelectedFeaturesChangeListener(jimuLayerView: JimuLayerView) {
                location.hash = ""
            }

            (async function() {
                try {
                    const disableSelection = await DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.DisableSelection, scope: "g", type: "bool" })

                    if (disableSelection && isActive) {
                        
                        
                        jimuMapView.addJimuLayerViewSelectedFeaturesChangeListener(jimuLayerViewSelectedFeaturesChangeListener);
                    }
                } catch(err) {
                    console.warn(err);
                }
            })();

            return function() {
                isActive = false;
                jimuMapView.removeJimuLayerViewSelectedFeaturesChangeListener(jimuLayerViewSelectedFeaturesChangeListener);
            }
        }
    }, [jimuMapView]);

    //#region - Zajímavá alternativa, příklad jak pracovat se standardními výběry.
    // const [useDataSources, setDataSources] = useState<ImmutableArray<UseDataSource> | undefined>();

    // React.useEffect(() => {
    //     if (!!jimuMapView) {
    //         let isActive = true;

    //         (async function() {
    //             try {
    //                 const disableSelection = await DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.DisableSelection, scope: "g", type: "bool" })

    //                 if (disableSelection && isActive) {
    //                     const jimuLayerViews = await jimuMapView.whenAllJimuLayerViewLoaded();
    //                     const dataSources: Array<UseDataSource> = [];
    //                     for (let jimuLayerView of Object.values(jimuLayerViews)) {
    //                         if (jimuLayerView.type === "feature") {
    //                             dataSources.push({
    //                                 dataSourceId: jimuLayerView.layerDataSourceId,
    //                                 mainDataSourceId: jimuLayerView.layerDataSourceId,
    //                                 rootDataSourceId: jimuMapView.dataSourceId
    //                             });
    //                         }
    //                     }
            
    //                     if (isActive) {
    //                         setDataSources(Immutable(dataSources));
    //                     }
    //                 }
    //             } catch(err) {
    //                 console.warn(err);
    //             }
    //         })();

    //         return function() {
    //             isActive = false;
    //         }
    //     }
    // }, [jimuMapView]);

    // return <MultipleDataSourceComponent useDataSources={useDataSources} >
    //     {() => {
    //         jimuMapView.clearSelectedFeatures();
    //         return <></>;
    //     }}
    // </MultipleDataSourceComponent>;
    //#endregion END - Zajímavá alternativa, příklad jak pracovat se standardními výběry.

    //#region - Do verze 1.10
    // React.useEffect(() => {
    //     if (!!queryObject?.data_id && !!jimuMapView) {
    //         DbRegistryLoader
    //             .fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.DisableSelection, scope: "g", type: "bool" })
    //             .then(disableSelection => {
    //                 if (disableSelection) {
    //                     // let url = new URL(location.href);
    //                     // url.searchParams.delete("data_id");
    //                     // history.pushState("", "", url);
    //                     jimuMapView.clearSelectedFeatures();
    //                 }
    //             })
    //             .catch(err => {
    //                 console.warn(err);
    //             })
    //     }
    // });

    // React.useEffect(() => {
    //     if (jimuMapView) {
    //         DbRegistryLoader
    //         .fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.DisableSelection, scope: "g", type: "bool" })
    //         .then(disableSelection => {
    //             if (disableSelection) {
    //                     jimuMapView.view.popup.highlightEnabled = false;
    //                 }
    //             })
    //             .catch(err => {
    //                 console.warn(err);
    //             })
    //     }
    // }, [jimuMapView]);

    // return <></>;
    //#endregion END - Do verze 1.15
    
    return <></>;
    
})