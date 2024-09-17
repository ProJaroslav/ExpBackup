import { React, LoadingType } from "jimu-core";
import { Loading } from "jimu-ui";
import "./SelectableTable.scss";

function selectionReducer<T extends HSI.SelectableTable.ITableProps<C, R>["rows"][0]['id'], R extends HSI.SelectableTable.ITableRow<C>, C extends HSI.SelectableTable.ITableCell>(selectedIds: Array<T>, id: T): Array<T> {
    //#region - single
    return selectedIds.includes(id) ? [] : [id];
    //#endregion

    //#region - multiple
    ///const selectedIdsCopy = Array.isArray(selectedIds) ? [...selectedIds] : [];
    // const index = selectedIds.indexOf(id);

    // if (index === -1) {
    //     selectedIds.push(id);
    // } else {
    //     selectedIds.splice(index, 0);
    // }
    // return selectedIdsCopy;
    //#endregion

};

/** - Jednoduchá tabulka s vybíratelnými řádky. */
export default function<C extends HSI.SelectableTable.ITableCell, T extends HSI.SelectableTable.ITableRow<C>>(props: HSI.SelectableTable.ITableProps<C, T>) {
    const [selectedIds, toggleSelection] = React.useReducer(selectionReducer, []);

    const headerColor = props.colors?.headerColor || "var(--light)";
    const selectedRowColor = props.colors?.selectedRowColor || "var(--primary-300)";
    const oddRowColor = props.colors?.oddRowColor || "var(--light)";
    const evenRowColor = props.colors?.evenRowColor || "var(--primary-100)";
    const selectTrigger: HSI.SelectableTable.ITableProps<any, any>["selectTrigger"] = Array.isArray(props.selectTrigger) ? props.selectTrigger : ["left-click"];

    return <div className="hsi-selectable-table" style={props.style}>
        <div className="hsi-table-wrapper">
            <table>
                {
                    Array.isArray(props.header) ? 
                        <tr style={{ backgroundColor: headerColor }}>
                            {
                                props.header.map((column, index) => {
                                    return <th key={index}>{column}</th>;
                                })
                            }
                        </tr>
                    : <></>
                }

                {
                    props.rows.map((row, index) => {
                        let id = "id" in row ? row.id : index
                        let isSelected = selectedIds.includes(id);

                        let onRowSelect = (ev: React.MouseEvent<HTMLTableRowElement>) => {
                            if (props.selectionType !== "cell" && (!isSelected || !props.keepSelected)) {
                                toggleSelection(id);
                            }

                            if (props.onRowSelect) {
                                props.onRowSelect(ev, props.keepSelected || !isSelected ? row : null);
                            }
                            if (row.onSelect) {
                                row.onSelect(ev, props.keepSelected || (props.selectionType !== "cell" && !isSelected));
                            }
                        };

                        return <tr
                            style={{ backgroundColor: isSelected ? selectedRowColor : index % 2 === 0 ? oddRowColor : evenRowColor }}
                            key={id}
                            onClick={selectTrigger.includes("left-click") && onRowSelect}
                            onContextMenu={selectTrigger.includes("right-click") && onRowSelect}
                        >
                            {
                                row.cells.map((cell, cellIndex) => {
                                    let cellId = `${id}-${"id" in cell ? cell.id : cellIndex}`
                                    let isCellSelected = selectedIds.includes(cellId);

                                    let onCellSelect = (ev: React.MouseEvent<HTMLTableCellElement>) => {
                                        if (props.selectionType === "cell" && (!isCellSelected || !props.keepSelected)) {
                                            toggleSelection(cellId);
                                        }

                                        if (props.onCellSelect) {
                                            if (props.keepSelected || !isCellSelected) {
                                                props.onCellSelect(ev, cell, row);
                                            }
                                            props.onCellSelect(ev);
                                        }

                                        if (cell.onSelect) {
                                            cell.onSelect(ev, props.keepSelected || (props.selectionType === "cell" && !isCellSelected));
                                        }
                                    }

                                    return <td
                                        key={cellId}
                                        style={props.selectionType === "cell" && isCellSelected ? { backgroundColor: selectedRowColor } : null}
                                        onClick={selectTrigger.includes("left-click") && onCellSelect}
                                        onContextMenu={selectTrigger.includes("right-click") && onCellSelect}
                                    >
                                        {cell.content}
                                    </td>;
                                })
                            }
                        </tr>;
                    })
                }
            </table>
        </div>

        {
            props.loading ? <Loading type={LoadingType.Primary} className="hsi-selectable-table-loading" /> : <></>
        }
    </div>
}