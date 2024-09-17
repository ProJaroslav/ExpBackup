import { React } from "jimu-core";
import ESelectedFeaturesType from "../enums/ESelectedFeaturesType";
import translations from "../translations/default";
import CreateRelationFeatureContext from "../contexts/CreateRelationFeatureContext";
import ParentFeatureContext from "../contexts/ParentFeatureContext";
import ReportGeneratorContext from "../contexts/ReportGeneratorContext";
import { RelationUpdateContext } from "../contexts/RelationUpdateContext";
import SupportFeatureSetsContext from "../contexts/SupportFeatureSetsContext";
import highlightRoute from "../helpers/highlightRoute";
import disconnectFeature from "../helpers/disconnectFeature";
import { NotificationHelper, FeatureHelper, DbRegistryLoader, LayerHelper, LayerDefinitionHelper, GeometryHelper, FloorHelper } from "widgets/shared-code/helpers";
import { EDbRegistryKeys, EContextMenuKeys } from "widgets/shared-code/enums";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { useConfig, useMessageFormater } from "widgets/shared-code/hooks";
import { AssetsProviderContext, PopperContext } from "widgets/shared-code/contexts";
import SelectionManager from "widgets/shared-code/SelectionManager";

/** - Hook poskytujicí funkci která vyvolává kontextovou nabídku nad prvkem ve stromové struktuře. */
export default function(params: IUseFeatureContextMenuParams | IUseRelationFeatureContextMenuParams): (ev: React.MouseEvent<HTMLDivElement, MouseEvent>) => void {
    const jimuMapView = React.useContext(JimuMapViewContext);
    const assetsProvider = React.useContext(AssetsProviderContext);
    const popper = React.useContext(PopperContext);
    const messageFormater = useMessageFormater(translations);
    const createRelationFeatureRef = React.useContext(CreateRelationFeatureContext);
    const parentFeature = React.useContext(ParentFeatureContext);
    const relationUpdate = React.useContext(RelationUpdateContext);
    const reportGeneratorRef = React.useContext(ReportGeneratorContext);
    const supportFeatureSets = React.useContext(SupportFeatureSetsContext);
    const config = useConfig<HSI.SelectionResultWidget.IMConfig>();

    if (![ESelectedFeaturesType.Feature, ESelectedFeaturesType.TableFeature, ESelectedFeaturesType.RelationFeature, ESelectedFeaturesType.RelationTableFeature].includes(params.featureType)) {
        return function (ev) {
            ev.stopPropagation();
            ev.preventDefault();
            params.selectFeature();
        } 
    }

    return async function(ev) {
        try {
            ev.stopPropagation();
            ev.preventDefault();
            params.selectFeature();

            popper({
                reference: params.itemReference,
                position: {
                    x: ev.clientX,
                    y: ev.clientY
                },
                loading: true
            });

            const [layerDefinition, contextMenuSettings] = await Promise.all([
                LayerDefinitionHelper.getLayerDefinitionFromFeature(jimuMapView, params.feature),
                DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.SelectionContextMenu, scope: "g", type: "json" })
            ]);
    
            /** - Nastavení kontextové nabídky pro vrstvu {@link layerId}. */
            const sublayerSetting = contextMenuSettings
                ?.layers
                ?.find(layerSetting => LayerDefinitionHelper.matchMapImageLayerDefinition(layerSetting, layerDefinition))?.
                sublayers
                ?.find(sublayerSetting => {
                    return sublayerSetting.layerId === layerDefinition.layerId
                });
    
            /** - Speciální akce v kontextové nabídce pro tento prvek. */
            const actions = Array.isArray(sublayerSetting?.actions) ? sublayerSetting.actions : [];
            /** - Obsah kontextové nabídky. */
            const list: Array<HSI.IPopperListItem> = [];
    
            if ([ESelectedFeaturesType.Feature, ESelectedFeaturesType.TableFeature].includes(params.featureType)) {
                //#region - Odebrání z výběru
                list.push({
                    content: messageFormater('removeFeatureContextMenu'),
                    icon: require("jimu-ui/lib/icons/delete-12.svg"),
                    closeOnClick: true,
                    onClick() {
                        if (params.featureType === ESelectedFeaturesType.TableFeature) {
                            SelectionManager.getSelectionSet(jimuMapView).destroyTableFeature(params.feature);
                        } else {
                            SelectionManager.getSelectionSet(jimuMapView).destroyFeature(params.feature);
                        }
                        params.onSelect({ type: ESelectedFeaturesType.Empty });
                    }
                });
                //#endregion
            } else {
                //#region - Přidání do výběru
                list.push({
                    content: messageFormater("addFeatureContextMenu"),
                    icon: require("jimu-ui/lib/icons/add-12.svg"),
                    closeOnClick: true,
                    onClick() {
                        if (params.featureType === ESelectedFeaturesType.RelationFeature) {
                            SelectionManager.getSelectionSet(jimuMapView).updateByFeatureIds(LayerHelper.getGisIdLayersFromLayer(LayerHelper.getSublayerFromFeature(params.feature)), [params.feature.getObjectId()]);
                        } else {
                            SelectionManager.getSelectionSet(jimuMapView).updateByTableFeatureIds(LayerHelper.getTableFromFeature(params.feature).id, [params.feature.getObjectId()]);
                        }
                    }
                });
                //#endregion
                //#region - Zrušení relační vazby
                let removeRelationAction = actions.find(action => action.key === EContextMenuKeys.RemoveRelation) as HSI.DbRegistry.IContextMenuAction<EContextMenuKeys.RemoveRelation>;
    
                if (removeRelationAction?.enabled && !config.forbidEditing && (!Array.isArray(removeRelationAction.allowedRelations) || removeRelationAction.allowedRelations.includes((params as IUseRelationFeatureContextMenuParams).relationshipClassId))) {
                    list.push({
                        content: messageFormater("disconnectFeatureContextMenu"),
                        icon: assetsProvider("disconnect.svg"),
                        closeOnClick: true,
                        onClick: async function() {
                            disconnectFeature(jimuMapView, params.feature, parentFeature)
                                .then(relationshipClassId => {
                                    relationUpdate([{
                                        feature: params.feature,
                                        relationshipClassId
                                    }, {
                                        relationshipClassId,
                                        feature: parentFeature
                                    }]);
                                })
                                .catch(err => {
                                    console.warn(err);
                                    NotificationHelper.addNotification({ type: "warning", message: messageFormater("disconnectFeatureFailed") });
                                });
                        }
                    });
                }
                //#endregion
            }
    
            //#region - Zoom a posunutí na prvek.
            if (params.featureType === ESelectedFeaturesType.Feature || params.featureType === ESelectedFeaturesType.RelationFeature || supportFeatureSets[FeatureHelper.getTableFeatureGisId(params.feature)]) {
                list.push({
                    content: messageFormater("zoomFeatureContextMenu"),
                    closeOnClick: true,
                    icon: assetsProvider("loupe.svg"),
                    onClick() {
                        if (params.featureType === ESelectedFeaturesType.Feature || params.featureType === ESelectedFeaturesType.RelationFeature) {
                            GeometryHelper.zoom(jimuMapView, [params.feature])
                                .catch(err => { console.warn(err); });
    
                            FloorHelper.setFloorByFeature(jimuMapView, params.feature)
                                .catch(err => { console.warn(err); });
    
                        } else {
                            let featureSet = supportFeatureSets[FeatureHelper.getTableFeatureGisId(params.feature)];
                            GeometryHelper.zoom(jimuMapView, featureSet.features)
                                .catch(err => { console.warn(err); });
                            
                            FloorHelper.setFloorByFeatureSet(jimuMapView, featureSet)
                                .catch(err => {
                                    console.warn(err);
                                });
                        }
                    }
                }, {
                    content: messageFormater("moveFeatureContextMenu"),
                    icon: assetsProvider("move.svg"),
                    closeOnClick: true,
                    onClick() {
                        if (params.featureType === ESelectedFeaturesType.Feature || params.featureType === ESelectedFeaturesType.RelationFeature) {
                            GeometryHelper.pan(jimuMapView, [params.feature])
                                .catch(err => { console.warn(err); });
    
                            FloorHelper.setFloorByFeature(jimuMapView, params.feature)
                                .catch(err => { console.warn(err); });
                        } else {
                            let featureSet = supportFeatureSets[FeatureHelper.getTableFeatureGisId(params.feature)];
    
                            GeometryHelper.pan(jimuMapView, featureSet.features)
                                .catch(err => { console.warn(err); });
                            
                            FloorHelper.setFloorByFeatureSet(jimuMapView, featureSet)
                                .catch(err => {
                                    console.warn(err);
                                });
                        }
                    }
                });
            }
            //#endregion
    
            //#region - Vygenerování odkazu na prvek.
            list.push({
                content: messageFormater("featureLinkContextMenu"),
                icon: require('jimu-ui/lib/icons/toc-add-link.svg'),
                closeOnClick: true,
                onClick() {
                    params.copyLinkModalRef.current.open(params.feature);
                }
            });
            //#endregion
    
            if ([ESelectedFeaturesType.Feature, ESelectedFeaturesType.TableFeature].includes(params.featureType)) {
                //#region - Vytvoření relace
                let createRelationAction = actions.find(action => action.key === EContextMenuKeys.CreateRelation) as HSI.DbRegistry.IContextMenuAction<EContextMenuKeys.CreateRelation>;
        
                if (createRelationAction?.enabled && !config.forbidEditing) {
                    list.push({
                        content: messageFormater("createRelationFeatureContextMenu"),
                        closeOnClick: true,
                        icon: assetsProvider("relation.svg"),
                        onClick() {
                            createRelationFeatureRef.current.open({
                                feature: params.feature,
                                featureType: params.featureType,
                                allowedRelations: createRelationAction.allowedRelations
                            });
                        }
                    });
                }
                //#endregion
                
                //#region - Automatické vyplnění aktuálního data revize
                let reviewAction = actions.find(action => action.key === EContextMenuKeys.ReviewDate) as HSI.DbRegistry.IContextMenuAction<EContextMenuKeys.ReviewDate>;
        
                if (reviewAction?.enabled && !config.forbidEditing) {
                    list.push({
                        content: messageFormater("dataReviewContextMenu"),
                        closeOnClick: true,
                        icon: assetsProvider("show-selection.svg"),
                        onClick() {
                            FeatureHelper.updateAttributesDespiteEditability(jimuMapView, params.feature, {[reviewAction.attributeName]: Date.now()})
                                .then(() => {
                                    NotificationHelper.addNotification({ message: messageFormater("dataReviewSuccess"), type: "success" });
                                })
                                .catch(err => {
                                    console.warn(err);
                                    NotificationHelper.addNotification({ message: messageFormater("dataReviewFailed"), type: "warning" });
                                });
                        }
                    });
                }
                //#endregion
                
                //#region - Přidání trasy do výběru
                let routeHighlightAction = actions.find(action => action.key === EContextMenuKeys.RouteHighlight) as HSI.DbRegistry.IContextMenuAction<EContextMenuKeys.RouteHighlight>;
        
                if (routeHighlightAction?.enabled) {
                    list.push({
                        content: messageFormater("routeContextMenu"),
                        closeOnClick: true,
                        icon: assetsProvider("path.svg"),
                        onClick() {
                            highlightRoute(jimuMapView, params.feature, routeHighlightAction)
                                .then(success => {
                                    if (!success) {
                                        NotificationHelper.addNotification({ message: messageFormater("routeNotFound"), type: "info" });
                                    }
                                })
                                .catch(err => {
                                    NotificationHelper.addNotification({ message: messageFormater("highlightRouteFailed").replace("{0}", err instanceof Error ? err.message : err), type: "warning" });
                                    console.warn(err);
                                })
                        }
                    });
                }
                //#endregion
            }
    
            //#region - Vygenerování protokolu
            if (!config.forbidEditing) {
                const generateProtocolAction = actions.find(action => action.key === EContextMenuKeys.GenerateProtocol) as HSI.DbRegistry.IContextMenuAction<EContextMenuKeys.GenerateProtocol>;
        
                if (generateProtocolAction?.enabled) {
                    list.push({
                        content: messageFormater("generateReportFeatureContextMenu"),
                        icon: assetsProvider("report.svg"),
                        closeOnClick: true,
                        onClick() {
                            reportGeneratorRef.current.createReportFeature(params.feature, generateProtocolAction);
                        }
                    });
                //Může se z prvku vygenerovat protokol přímo?
                } else {
                    if (Array.isArray(contextMenuSettings?.layers)) {
                        topLoop:
                        for (let layer of contextMenuSettings.layers) {
                            if (Array.isArray(layer?.sublayers)) {
                                for (let sublayer of layer.sublayers) {
                                    if (Array.isArray(sublayer?.actions)) {
                                        for (let action of sublayer.actions) {
                                            if (action?.enabled && action.key === EContextMenuKeys.GenerateProtocol && LayerDefinitionHelper.matchDefinition(action.reportTable, layerDefinition)) {
                                                list.push({
                                                    content: messageFormater("generateReportFeatureContextMenu"),
                                                    icon: assetsProvider("report.svg"),
                                                    closeOnClick: true,
                                                    onClick() {
                                                        reportGeneratorRef.current.featureReport(params.feature, action as HSI.DbRegistry.IContextMenuAction<EContextMenuKeys.GenerateProtocol>);
                                                    }
                                                });
                                                break topLoop;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            //#endregion
    
            popper({
                reference: params.itemReference,
                position: {
                    x: ev.clientX,
                    y: ev.clientY
                },
                list
            });
        } catch(err) {
            console.warn(err);
        }
    }
} 

export interface IUseFeatureContextMenuParams extends IUseFeatureContextMenuParamsBase<ESelectedFeaturesType.TableFeature | ESelectedFeaturesType.Feature> {};

export interface IUseRelationFeatureContextMenuParams extends IUseFeatureContextMenuParamsBase<ESelectedFeaturesType.RelationTableFeature | ESelectedFeaturesType.RelationFeature> {
    /** - Jednoznačný technologický identifikátor relační třídy ze které byl {@link feature prvek} načten. */
    relationshipClassId: string;
}

interface IUseFeatureContextMenuParamsBase<T extends ESelectedFeaturesType> extends Pick<HSI.SelectionResultWidget.ITreeItemCommonProps, "onSelect"> {
    /** - Funkce vybírajicí prvek {@link feature} ve stromové struktuře. */
    selectFeature: () => void;
    /** - Prvek ke kterému zobrazujeme kontextovou nabídku. */
    feature: __esri.Graphic;
    /** - Reference prvku nad kterým je Popper vyvolán. */
    itemReference: HSI.IPopperParams["reference"];
    /** - Reference dialogu pro zobrazení vygenerované URL. */
    copyLinkModalRef: React.MutableRefObject<HSI.LinkFeatureModalComponent.ILinkFeatureModalMethods>;
    /** - Typ prvku */
    featureType: T;
}