import { React } from "jimu-core";
import { EFeatureType, ELoadStatus } from "widgets/shared-code/enums";
import ParentFeatureContext from "../contexts/ParentFeatureContext";
import LoadingChildren from "./LoadingChildren";
import EmptyRelationClasses from "./EmptyRelationClasses";
import SelectionTreeItem from "./SelectionTreeItem";
import SelectionTreeItemContent from "./SelectionTreeItemContent";

const RelationshipItem = React.lazy(() => import("./RelationshipItem"));
const RelationshipTableItem = React.lazy(() => import("./RelationshipTableItem"));

/** - Komponenta vykreslujicí potomky prvku ve stromové struktuře. */
export default function (props: IFeatureChildrenRendererProps) {
    /** - Unikátní id zobrazení objektu. */
    const id = `${props.parentId}_${props.gisId}`;
    /** - Stav načtení relačních tříd pro tento {@link props.gisId prvek}. */
    const loadedRelationClass = props.loadedRelationClasses[props.gisId];

    if (!props.objectState?.expanded || !loadedRelationClass?.state) {
        return <></>;
    }

    function selectionItemWrapper(component: JSX.Element) {
        return <SelectionTreeItem>
            <SelectionTreeItemContent level={props.level + 1}>
                {component}
            </SelectionTreeItemContent>
        </SelectionTreeItem>;
    }

    if (loadedRelationClass.state === ELoadStatus.Pending) {
        return selectionItemWrapper(<LoadingChildren />);
    }
    
    if (!loadedRelationClass.result?.length) {
        return selectionItemWrapper(<EmptyRelationClasses />);
    }

    return <React.Suspense fallback={selectionItemWrapper(<LoadingChildren />)}>
        <ParentFeatureContext.Provider value={props.feature}>
            {
                loadedRelationClass.result.map(relationship => {
                    switch(relationship.featureType) {
                        case EFeatureType.Sublayer:
                            return <RelationshipItem
                                featureGisId={props.gisId}
                                key={relationship.id}
                                relationship={relationship}
                                level={props.level + 1}
                                objectState={props.objectState?.children[relationship.id]}
                                feature={props.feature}
                                onSelect={props.onSelect}
                                selectedId={props.selectedId}
                                parentId={id}
                                toggleExpand={props.toggleExpand}
                                loadRelationClasses={props.loadRelationClasses}
                                loadRelationObjects={props.loadRelationObjects}
                                loadedRelationClasses={props.loadedRelationClasses}
                                loadedRelationObjects={props.loadedRelationObjects}
                            />;
                        case EFeatureType.Table:
                            return <RelationshipTableItem
                                featureGisId={props.gisId}
                                key={relationship.id}
                                relationship={relationship}
                                level={props.level + 1}
                                objectState={props.objectState?.children[relationship.id]}
                                feature={props.feature}
                                onSelect={props.onSelect}
                                selectedId={props.selectedId}
                                parentId={id}
                                toggleExpand={props.toggleExpand}
                                loadRelationClasses={props.loadRelationClasses}
                                loadRelationObjects={props.loadRelationObjects}
                                loadedRelationClasses={props.loadedRelationClasses}
                                loadedRelationObjects={props.loadedRelationObjects}
                            />;
                        default:
                            console.warn(`Unhandled layer type '${relationship['layerType']}'`);
                            return <></>;
                    }
                })
            }
        </ParentFeatureContext.Provider>
    </React.Suspense>;
}

type IFeatureChildrenRendererProps  = (HSI.SelectionResultWidget.IFeatureItemProps | HSI.SelectionResultWidget.ITableFeatureItemProps) & {
    /** - GisId prvku jehož potomky vykreslujeme. */
    gisId: string;
}