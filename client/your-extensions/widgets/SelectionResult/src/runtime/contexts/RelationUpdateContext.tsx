import { React } from "jimu-core";

/** - Poskytnutí funkce, která aktualizuje hodnoty atributů v prvcích a znovunačte jejich relace. */
export const RelationUpdateContext = React.createContext<(relations: Array<IRelationUpdatePair>) => void>(() => {});

export interface IRelationUpdatePair {
    /** - Prvek u kterého chceme aktualizovat navazbené prvky. */
    feature: __esri.Graphic;
    /** - Identifikátor relační třídy. */
    relationshipClassId: string;
}

export default RelationUpdateContext;