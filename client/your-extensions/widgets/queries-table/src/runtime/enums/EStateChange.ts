export enum EStateChange {
    /** - Výběr třídy prvků. */
    selectClass,
    /** - Výběr dotazu v třídě prvků. */
    selectQuery,
    /** - Změna omezující podmínky dotazu. */
    changeSqlExpression
}

export default EStateChange;