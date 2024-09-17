import { React } from "jimu-core";
import { Icon } from "jimu-ui";
import ESelectedFeaturesType from "../enums/ESelectedFeaturesType";
import SelectionTreeItem from "./SelectionTreeItem";
import SelectionTreeItemContent from "./SelectionTreeItemContent";
import Expander from "./Expander";
import FeatureChildrenRenderer from "./FeatureChildrenRenderer";
import useFeatureContextMenu from '../hooks/useFeatureContextMenu';
import getFeatureContextMenuParams from '../helpers/getFeatureContextMenuParams';
import LoadErrorAlert from "./LoadErrorAlert";
import { useDisplayFeature } from "widgets/shared-code/hooks";
import { AssetsProviderContext } from "widgets/shared-code/contexts";
import { LinkFeatureModal } from "widgets/shared-code/components";
import { FeatureHelper } from "widgets/shared-code/helpers";

/** - Zobrazení negrafického prvku ve stromové struktuře výběrů. */
export default function(props: HSI.SelectionResultWidget.ITableFeatureItemProps) {
    const itemReference = React.useRef<HTMLDivElement>();
    const gisId = FeatureHelper.getTableFeatureGisId(props.feature);
    /** - Unikátní id zobrazení objektu. */
    const id = `${props.parentId}_${gisId}`;
    /** - Je prvek vybraný (zvírazněný) ve stromové struktuře? */
    const isSelected = props.selectedId === id;
    const assetsProvider = React.useContext(AssetsProviderContext);
    /** - Typ prvku. */
    const featureType = props.isRelation ? ESelectedFeaturesType.RelationTableFeature : ESelectedFeaturesType.TableFeature;
    /** - Reference dialogu pro zobrazení vygenerované URL. */
    const copyLinkModalRef = React.useRef<HSI.LinkFeatureModalComponent.ILinkFeatureModalMethods>();
    /** - Otevření kontextového menu. */
    const onContextMenu = useFeatureContextMenu(getFeatureContextMenuParams(props, { copyLinkModalRef, itemReference, selectFeature, isTable: true }));
    const displayFeature = useDisplayFeature({ displayField: props.displayField });

    /** - Označení prvku ve stromové struktuře. */
    function selectFeature() {
        props.onSelect({
            type: featureType,
            features: [props.feature],
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
            <Expander
                expanded={props.objectState?.expanded}
                toggleExpand={() => {
                    props.toggleExpand({ id, gisId, parentId: props.parentId });
                    props.loadRelationClasses(props.feature);
                }}
            />
            
            <Icon icon={assetsProvider("table.png")} />

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