import { React } from "jimu-core";
import { useDisplayFeature } from "widgets/shared-code/hooks";
import { LinkFeatureModal } from "widgets/shared-code/components";
import { FeatureHelper } from "widgets/shared-code/helpers";
import ESelectedFeaturesType from "../enums/ESelectedFeaturesType";
import FeatureIcon from "./FeatureIcon";
import FeatureChildrenRenderer from "./FeatureChildrenRenderer";
import SelectionTreeItem from "./SelectionTreeItem";
import SelectionTreeItemContent from "./SelectionTreeItemContent";
import Expander from "./Expander";
import useFeatureContextMenu from '../hooks/useFeatureContextMenu';
import getFeatureContextMenuParams from "../helpers/getFeatureContextMenuParams";
import LoadErrorAlert from "./LoadErrorAlert";
import { useConfig } from "widgets/shared-code/hooks";


/** - Zobrazení grafického prvku ve stromové struktuře výběrů. */
export default function(props: HSI.SelectionResultWidget.IFeatureItemProps) {
    const itemReference = React.useRef<HTMLDivElement>();
    /** - GisId prvku {@link props.feature} */
    const gisId = FeatureHelper.getFeatureGisId(props.feature);
    /** - Unikátní id zobrazení objektu. */
    const id = `${props.parentId}_${gisId}`;
    /** - Je prvek vybraný (zvírazněný) ve stromové struktuře? */
    const isSelected = props.selectedId === id;
    /** - Typ prvku. */
    const featureType = props.isRelation ? ESelectedFeaturesType.RelationFeature : ESelectedFeaturesType.Feature;
    /** - Reference dialogu pro zobrazení vygenerované URL. */
    const copyLinkModalRef = React.useRef<HSI.LinkFeatureModalComponent.ILinkFeatureModalMethods>();
    /**-  Otevření kontextového menu. */
    const onContextMenu = useFeatureContextMenu(getFeatureContextMenuParams(props, { copyLinkModalRef, isTable: false, itemReference, selectFeature }));
    const displayFeature = useDisplayFeature({ displayField: props.displayField });
    const config = useConfig<HSI.SelectionResultWidget.IMConfig>();

    /** - Označení prvku ve stromové struktuře. */
    function selectFeature() {
        props.onSelect({
            type: featureType,
            features: [props.feature],
            geometryType: props.geometryType,
            id
        });
    }
    return <SelectionTreeItem
        ref={itemReference}
        onContextMenu={onContextMenu}
    >
        <SelectionTreeItemContent
            level={props.level}
            isSelected={isSelected}
            onClick={selectFeature}
        >
            {!config.forbidEnableRelations ? (
            <Expander
                expanded={props.objectState?.expanded}
                toggleExpand={() => {
                    props.toggleExpand({ id, gisId, parentId: props.parentId });
                    props.loadRelationClasses(props.feature);
                }}
            />) : null}
            <FeatureIcon geometryType={props.geometryType} />

            <span className='selection-tree-item-title'>
                {displayFeature(props.feature)}
            </span>
            
            <LoadErrorAlert gisId={gisId} loadedRelationClasses={props.loadedRelationClasses} />
        </SelectionTreeItemContent>
        <FeatureChildrenRenderer
            {...props}
            gisId={gisId}
        />
        <LinkFeatureModal ref={copyLinkModalRef} />
    </SelectionTreeItem>;
};