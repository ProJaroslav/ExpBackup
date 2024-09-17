import { React } from "jimu-core"
import { Icon } from "jimu-ui"
import SelectionTreeItem from "./SelectionTreeItem";
import SelectionTreeItemContent from "./SelectionTreeItemContent";
import Expander from "./Expander";
import EmptyRelationClasses from "./EmptyRelationClasses";
import LoadingChildren from "./LoadingChildren";
import ChildrenLoadError from "./ChildrenLoadError";
import FeatureItem from "./FeatureItem";
import ESelectedFeaturesType from "../enums/ESelectedFeaturesType";
import useRelationClassContextMenu from "../hooks/useRelationClassContextMenu";
import getRelationLength from "../helpers/getRelationLength";
import { AssetsProviderContext } from "widgets/shared-code/contexts";
import { FeatureHelper } from "widgets/shared-code/helpers";
import { ELoadStatus } from "widgets/shared-code/enums";

/** - Zobrazení grafické relační třídy prvku ve stromové struktuře. */
export default function(props: IRelationshipItemProps) {
    const itemReference = React.useRef<HTMLDivElement>();
    /** - Funkce poskytujicí cestu k souboru uloženeho ve složce "assets". */
    const assetsProvider = React.useContext(AssetsProviderContext);
    const relations = props.loadedRelationObjects[`${props.featureGisId}_${props.relationship.id}`];
    const onContextMenu = useRelationClassContextMenu(relations, itemReference, false);

    const uniqueId = `${props.parentId}_${props.relationship.id}`;

    function renderChildren(): JSX.Element {
        if (!props.objectState?.expanded) {
            return <></>;
        }

        if (!relations?.state) {
            props.loadRelationObjects(props.feature, props.relationship.id);
            return <></>;
        }

        switch(relations.state) {
            case ELoadStatus.Error:
                return <SelectionTreeItem>
                    <SelectionTreeItemContent level={props.level + 1}>
                        <ChildrenLoadError/>
                    </SelectionTreeItemContent>
                </SelectionTreeItem>;

            case ELoadStatus.Pending:
                return <SelectionTreeItem>
                <SelectionTreeItemContent level={props.level + 1}>
                    <LoadingChildren />
                </SelectionTreeItemContent>
            </SelectionTreeItem>;

            case ELoadStatus.Loaded:
                if (!relations.result?.features?.length)
                    return <SelectionTreeItem>
                    <SelectionTreeItemContent level={props.level + 1}>
                        <EmptyRelationClasses />
                    </SelectionTreeItemContent>
                </SelectionTreeItem>;

                return <>
                    {
                        relations.result.features.map(feature => {
                            let gisId = FeatureHelper.getFeatureGisId(feature);
                            return <FeatureItem
                                isRelation
                                key={gisId}
                                feature={feature}
                                onSelect={props.onSelect}
                                selectedId={props.selectedId}
                                objectState={props.objectState.children[gisId]}
                                parentId={uniqueId}
                                level={props.level + 1}
                                geometryType={relations.result.geometryType}
                                displayField={relations.result.displayFieldName}
                                toggleExpand={props.toggleExpand}
                                loadRelationClasses={props.loadRelationClasses}
                                loadRelationObjects={props.loadRelationObjects}
                                loadedRelationClasses={props.loadedRelationClasses}
                                loadedRelationObjects={props.loadedRelationObjects}
                                relationshipClassId={props.relationship.id}
                            />;
                        })
                    }
                </>;


            default:
                console.warn(`Unhandled loading state "${relations.state}"`)
                return <></>;
        }
    }

    /** - Označení relační třídy ve stromové struktuře. */
    function selectRelation() {
        let relations = props.loadedRelationObjects[`${props.featureGisId}_${props.relationship.id}`];
        props.onSelect({
            type: ESelectedFeaturesType.RelationClass,
            features: relations?.result?.features || [],
            geometryType: relations?.result?.geometryType || "polyline",
            id: uniqueId
        });
    }

    return <SelectionTreeItem
        ref={itemReference}
        onContextMenu={onContextMenu}
    >
        <SelectionTreeItemContent
            level={props.level}
            onClick={selectRelation}
            isSelected={props.selectedId === uniqueId}
        >
            <Expander
                expanded={props.objectState?.expanded}
                toggleExpand={() => {
                    props.toggleExpand({ parentId: props.parentId, id: uniqueId, gisId: props.relationship.id });
                }}
            />

            <Icon icon={assetsProvider("relationship.png")} />
            
            <span className='selection-tree-item-title'>
                {props.relationship.label} {getRelationLength(relations)}
            </span>
        </SelectionTreeItemContent>
        {renderChildren()}
    </SelectionTreeItem>;
}

interface IRelationshipItemProps extends HSI.SelectionResultWidget.ITreeItemCommonProps {
    /** - Relační třída prvku. */
    relationship: HSI.SelectionResultWidget.IRelationship;
    /** - Prvek ke kterému se hladají vazby. */
    feature: __esri.Graphic;
    /** - Stav zobrazení relační třídy ve stromové struktuře. */
    objectState: HSI.SelectionResultWidget.ITreeState;
    /** - GisId prvku {@link feature}. */
    featureGisId: string;
};