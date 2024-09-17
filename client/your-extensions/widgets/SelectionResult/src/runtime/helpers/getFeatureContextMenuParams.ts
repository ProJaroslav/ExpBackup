import ESelectedFeaturesType from '../enums/ESelectedFeaturesType';
import { IUseFeatureContextMenuParams, IUseRelationFeatureContextMenuParams } from '../hooks/useFeatureContextMenu';

export default function(props: HSI.SelectionResultWidget.ITableFeatureItemProps | HSI.SelectionResultWidget.IFeatureItemProps, params: Pick<IUseFeatureContextMenuParams, "itemReference" | "copyLinkModalRef" | "selectFeature"> & { isTable: boolean; }): IUseFeatureContextMenuParams | IUseRelationFeatureContextMenuParams {
    const useFeatureContextMenuParamsBase: Omit<IUseFeatureContextMenuParams, "featureType"> = {
        feature: props.feature,
        itemReference: params.itemReference,
        onSelect: props.onSelect,
        selectFeature: params.selectFeature,
        copyLinkModalRef: params.copyLinkModalRef
    };

    if (props.isRelation) {
        return {
            ...useFeatureContextMenuParamsBase,
            featureType: params.isTable ? ESelectedFeaturesType.RelationTableFeature : ESelectedFeaturesType.RelationFeature,
            relationshipClassId: props.relationshipClassId
        };
    } else {
        return {
            ...useFeatureContextMenuParamsBase,
            featureType: params.isTable ? ESelectedFeaturesType.TableFeature : ESelectedFeaturesType.Feature
        };
    }
}